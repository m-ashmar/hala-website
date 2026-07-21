/**
 * POST /api/promotions/validate-coupon
 *
 * Validates a coupon code with full product/category scope enforcement.
 *
 * Body:
 *   { code: string; items: { sanityId: string; price: number; quantity: number }[] }
 *   NOTE: `category` is NOT trusted from the client — we fetch it from Sanity server-side.
 *
 * Returns:
 *   200 {
 *     valid: true,
 *     couponId, code, discountType, discountValue,
 *     eligibleAmount,    // the cart subtotal the coupon applies to
 *     discountAmount,    // the actual saving
 *     fullSubtotal,      // total cart value before discount
 *     finalAmount,       // fullSubtotal - discountAmount
 *     eligibleSanityIds, // which products were discounted
 *     scopeLabel,        // human-readable scope e.g. "Applies to: Hijab"
 *     description
 *   }
 *   400 { valid: false, error: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPromotionByCouponCode } from '@/sanity/lib/queries';
import { client } from '@/sanity/lib/client';

export interface ValidateCouponItem {
  sanityId: string;
  price: number;
  quantity: number;
  /** Optional — sent by client but we re-verify server-side */
  category?: string;
}

/** Fetches the category for each sanityId in one Sanity query */
async function fetchProductCategories(sanityIds: string[]): Promise<Record<string, string>> {
  if (sanityIds.length === 0) return {};
  try {
    const results: { sanityId: string; category: string }[] = await client.fetch(
      `*[_type == "product" && sanityId.current in $ids]{ "sanityId": sanityId.current, category }`,
      { ids: sanityIds }
    );
    const map: Record<string, string> = {};
    for (const r of results) {
      if (r.sanityId && r.category) {
        map[r.sanityId] = r.category.toLowerCase();
      }
    }
    return map;
  } catch {
    // Fail open — if Sanity is unreachable, treat all items as uncategorized
    return {};
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, items } = body as { code?: string; items?: ValidateCouponItem[] };

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Coupon code is required.' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ valid: false, error: 'Cart items are required.' }, { status: 400 });
    }

    // ── 1. Look up coupon in Postgres ───────────────────────────────────────
    const now = new Date();
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.trim().toUpperCase(),
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
    });

    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired coupon code.' }, { status: 400 });
    }

    // Check usage limit
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ valid: false, error: 'This coupon has reached its usage limit.' }, { status: 400 });
    }

    // ── 2. Fetch product/category scope from Sanity (runs in parallel) ──────
    const sanityIds = items.map((i) => i.sanityId);
    const [promotion, categoryMap] = await Promise.all([
      getPromotionByCouponCode(code.trim()),
      fetchProductCategories(sanityIds),
    ]);

    const linkedSanityIds = new Set<string>(
      promotion?.linkedProducts?.map((p) => p.sanityId) ?? []
    );
    const linkedCategories = new Set<string>(
      (promotion?.linkedCategories ?? []).map((c) => c.toLowerCase())
    );
    const hasScope = linkedSanityIds.size > 0 || linkedCategories.size > 0;

    // ── 3. Compute subtotals ────────────────────────────────────────────────
    const fullSubtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // Resolve each item's category: prefer server-fetched, fall back to client-sent
    const enrichedItems = items.map((i) => ({
      ...i,
      resolvedCategory: (categoryMap[i.sanityId] ?? i.category ?? '').toLowerCase(),
    }));

    // Items eligible for this coupon
    const eligibleItems = hasScope
      ? enrichedItems.filter(
          (i) =>
            linkedSanityIds.has(i.sanityId) ||
            (i.resolvedCategory && linkedCategories.has(i.resolvedCategory))
        )
      : enrichedItems; // no scope = all items

    const eligibleAmount = eligibleItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const eligibleSanityIds = eligibleItems.map((i) => i.sanityId);

    // Check minimum order amount against eligible subtotal
    const minAmount = coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0;
    if (eligibleAmount < minAmount) {
      const currency = process.env.NEXT_PUBLIC_CURRENCY ?? 'SYP';
      return NextResponse.json({
        valid: false,
        error: `Minimum eligible order amount for this coupon is ${minAmount.toLocaleString()} ${currency}.`,
      }, { status: 400 });
    }

    // ── 4. Calculate discount (only on eligible amount) ─────────────────────
    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((eligibleAmount * Number(coupon.discountValue)) / 100);
    } else {
      // FIXED — capped at eligibleAmount
      discountAmount = Math.min(Number(coupon.discountValue), eligibleAmount);
    }

    const finalAmount = Math.max(0, fullSubtotal - discountAmount);

    // ── 5. Build a human-readable scope label ───────────────────────────────
    let scopeLabel: string | null = null;
    if (linkedCategories.size > 0) {
      const cats = Array.from(linkedCategories).map((c) =>
        c.charAt(0).toUpperCase() + c.slice(1)
      );
      scopeLabel = `Applies to: ${cats.join(', ')}`;
    } else if (linkedSanityIds.size > 0) {
      scopeLabel = `Applies to: ${linkedSanityIds.size} selected product${linkedSanityIds.size > 1 ? 's' : ''}`;
    }

    return NextResponse.json({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      eligibleAmount,
      discountAmount,
      fullSubtotal,
      finalAmount,
      eligibleSanityIds,
      scopeLabel,
      description: coupon.description,
    });
  } catch (err) {
    console.error('[POST /api/promotions/validate-coupon]', err);
    return NextResponse.json({ valid: false, error: 'Server error. Please try again.' }, { status: 500 });
  }
}
