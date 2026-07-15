import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  confirmOrderPayment,
  markOrderFailed,
  markOrderRefunded,
  getOrderWithItemsById,
} from '@/lib/repositories/order.repository';
import { syncOrderToSanity } from '@/lib/services/sanity-sync.service';
import { headers } from 'next/headers';
import { logger } from '@/lib/logger';

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
      const orderId = session.metadata?.orderId;
      const paymentIntentId = session.payment_intent as string | undefined;

      if (orderId) {
        try {
          logger.info({ orderId }, '[Stripe Webhook] Confirming payment');
          await confirmOrderPayment(orderId, paymentIntentId);
          // Postgres → Sanity: sync updated order status (CONFIRMED + PAID)
          queueOrderSync(orderId);
        } catch (err) {
          logger.error({ orderId, err }, '[Stripe Webhook] Failed to confirm order');
          return NextResponse.json({ error: 'Failed to confirm order in DB' }, { status: 500 });
        }
      } else {
        logger.warn('[Stripe Webhook] checkout.session.completed missing orderId in metadata');
      }
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        logger.info({ orderId }, '[Stripe Webhook] Session expired — marking failed');
        await markOrderFailed(orderId);
        queueOrderSync(orderId);
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
      const orderId =
        charge.metadata?.orderId ||
        (charge.payment_intent &&
          typeof charge.payment_intent === 'object'
          ? (charge.payment_intent as Stripe.PaymentIntent).metadata?.orderId
          : null);
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
