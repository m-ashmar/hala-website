export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/orders/[id]
 *
 * Lets an admin move an order through its lifecycle, and manually confirm a
 * ShamCash payment when automatic verification fails.
 *
 * Until this existed, /api/admin/orders was GET-only: PREPARING,
 * READY_FOR_SHIPPING, SHIPPED and DELIVERED were unreachable and orders
 * effectively froze the moment they were placed.
 *
 * Transitions are validated server-side against the existing state machine
 * (isValidStatusTransition), so the UI cannot drive an order into an
 * illegal state.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { OrderStatus } from '@prisma/client';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  updateOrderStatus,
  confirmOrderPayment,
  getOrderWithItemsById,
} from '@/lib/repositories/order.repository';
import { syncOrderToSanity } from '@/lib/services/sanity-sync.service';
import { notifyOrderConfirmed, notifyOrderStatus } from '@/lib/services/order-notification.service';

const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_SHIPPING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'FAILED_PAYMENT',
  'REFUNDED',
] as const;

const patchSchema = z
  .object({
    status: z.enum(ORDER_STATUSES).optional(),
    /**
     * Manual payment confirmation, for ShamCash transfers that the automatic
     * verifier did not match. Deducts stock and marks the order paid via the
     * same transactional path Stripe uses.
     */
    markPaid: z.boolean().optional(),
  })
  .refine((v) => v.status !== undefined || v.markPaid === true, {
    message: 'Provide a status to set, or markPaid: true',
  });

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await prisma.order.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, status: true, paymentStatus: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  try {
    // 1. Manual payment confirmation (ShamCash fallback).
    if (parsed.data.markPaid) {
      if (existing.paymentStatus === 'PAID') {
        return NextResponse.json(
          { error: 'Order is already marked as paid' },
          { status: 409 }
        );
      }
      // Deducts stock atomically and sets CONFIRMED / PAID.
      await confirmOrderPayment(id);
      logger.info(
        { orderId: id, adminId: session.user.id },
        '[Admin] Order manually marked as paid'
      );
      void notifyOrderConfirmed(id);
    }

    // 2. Status change, validated against the state machine.
    if (parsed.data.status) {
      await updateOrderStatus(id, parsed.data.status as OrderStatus);
      logger.info(
        { orderId: id, to: parsed.data.status, adminId: session.user.id },
        '[Admin] Order status updated'
      );
      // No-ops for anything other than SHIPPED / DELIVERED.
      void notifyOrderStatus(id, parsed.data.status);
    }

    const updated = await getOrderWithItemsById(id);

    // Fire-and-forget: a Sanity sync failure must not fail the admin action.
    if (updated) {
      void syncOrderToSanity(updated).catch((err) =>
        logger.error({ err, orderId: id }, '[Admin] Sanity sync failed after status change')
      );
    }

    return NextResponse.json({ order: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    // Illegal transitions and stock shortfalls are client errors, not 500s.
    if (/Invalid status transition|Insufficient stock|cancelled/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    logger.error({ err, orderId: id }, '[PATCH /api/admin/orders/[id]] Failed');
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
