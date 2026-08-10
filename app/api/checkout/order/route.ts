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
 *  - Reference code is CSPRNG-derived (crypto.randomBytes, ~8.2e14 keyspace)
 *    and checked for uniqueness. It is a bearer token for guest order
 *    lookup, so it must not be guessable.
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
  generateUniqueReferenceCode,
  updateOrderStripeSession,
  getOrderWithItemsById,
  type ValidatedOrderItem,
} from '@/lib/repositories/order.repository';
import { syncOrderToSanity } from '@/lib/services/sanity-sync.service';
import { createCheckoutDraft, markDraftStripeSession } from '@/lib/repositories/checkout-draft.repository';
import { createRateLimiter } from '@/lib/rate-limit';
import { validateCsrfOrigin, getClientIp } from '@/lib/security';
import { getCurrencySettings, getPromotionByCouponCode, getProductCategoriesByIds } from '@/sanity/lib/queries';
import { sypToUsdCents, STRIPE_MIN_USD_CENTS } from '@/lib/currency';
import { reportError } from '@/lib/monitoring';
import { computeDiscount } from '@/lib/coupon-scope';

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
  // Required: these are physical goods and cannot be fulfilled without it.
  shippingAddress: z.object({
    fullName: z.string().min(2, 'Recipient name is required').max(100),
    phone: z.string().min(6, 'A contact phone is required').max(30),
    addressLine1: z.string().min(3, 'Street address is required').max(200),
    addressLine2: z.string().max(200).optional(),
    city: z.string().min(2, 'City is required').max(100),
    country: z.string().min(2).max(100).default('Syria'),
    /** Optional id of a saved address, for account convenience only. */
    savedAddressId: z.string().optional(),
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
    const rateLimitError = await checkoutLimiter.check(`checkout_${ip}`);
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

    const { items: cartItems, customer, paymentMethod, shippingAddress } = parsed.data;

    // Flattened snapshot reused by both payment paths. Stored on the order
    // itself rather than only referenced, so a later edit or deletion of the
    // customer's saved address can never change where an order was shipped.
    const shippingSnapshot = {
      shippingAddressId: shippingAddress.savedAddressId ?? null,
      shippingFullName: shippingAddress.fullName,
      shippingPhone: shippingAddress.phone,
      shippingAddressLine1: shippingAddress.addressLine1,
      shippingAddressLine2: shippingAddress.addressLine2 ?? null,
      shippingCity: shippingAddress.city,
      shippingCountry: shippingAddress.country,
    };

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
        // Resolve the promotion's scope and each item's category server-side.
        //
        // This previously applied the discount to the FULL cart subtotal and
        // ignored minOrderAmount, trusting that the cart had already
        // scope-validated the coupon. It hadn't — the client is not a
        // trustworthy place to enforce a discount. A category-scoped promotion
        // ("20% off Hijabs") therefore discounted plexi items too, on any
        // mixed cart, with no attacker involved.
        const promotion = await getPromotionByCouponCode(coupon.code).catch(() => null);
        const scope = {
          linkedSanityIds: new Set(promotion?.linkedProducts?.map((p) => p.sanityId) ?? []),
          linkedCategories: new Set(
            (promotion?.linkedCategories ?? []).map((c) => c.toLowerCase())
          ),
        };

        // Categories are only needed when the promotion is category-scoped.
        let categoryMap: Record<string, string> = {};
        if (scope.linkedCategories.size > 0) {
          categoryMap = await getProductCategoriesByIds(
            validatedItems.map((i) => i.sanityId)
          );
        }

        const outcome = computeDiscount(
          validatedItems.map((i) => ({
            sanityId: i.sanityId,
            price: i.priceAtPurchase, // DB price, never the client's
            quantity: i.quantity,
            category: categoryMap[i.sanityId],
          })),
          {
            discountType: coupon.discountType as 'PERCENTAGE' | 'FIXED',
            discountValue: Number(coupon.discountValue),
            minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : null,
          },
          scope
        );

        if (outcome.ok) {
          discountAmount = outcome.discountAmount;
        } else {
          // The cart no longer qualifies (items changed since validation, or a
          // category-scoped coupon matched nothing). Proceed at full price
          // rather than silently over-discounting.
          couponId = undefined;
          discountAmount = 0;
        }
      } else {
        // Coupon invalid/expired at order time — ignore it silently
        couponId = undefined;
        discountAmount = 0;
      }
    }

    const totalAmount = Math.max(0, rawSubtotal - discountAmount);

    const referenceCode = await generateUniqueReferenceCode();
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

      // ── Currency conversion ────────────────────────────────────────────
      // Products are priced in SYP; Stripe settles in USD. The rate is set by
      // an admin in Sanity and converted here, server-side only. Previously
      // this charged the raw SYP figure as USD — a 50,000 SYP item became a
      // $50,000 charge.
      const stripeCurrency = 'usd';
      let sypPerUsd: number;
      try {
        const currencySettings = await getCurrencySettings();
        const rate = currencySettings?.sypPerUsd;
        // Throws if unset/invalid — refusing the checkout is far safer than
        // guessing a rate and charging the wrong amount.
        sypToUsdCents(1, rate as number);
        sypPerUsd = rate as number;
      } catch (rateErr) {
        console.error('[checkout] Exchange rate unavailable:', rateErr);
        return NextResponse.json(
          {
            error:
              'Card payment is temporarily unavailable. Please try the other payment method or contact us.',
          },
          { status: 503 }
        );
      }

      const stripeLineItems = validatedItems.map((item) => ({
        price_data: {
          currency: stripeCurrency,
          product_data: {
            name: item.snapshotTitle ?? item.sanityId,
          },
          // Convert the whole line, then divide, so quantity never compounds
          // a sub-cent rounding error.
          unit_amount: Math.round(
            sypToUsdCents(item.priceAtPurchase * item.quantity, sypPerUsd) / item.quantity
          ),
        },
        quantity: item.quantity,
      }));

      const chargedAmountCents = sypToUsdCents(totalAmount, sypPerUsd);
      if (chargedAmountCents < STRIPE_MIN_USD_CENTS) {
        return NextResponse.json(
          {
            error: `Order total is below the minimum this payment method accepts (${
              STRIPE_MIN_USD_CENTS / 100
            } USD). Please add more items or use the other payment method.`,
          },
          { status: 422 }
        );
      }

      // Save draft BEFORE going to Stripe, snapshotting the rate actually used.
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
        chargedAmount: chargedAmountCents / 100,
        chargedCurrency: stripeCurrency.toUpperCase(),
        exchangeRate: sypPerUsd,
        ...shippingSnapshot,
      });

      let stripeDiscounts: { coupon: string }[] | undefined;
      if (discountAmount > 0) {
        const discountInCents = sypToUsdCents(discountAmount, sypPerUsd);
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
      shipping: shippingSnapshot,
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
    // A failed checkout is lost revenue and an invisible one is worse.
    reportError(err, { scope: 'checkout.createOrder' });
    return NextResponse.json(
      { error: 'Failed to create order. Please try again.' },
      { status: 500 }
    );
  }
}
