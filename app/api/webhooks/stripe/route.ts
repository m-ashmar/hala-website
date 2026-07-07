import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { 
  confirmOrderPayment, 
  markOrderFailed, 
  markOrderRefunded 
} from '@/lib/repositories/order.repository';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!signature || !endpointSecret) {
      throw new Error('Missing stripe-signature or STRIPE_WEBHOOK_SECRET');
    }
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: any) {
    console.error('[Stripe Webhook Error]:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      const paymentIntentId = session.payment_intent as string | undefined;

      if (orderId) {
        try {
          console.log(`[Stripe Webhook] Confirming payment for order: ${orderId}`);
          await confirmOrderPayment(orderId, paymentIntentId);
        } catch (confirmError) {
          console.error(`[Stripe Webhook] Failed to confirm order ${orderId}:`, confirmError);
          return NextResponse.json({ error: 'Failed to confirm order in DB' }, { status: 500 });
        }
      } else {
        console.warn(`[Stripe Webhook] checkout.session.completed missing orderId in metadata`);
      }
      break;
    }
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        console.log(`[Stripe Webhook] Session expired for order: ${orderId}`);
        await markOrderFailed(orderId);
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent;
      // Depending on setup, payment_intent might not have the orderId in metadata
      // If we need strict mapping here we'd find the order by stripePaymentIntentId
      // For now, if we have it in metadata, we use it.
      const orderId = intent.metadata?.orderId;
      if (orderId) {
        console.log(`[Stripe Webhook] Payment failed for order: ${orderId}`);
        await markOrderFailed(orderId);
      }
      break;
    }
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      // A charge is tied to a PaymentIntent, which might have the metadata
      const orderId = charge.metadata?.orderId || (charge.payment_intent && typeof charge.payment_intent === 'object' ? charge.payment_intent.metadata?.orderId : null);
      if (orderId) {
        console.log(`[Stripe Webhook] Charge refunded for order: ${orderId}`);
        await markOrderRefunded(orderId);
      }
      break;
    }
    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
