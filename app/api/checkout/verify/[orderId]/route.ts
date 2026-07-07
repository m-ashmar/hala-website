/**
 * GET /api/checkout/verify/[orderId]
 *
 * Checks whether a pending order's payment has been received via ShamCash.
 *
 * Strategy:
 *  1. Load the order from DB (must be PENDING)
 *  2. Call ShamCash GET /transactions and look for an incoming transfer
 *     whose note contains the reference code and amount matches
 *  3. If found → confirm order (atomic DB transaction: deduct stock, mark PROCESSING)
 *  4. Return the current order status to the client
 *
 * Called by: the checkout success/pending page polling every 30s
 *            AND by the admin "Check Payment" button in the orders table
 *
 * Graceful degradation: if SHAMCASH_API_TOKEN is not configured,
 * returns the current DB status without erroring (dev/test mode).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getOrderById,
  getOrderByReferenceCode,
  confirmOrderPayment,
  cancelOrder,
} from '@/lib/repositories/order.repository';
import { findPaymentForOrder, ShamCashError } from '@/lib/services/shamcash.service';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // 1. Load order
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Already confirmed or cancelled — return current state immediately
    if (order.status !== 'PENDING') {
      return NextResponse.json({
        orderId: order.id,
        status: order.status,
        paidAt: (order as any).paidAt ?? null,
        referenceCode: order.paymentIntentId,
      });
    }

    // Check if order has expired
    const expiresAt = (order as any).expiresAt as Date | null;
    if (expiresAt && new Date() > new Date(expiresAt)) {
      await cancelOrder(order.id);
      return NextResponse.json({
        orderId: order.id,
        status: 'CANCELLED',
        reason: 'Payment window expired',
      });
    }

    // 2. Dev/unconfigured mode: skip ShamCash call, return PENDING
    const token = process.env.SHAMCASH_API_TOKEN;
    if (!token || token === 'PASTE_YOUR_TOKEN_HERE') {
      return NextResponse.json({
        orderId: order.id,
        status: 'PENDING',
        referenceCode: order.paymentIntentId,
        devMode: true,
        message: 'Configure SHAMCASH_API_TOKEN to enable live payment verification.',
      });
    }

    // 3. Query ShamCash for matching transaction
    const referenceCode = order.paymentIntentId!;
    const transaction = await findPaymentForOrder({
      referenceCode,
      expectedAmount: order.totalAmount,
      createdAt: order.createdAt,
    });

    if (!transaction) {
      // Payment not found yet — order stays PENDING
      return NextResponse.json({
        orderId: order.id,
        status: 'PENDING',
        referenceCode,
        totalAmount: order.totalAmount,
        currency: (order as any).currency,
        expiresAt: expiresAt?.toISOString() ?? null,
      });
    }

    // 4. Payment found → confirm order atomically
    const confirmed = await confirmOrderPayment(order.id);

    return NextResponse.json({
      orderId: confirmed.id,
      status: confirmed.status,
      paidAt: (confirmed as any).paidAt,
      referenceCode,
      transactionId: transaction.id,
    });
  } catch (err) {
    if (err instanceof ShamCashError) {
      // ShamCash API issue — don't fail the order, just report the problem
      console.error('[verify] ShamCash error:', err.message);
      return NextResponse.json(
        { error: 'Payment verification temporarily unavailable', code: err.code },
        { status: 503 }
      );
    }
    console.error('[GET /api/checkout/verify]', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
