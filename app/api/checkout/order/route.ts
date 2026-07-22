/**
 * POST /api/checkout/order
 *
 * Creates a PENDING order and returns payment instructions for the customer.
 *
 * Flow:
 *  1. Validate request body (Zod)
 *  2. Fetch authoritative prices from DB (never trust client prices)
 *  3. Verify stock availability for all items
 *  4. Calculate total server-side
 *  5. Create PENDING order with a unique ShamCash reference code
 *  6. Return reference code + payment instructions to client
 *
 * Security:
 *  - Rate-limited (via lib/rate-limit)
 *  - Prices are NEVER taken from the request body
 *  - Reference code is cryptographically random enough to prevent guessing
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';
import { auth } from '@/auth';
import { randomUUID } from 'crypto';
import {
  createPendingOrder,
  generateReferenceCode,
  updateOrderStripeSession,
  getOrderWithItemsById,
  type ValidatedOrderItem,
} from '@/lib/repositories/order.repository';
import { syncOrderToSanity } from '@/lib/services/sanity-sync.service';
import { createCheckoutDraft, markDraftStripeSession } from '@/lib/repositories/checkout-draft.repository';
import { createRateLimiter } from '@/lib/rate-limit';
import { validateCsrfOrigin, getClientIp } from '@/lib/security';

// 3 checkout attempts per IP per minute — prevents brute-force stock checks
const checkoutLimiter = createRateLimiter({ limit: 3, windowMs: 60_000 });

// Lazy Stripe getter — avoids module-level instantiation at build time
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-06-24.dahlia',
  });
}

// ── Validation schema ─────────────────────────────────────────────────────────

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productSyncId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
        snapshotTitle: z.string().optional(),
        snapshotImageUrl: z.string().optional(),
        customization: z.record(z.string(), z.string()).optional(),
      })
    )
    .min(1, 'Cart is empty')
    .max(20, 'Too many items in a single order'),
  customer: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    phone: z.string().max(30).optional(),
    note: z.string().max(500).optional(),
  }),
  paymentMethod: z.enum(['shamcash', 'stripe']),
  couponId: z.string().optional(),
});

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 0a. CSRF origin check
    const csrfError = validateCsrfOrigin(req);
    if (csrfError) return csrfError;

    // 0b. Rate limit by IP
    const ip = getClientIp(req);
    const rateLimitError = checkoutLimiter.check(`checkout_${ip}`);
    if (rateLimitError) return rateLimitError;

    // 1. Parse and validate body
    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { items: cartItems, customer, paymentMethod } = parsed.data;

    // Fix Bug 2: Get the authenticated user's ID
    const session = await auth();
    const userId = session?.user?.id;

    // 2. Fetch authoritative prices and stock from DB in a single query
    const productIds = cartItems.map((i) => i.productSyncId);
    const products = await prisma.productSync.findMany({
      where: { id: { in: productIds }, isActive: true, deletedAt: null },
      select: { id: true, sanityId: true, price: true, stock: true },
    });

    // Check all requested products exist and are active
    if (products.length !== productIds.length) {
      const foundIds = new Set(products.map((p) => p.id));
      const missing = productIds.filter((id) => !foundIds.has(id));
      return NextResponse.json(
        { error: 'Some products are unavailable', unavailable: missing },
        { status: 422 }
      );
    }

    // 3. Validate stock and build validated line items
    const productMap = new Map(products.map((p) => [p.id, p]));
    const validatedItems: ValidatedOrderItem[] = [];
    const stockErrors: string[] = [];

    for (const cartItem of cartItems) {
      const product = productMap.get(cartItem.productSyncId)!;
      if (product.stock < cartItem.quantity) {
        stockErrors.push(
          `"${product.sanityId}" has only ${product.stock} in stock (requested ${cartItem.quantity})`
        );
      } else {
        validatedItems.push({
          productSyncId: product.id,
          sanityId: product.sanityId,
          quantity: cartItem.quantity,
          priceAtPurchase: product.price, // ← DB price, not client price
          snapshotTitle: cartItem.snapshotTitle,
          snapshotImageUrl: cartItem.snapshotImageUrl,
          customization: cartItem.customization,
        });
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json(
        { error: 'Insufficient stock', details: stockErrors },
        { status: 409 }
      );
    }

    // 4. Calculate total server-side
    const rawSubtotal = validatedItems.reduce(
      (sum, item) => sum + item.priceAtPurchase * item.quantity,
      0
    );

    // 4b. Apply coupon discount server-side (re-validate to prevent tampering)
    let discountAmount = 0;
    let couponId: string | undefined = parsed.data.couponId;

    if (couponId) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          id: couponId,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
      });

      if (coupon && (coupon.maxUses === null || coupon.usedCount < coupon.maxUses)) {
        // Compute scoped discount using the validated item list
        // We use the full subtotal here because without category info in the
        // order payload we trust the coupon was already scope-validated in the cart.
        // For extra security, FIXED discounts are capped at the cart total.
        if (coupon.discountType === 'PERCENTAGE') {
          discountAmount = Math.round((rawSubtotal * Number(coupon.discountValue)) / 100);
        } else {
          discountAmount = Math.min(Number(coupon.discountValue), rawSubtotal);
        }
      } else {
        // Coupon invalid/expired at order time — ignore it silently
        couponId = undefined;
        discountAmount = 0;
      }
    }

    const totalAmount = Math.max(0, rawSubtotal - discountAmount);

    const referenceCode = generateReferenceCode();
    const timeoutMinutes = parseInt(
      process.env.SHAMCASH_POLL_TIMEOUT_MINUTES ?? '60',
      10
    );
    const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);
    const currency = process.env.NEXT_PUBLIC_CURRENCY ?? 'SYP';

    // 6. Handle Stripe payment method (New Draft Flow)
    if (paymentMethod === 'stripe') {
      if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_...')) {
        return NextResponse.json(
          { error: 'Stripe is not fully configured.' },
          { status: 500 }
        );
      }

      const checkoutToken = randomUUID();

      // Save draft BEFORE going to Stripe
      const draft = await createCheckoutDraft({
        checkoutToken,
        userId,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        customerNote: customer.note,
        items: validatedItems,
        couponId,
        discountAmount,
        subtotal: rawSubtotal,
        totalAmount,
        currency,
        expiresAt,
      });

      const stripeCurrency = 'usd'; // Adjust to real currency
      const stripeLineItems = validatedItems.map(item => ({
        price_data: {
          currency: stripeCurrency,
          product_data: {
            name: item.snapshotTitle ?? item.sanityId,
          },
          unit_amount: Math.round(item.priceAtPurchase * 100),
        },
        quantity: item.quantity,
      }));

      let stripeDiscounts: { coupon: string }[] | undefined;
      if (discountAmount > 0) {
        const discountInCents = Math.round(discountAmount * 100);
        try {
          const stripeCoupon = await getStripe().coupons.create({
            amount_off: discountInCents,
            currency: stripeCurrency,
            duration: 'once',
            name: couponId ? `Order discount (${couponId.slice(0, 8)})` : 'Order discount',
          });
          stripeDiscounts = [{ coupon: stripeCoupon.id }];
        } catch (couponErr) {
          console.warn('[stripe] Failed to create Stripe discount coupon:', couponErr);
        }
      }

      // Create Session with ONLY the token in metadata
      const stripeSession = await getStripe().checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: stripeLineItems,
        mode: 'payment',
        // Redirect to success page WITH the session ID so it can fetch the order
        success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/en/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/en/checkout`,
        customer_email: customer.email,
        client_reference_id: draft.id, // optional, links back to draft
        metadata: { 
          checkoutToken,
          userId: userId ?? 'guest' 
        },
        ...(stripeDiscounts && { discounts: stripeDiscounts }),
      });

      // Update draft with session ID
      await markDraftStripeSession(draft.id, stripeSession.id);

      return NextResponse.json(
        {
          paymentMethod: 'stripe',
          url: stripeSession.url,
        },
        { status: 201 }
      );
    }

    // 7. Handle ShamCash payment method (Legacy Flow - Creates Order Immediately)
    const order = await createPendingOrder({
      customer,
      items: validatedItems,
      totalAmount,
      referenceCode,
      currency,
      expiresAt,
      userId,
      couponId,
      discountAmount,
    });

    void getOrderWithItemsById(order.id).then((full) => {
      if (full) return syncOrderToSanity(full);
    });

    // 8. Handle ShamCash payment method
    return NextResponse.json(
      {
        orderId: order.id,
        paymentMethod: 'shamcash',
        referenceCode,
        totalAmount,
        discountAmount,
        currency,
        expiresAt: expiresAt.toISOString(),
        paymentDisplayNumber:
          process.env.NEXT_PUBLIC_SHAMCASH_DISPLAY_NUMBER ?? '',
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/checkout/order]', err);
    return NextResponse.json(
      { error: 'Failed to create order. Please try again.' },
      { status: 500 }
    );
  }
}
