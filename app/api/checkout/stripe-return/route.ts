import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { fulfillStripeCheckout } from '@/lib/services/checkout.service';
import prisma from '@/lib/prisma';
import { createPendingOrder, generateReferenceCode, confirmOrderPayment } from '@/lib/repositories/order.repository';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-06-24.dahlia',
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ status: 'pending' });
    }

    // Handle custom request checkouts differently than draft checkouts
    if (session.metadata?.type === 'custom_request') {
      const customRequestId = session.metadata.customRequestId;
      if (!customRequestId) {
        return NextResponse.json({ error: 'Missing customRequestId in session' }, { status: 400 });
      }

      // Check if order already exists (webhook processed it)
      let customRequest = await prisma.customRequest.findUnique({
        where: { id: customRequestId },
        include: { order: true },
      });

      if (!customRequest) {
        return NextResponse.json({ error: 'Custom request not found' }, { status: 404 });
      }

      let order = customRequest.order;

      // If webhook hasn't processed yet, process it synchronously
      if (!order) {
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

        order = await createPendingOrder({
          customer: { name: customRequest.name, email: customRequest.email },
          items: [{
            productSyncId: 'custom-request-item',
            sanityId: 'custom-request',
            quantity: 1,
            priceAtPurchase: customRequest.quotePrice || 0,
            snapshotTitle: customRequest.title,
            customization: { customRequestId: customRequest.id },
          } as any],
          totalAmount: customRequest.quotePrice || 0,
          referenceCode: generateReferenceCode(),
          currency: customRequest.currency || 'SYP',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          userId: customRequest.userId ?? undefined,
        });

        await confirmOrderPayment(order.id, (session.payment_intent as string) || undefined);
        
        await prisma.customRequest.update({
          where: { id: customRequestId },
          data: { status: 'PAID', orderId: order.id },
        });

        // Add stripeSessionId for reference, even though it's not strictly mapped for custom requests
        await prisma.order.update({
          where: { id: order.id },
          data: { stripeSessionId: session.id }
        });
      }

      return NextResponse.json({
        orderId: order.id,
        status: 'CONFIRMED',
        referenceCode: order.referenceCode,
        paidAt: order.paidAt || new Date(),
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

