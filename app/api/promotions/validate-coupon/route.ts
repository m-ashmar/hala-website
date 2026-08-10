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

export const dynamic = 'force-dynamic';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getPromotionByCouponCode, getProductCategoriesByIds } from '@/sanity/lib/queries';
import { computeDiscount, eligibleItemsFor } from '@/lib/coupon-scope';
import { createRateLimiter } from '@/lib/rate-limit';
import { validateCsrfOrigin, getClientIp } from '@/lib/security';

// 20 coupon validation attempts per IP per minute
const couponLimiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

// ── Zod schema ────────────────────────────────────────────────────────────────

const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').max(50),
  items: z
    .array(
      z.object({
        sanityId: z.string().min(1),
        price: z.number().min(0),
        quantity: z.number().int().min(1),
        category: z.string().optional(),
      })
    )
    .min(1, 'Cart items are required'),
});

export interface ValidateCouponItem {
  sanityId: string;
  price: number;
  quantity: number;
  /** Optional — sent by client but we re-verify server-side */
  category?: string;
}

export async function POST(req: NextRequest) {
  try {
    // 1. CSRF origin check
    const csrfError = validateCsrfOrigin(req);
    if (csrfError) return csrfError;

    // 2. Rate limit by IP
    const ip = getClientIp(req);
    const rateLimitError = await couponLimiter.check(`coupon_${ip}`);
    if (rateLimitError) return rateLimitError;

    // 3. Validate body
    const body = await req.json();
    const parsed = validateCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { code, items } = parsed.data;

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
      getProductCategoriesByIds(sanityIds),
    ]);

    const linkedSanityIds = new Set<string>(
      promotion?.linkedProducts?.map((p) => p.sanityId) ?? []
    );
    const linkedCategories = new Set<string>(
      (promotion?.linkedCategories ?? []).map((c) => c.toLowerCase())
    );

    // ── 3. Compute subtotals ────────────────────────────────────────────────
    const fullSubtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    // Resolve each item's category: prefer server-fetched, fall back to client-sent
    const enrichedItems = items.map((i) => ({
      ...i,
      resolvedCategory: (categoryMap[i.sanityId] ?? i.category ?? '').toLowerCase(),
    }));

    // Scope + discount come from lib/coupon-scope, shared verbatim with the
    // checkout route. These two had drifted: checkout applied the discount to
    // the whole cart and skipped minOrderAmount entirely, so a scoped coupon
    // over-discounted mixed carts. One implementation now serves both.
    const scope = { linkedSanityIds, linkedCategories };
    const scopedItems = enrichedItems.map((i) => ({
      sanityId: i.sanityId,
      price: i.price,
      quantity: i.quantity,
      category: i.resolvedCategory,
    }));

    const outcome = computeDiscount(
      scopedItems,
      {
        discountType: coupon.discountType as 'PERCENTAGE' | 'FIXED',
        discountValue: Number(coupon.discountValue),
        minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : null,
      },
      scope
    );

    const currency = process.env.NEXT_PUBLIC_CURRENCY ?? 'SYP';

    if (!outcome.ok) {
      if (outcome.reason === 'BELOW_MINIMUM') {
        return NextResponse.json({
          valid: false,
          error: `Minimum eligible order amount for this coupon is ${outcome.minOrderAmount.toLocaleString()} ${currency}.`,
        }, { status: 400 });
      }
      return NextResponse.json({
        valid: false,
        error: 'This coupon does not apply to any item in your cart.',
      }, { status: 400 });
    }

    const { eligibleAmount, discountAmount } = outcome;
    const eligibleSanityIds = eligibleItemsFor(scopedItems, scope).map((i) => i.sanityId);
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
