import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { fulfillStripeCheckout } from '@/lib/services/checkout.service';
import { fulfillCustomRequestPayment, parseChargeSnapshot } from '@/lib/services/custom-request-checkout.service';

export const dynamic = 'force-dynamic';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-06-24.dahlia',
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ status: 'pending' });
    }

    // Custom-request checkouts follow a different path from draft checkouts.
    // Both this route and the Stripe webhook can arrive first; the shared
    // service is idempotent, so whichever wins produces exactly one order.
    if (session.metadata?.type === 'custom_request') {
      const customRequestId = session.metadata.customRequestId;
      if (!customRequestId) {
        return NextResponse.json({ error: 'Missing customRequestId in session' }, { status: 400 });
      }

      const result = await fulfillCustomRequestPayment(
        customRequestId,
        session.id,
        (session.payment_intent as string) || null,
        parseChargeSnapshot(session.metadata)
      );

      if (!result) {
        return NextResponse.json({ error: 'Custom request not found' }, { status: 404 });
      }

      return NextResponse.json({
        orderId: result.orderId,
        status: 'CONFIRMED',
        referenceCode: result.referenceCode,
      });
    }

    // Standard draft checkout processing
    const order = await fulfillStripeCheckout(
      session.id,
      (session.payment_intent as string) || null
    );

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      referenceCode: order.referenceCode,
      paidAt: (order as any).paidAt,
    });
  } catch (error) {
    console.error('[stripe-return] Error verifying session:', error);
    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    );
  }
}

