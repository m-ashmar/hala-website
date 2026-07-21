import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import {
  confirmOrderPayment,
  markOrderFailed,
  markOrderRefunded,
  getOrderWithItemsById,
} from '@/lib/repositories/order.repository';
import { syncOrderToSanity, syncCustomRequestToSanity } from '@/lib/services/sanity-sync.service';
import { fulfillStripeCheckout } from '@/lib/services/checkout.service';
import { markDraftExpired } from '@/lib/repositories/checkout-draft.repository';
import { updateCustomRequestFromSanity } from '@/lib/repositories/custom-request.repository';
import { headers } from 'next/headers';
import { logger } from '@/lib/logger';
import { createPendingOrder, generateReferenceCode } from '@/lib/repositories/order.repository';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-06-24.dahlia',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

/** Fire-and-forget: fetch full order from Postgres then sync to Sanity. */
function queueOrderSync(orderId: string): void {
  void getOrderWithItemsById(orderId).then((full) => {
    if (full) return syncOrderToSanity(full);
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!signature || !endpointSecret) {
      throw new Error('Missing stripe-signature or STRIPE_WEBHOOK_SECRET');
    }
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ message }, '[Stripe Webhook] Signature verification failed');
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const checkoutToken = session.metadata?.checkoutToken; // New flow
      const legacyOrderId = session.metadata?.orderId;       // Legacy flow
      const paymentIntentId = session.payment_intent as string | undefined;

      try {
        const type = session.metadata?.type;
        const customRequestId = session.metadata?.customRequestId;

        if (type === 'custom_request' && customRequestId) {
          logger.info({ customRequestId }, '[Stripe Webhook] Fulfilling custom request payment');
          
          const customRequest = await prisma.customRequest.findUnique({
            where: { id: customRequestId },
          });

          if (customRequest) {
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

            // Create an order for the custom request
            const order = await createPendingOrder({
              customer: {
                name: customRequest.name,
                email: customRequest.email,
              },
              items: [
                {
                  productSyncId: 'custom-request-item',
                  sanityId: 'custom-request',
                  quantity: 1,
                  priceAtPurchase: customRequest.quotePrice || 0,
                  snapshotTitle: customRequest.title,
                  customization: { customRequestId: customRequest.id },
                } as any,
              ],
              totalAmount: customRequest.quotePrice || 0,
              referenceCode: generateReferenceCode(),
              currency: customRequest.currency || 'SYP',
              expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
              userId: customRequest.userId ?? undefined,
            });

            // Mark order as paid
            await confirmOrderPayment(order.id, paymentIntentId || undefined);
            
            // Mark custom request as PAID and link order
            const updatedCr = await prisma.customRequest.update({
              where: { id: customRequestId },
              data: { status: 'PAID', orderId: order.id },
            });

            // Sync both to Sanity
            queueOrderSync(order.id);
            syncCustomRequestToSanity({
              id: updatedCr.id,
              name: updatedCr.name,
              email: updatedCr.email,
              title: updatedCr.title,
              details: updatedCr.details,
              imageUrls: updatedCr.imageUrls,
              requestedQuantity: updatedCr.requestedQuantity,
              status: updatedCr.status,
              quotePrice: updatedCr.quotePrice,
              currency: updatedCr.currency,
              estimatedDays: updatedCr.estimatedDays,
              adminNotes: updatedCr.adminNotes,
            });
          }
          return NextResponse.json({ received: true }, { status: 200 });
        }

        if (checkoutToken) {
          logger.info({ sessionId: session.id }, '[Stripe Webhook] Fulfilling checkout draft');
          await fulfillStripeCheckout(session.id, paymentIntentId || null);
          return NextResponse.json({ received: true }, { status: 200 });
        }
        
        if (legacyOrderId) {
          logger.info({ orderId: legacyOrderId }, '[Stripe Webhook] Confirming legacy payment');
          await confirmOrderPayment(legacyOrderId, paymentIntentId);
          queueOrderSync(legacyOrderId);
          return NextResponse.json({ received: true }, { status: 200 });
        }

        logger.warn('[Stripe Webhook] checkout.session.completed missing checkoutToken or orderId in metadata');
      } catch (err) {
        logger.error({ err, sessionId: session.id }, '[Stripe Webhook] Failed to confirm order');
        return NextResponse.json({ error: 'Failed to confirm order in DB' }, { status: 500 });
      }
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      const checkoutToken = session.metadata?.checkoutToken;
      const legacyOrderId = session.metadata?.orderId;

      if (checkoutToken && session.client_reference_id) {
        logger.info({ draftId: session.client_reference_id }, '[Stripe Webhook] Session expired — marking draft expired');
        await markDraftExpired(session.client_reference_id);
      } else if (legacyOrderId) {
        logger.info({ orderId: legacyOrderId }, '[Stripe Webhook] Session expired — marking failed');
        await markOrderFailed(legacyOrderId);
        queueOrderSync(legacyOrderId);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.orderId;
      if (orderId) {
        logger.info({ orderId }, '[Stripe Webhook] Payment failed');
        await markOrderFailed(orderId);
        queueOrderSync(orderId);
      }
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      let orderId =
        charge.metadata?.orderId ||
        (charge.payment_intent &&
          typeof charge.payment_intent === 'object'
          ? (charge.payment_intent as Stripe.PaymentIntent).metadata?.orderId
          : null);
      
      // Fallback for new flow: find order by payment intent ID if metadata orderId is missing
      if (!orderId && charge.payment_intent && typeof charge.payment_intent === 'string') {
        const order = await prisma.order.findUnique({
          where: { stripePaymentIntentId: charge.payment_intent },
          select: { id: true }
        });
        if (order) orderId = order.id;
      }

      if (orderId) {
        logger.info({ orderId }, '[Stripe Webhook] Charge refunded');
        await markOrderRefunded(orderId);
        queueOrderSync(orderId);
      }
      break;
    }

    default:
      logger.info({ type: event.type }, '[Stripe Webhook] Unhandled event type');
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
