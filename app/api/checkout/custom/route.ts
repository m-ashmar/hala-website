import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';
import { auth } from '@/auth';
import { randomUUID } from 'crypto';
import { createPendingOrder, generateUniqueReferenceCode, getOrderWithItemsById } from '@/lib/repositories/order.repository';
import { getCurrencySettings } from '@/sanity/lib/queries';
import { sypToUsdCents, STRIPE_MIN_USD_CENTS } from '@/lib/currency';
import { syncOrderToSanity, syncCustomRequestToSanity } from '@/lib/services/sanity-sync.service';
import { validateCsrfOrigin } from '@/lib/security';

export const dynamic = 'force-dynamic';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-06-24.dahlia' as any,
  });
}

const customCheckoutSchema = z.object({
  customRequestId: z.string().min(1),
  paymentMethod: z.enum(['shamcash', 'stripe']),
});

export async function POST(req: NextRequest) {
  // CSRF origin check — applied to every state-changing route.
  const csrfError = validateCsrfOrigin(req);
  if (csrfError) return csrfError;

  try {
    const body = await req.json();
    const parsed = customCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { customRequestId, paymentMethod } = parsed.data;

    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customRequest = await prisma.customRequest.findUnique({
      where: { id: customRequestId, userId },
    });

    if (!customRequest) {
      return NextResponse.json({ error: 'Custom request not found' }, { status: 404 });
    }

    if (customRequest.status !== 'QUOTED' || !customRequest.quotePrice) {
      return NextResponse.json(
        { error: 'This custom request is not ready for payment' },
        { status: 400 }
      );
    }

    if (customRequest.orderId) {
      return NextResponse.json(
        { error: 'This custom request has already been processed' },
        { status: 400 }
      );
    }

    const totalAmount = customRequest.quotePrice;
    const currency = customRequest.currency || 'SYP';
    const referenceCode = await generateUniqueReferenceCode();
    const timeoutMinutes = parseInt(process.env.SHAMCASH_POLL_TIMEOUT_MINUTES ?? '60', 10);
    const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

    if (paymentMethod === 'stripe') {
      if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_...')) {
        return NextResponse.json({ error: 'Stripe is not fully configured.' }, { status: 500 });
      }

      // Convert the SYP quote to USD using the admin-set rate.
      //
      // This path had the same defect the main checkout did: it passed the
      // raw SYP figure to Stripe as USD, so a 500,000 SYP quote would have
      // been charged as $500,000. Fixing only the main checkout left this
      // one live — custom orders are the highest-value line in the business.
      const stripeCurrency = 'usd';
      let sypPerUsd: number;
      try {
        const currencySettings = await getCurrencySettings();
        const rate = currencySettings?.sypPerUsd;
        sypToUsdCents(1, rate as number); // throws if unset/invalid
        sypPerUsd = rate as number;
      } catch (rateErr) {
        console.error('[checkout/custom] Exchange rate unavailable:', rateErr);
        return NextResponse.json(
          {
            error:
              'Card payment is temporarily unavailable. Please try the other payment method or contact us.',
          },
          { status: 503 }
        );
      }

      const chargedAmountCents = sypToUsdCents(totalAmount, sypPerUsd);
      if (chargedAmountCents < STRIPE_MIN_USD_CENTS) {
        return NextResponse.json(
          {
            error: `This quote is below the minimum this payment method accepts (${
              STRIPE_MIN_USD_CENTS / 100
            } USD). Please use the other payment method.`,
          },
          { status: 422 }
        );
      }

      const stripeSession = await getStripe().checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: stripeCurrency,
              product_data: {
                name: customRequest.title,
                description: 'Custom Order Request',
              },
              unit_amount: chargedAmountCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/en/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/en/dashboard/custom-orders`,
        customer_email: customRequest.email,
        metadata: {
          type: 'custom_request',
          customRequestId: customRequest.id,
          userId,
          // Carry the conversion through to fulfilment. The order is created
          // later, in the webhook, which has no other way to know what the
          // customer was actually charged — without this the order records
          // only the SYP quote and the USD capture is unreconcilable.
          chargedAmount: String(chargedAmountCents / 100),
          chargedCurrency: stripeCurrency.toUpperCase(),
          exchangeRate: String(sypPerUsd),
        },
      });

      return NextResponse.json({ paymentMethod: 'stripe', url: stripeSession.url }, { status: 201 });
    }

    // ShamCash Flow
    // Ensure dummy product sync exists for foreign key constraint
    await prisma.productSync.upsert({
      where: { sanityId: 'custom-request' },
      update: {},
      create: {
        id: 'custom-request-item',
        sanityId: 'custom-request',
        price: 0,
        stock: 999999,
        isActive: true,
      }
    });

    // Create an Order to represent the custom request
    const order = await createPendingOrder({
      customer: {
        name: customRequest.name,
        email: customRequest.email,
      },
      items: [
        {
          productSyncId: 'custom-request-item', // Uses the dummy product created above
          sanityId: 'custom-request',
          quantity: 1,
          priceAtPurchase: totalAmount,
          snapshotTitle: customRequest.title,
          customization: { customRequestId: customRequest.id },
        } as any,
      ],
      totalAmount,
      referenceCode,
      currency,
      expiresAt,
      userId,
    });

    // Link Order to CustomRequest
    await prisma.customRequest.update({
      where: { id: customRequest.id },
      data: { orderId: order.id },
    });

    // Fire-and-forget sync
    void getOrderWithItemsById(order.id).then((full) => {
      if (full) syncOrderToSanity(full);
    });

    return NextResponse.json(
      {
        orderId: order.id,
        paymentMethod: 'shamcash',
        referenceCode,
        totalAmount,
        currency,
        expiresAt: expiresAt.toISOString(),
        paymentDisplayNumber: process.env.NEXT_PUBLIC_SHAMCASH_DISPLAY_NUMBER ?? '',
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/checkout/custom]', err);
    return NextResponse.json({ error: 'Failed to process payment for custom request.' }, { status: 500 });
  }
}
