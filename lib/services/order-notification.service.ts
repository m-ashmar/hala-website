/**
 * Order notifications — durable outbox.
 *
 * Kept out of the repository layer (which stays pure data access) and out of
 * individual route handlers, so every path that confirms a payment — ShamCash
 * verification, the Stripe webhook, Stripe fulfilment and the admin
 * "mark as paid" action — sends the same email.
 *
 * Delivery must never roll back a paid order, but simply logging a failure
 * meant a lost confirmation was gone forever and the customer silently
 * received nothing. Every attempt is therefore recorded in NotificationLog:
 *
 *   - a unique [orderId, type] constraint makes replays idempotent, so a
 *     redelivered Stripe webhook cannot double-send;
 *   - failures persist as FAILED with the error and an attempt count, and are
 *     retried by /api/cron/retry-notifications;
 *   - the send itself is still non-blocking, so an email outage cannot fail
 *     a payment.
 */

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  type OrderEmailItem,
} from './email.service';

export const NOTIFICATION_TYPES = {
  ORDER_CONFIRMATION: 'ORDER_CONFIRMATION',
  ORDER_SHIPPED: 'ORDER_SHIPPED',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/** Max delivery attempts before a notification stops being retried. */
export const MAX_NOTIFICATION_ATTEMPTS = 5;

function toEmailItems(
  items: {
    quantity: number;
    priceAtPurchase: number;
    snapshotTitle: string | null;
    productSync: { sanityId: string };
  }[]
): OrderEmailItem[] {
  return items.map((i) => ({
    title: i.snapshotTitle ?? i.productSync.sanityId,
    quantity: i.quantity,
    lineTotal: i.priceAtPurchase * i.quantity,
  }));
}

/**
 * Claims a notification slot for (order, type).
 *
 * Returns null when one already exists and is SENT, or has exhausted its
 * retries — the caller should then do nothing. This is the idempotency gate.
 */
async function claimNotification(
  orderId: string,
  type: NotificationType,
  recipient: string
): Promise<{ id: string; attempts: number } | null> {
  const existing = await prisma.notificationLog.findUnique({
    where: { orderId_type: { orderId, type } },
    select: { id: true, status: true, attempts: true },
  });

  if (existing) {
    if (existing.status === 'SENT') return null;
    if (existing.attempts >= MAX_NOTIFICATION_ATTEMPTS) return null;
    return { id: existing.id, attempts: existing.attempts };
  }

  try {
    const created = await prisma.notificationLog.create({
      data: { orderId, type, recipient, status: 'PENDING' },
      select: { id: true, attempts: true },
    });
    return { id: created.id, attempts: created.attempts };
  } catch (err) {
    // The find-then-create above is check-then-act, and two payment paths can
    // legitimately race here — the Stripe webhook and the return-URL poll both
    // call this for the same order. The unique [orderId, type] constraint is
    // what actually guarantees a single send; losing that race is normal, not
    // an error. Returning null lets the loser stand down quietly instead of
    // surfacing as "confirmation could not be attempted", which would be
    // alarming and wrong.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return null;
    }
    throw err;
  }
}

/** Records the outcome of a delivery attempt. */
async function settleNotification(
  id: string,
  attempts: number,
  ok: boolean,
  error?: string
): Promise<void> {
  await prisma.notificationLog.update({
    where: { id },
    data: {
      status: ok ? 'SENT' : 'FAILED',
      attempts: attempts + 1,
      sentAt: ok ? new Date() : null,
      lastError: ok ? null : (error ?? 'Unknown error').slice(0, 2000),
    },
  });
}

/**
 * Sends the order confirmation. Safe to call from any payment path, and safe
 * to call repeatedly — only the first successful delivery is recorded.
 */
export async function notifyOrderConfirmed(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { productSync: { select: { sanityId: true } } } },
      },
    });
    if (!order) return;

    const to = order.customerEmail;
    if (!to) {
      logger.warn({ orderId }, '[OrderNotify] No customer email — skipping confirmation');
      return;
    }

    const claim = await claimNotification(
      orderId,
      NOTIFICATION_TYPES.ORDER_CONFIRMATION,
      to
    );
    if (!claim) return; // already sent, or retries exhausted

    try {
      const result = await sendOrderConfirmation({
        to,
        customerName: order.customerName ?? 'there',
        referenceCode: order.referenceCode ?? order.id.slice(0, 12),
        items: toEmailItems(order.items),
        totalAmount: order.totalAmount,
        currency: order.currency,
        chargedAmount: order.chargedAmount,
        chargedCurrency: order.chargedCurrency,
        shipping: {
          fullName: order.shippingFullName,
          phone: order.shippingPhone,
          addressLine1: order.shippingAddressLine1,
          addressLine2: order.shippingAddressLine2,
          city: order.shippingCity,
          country: order.shippingCountry,
        },
      });

      await settleNotification(
        claim.id,
        claim.attempts,
        result.success,
        result.success ? undefined : 'Email provider reported failure'
      );

      if (result.success) {
        logger.info({ orderId }, '[OrderNotify] Confirmation sent');
      } else {
        logger.error({ orderId }, '[OrderNotify] Confirmation failed — queued for retry');
      }
    } catch (err) {
      await settleNotification(
        claim.id,
        claim.attempts,
        false,
        err instanceof Error ? err.message : String(err)
      );
      logger.error({ err, orderId }, '[OrderNotify] Confirmation threw — queued for retry');
    }
  } catch (err) {
    // Never propagate: the payment already succeeded.
    logger.error({ err, orderId }, '[OrderNotify] Confirmation could not be attempted');
  }
}

/** Sends a shipped/delivered notification. No-op for other statuses. */
export async function notifyOrderStatus(
  orderId: string,
  status: string
): Promise<void> {
  if (status !== 'SHIPPED' && status !== 'DELIVERED') return;

  const type =
    status === 'SHIPPED'
      ? NOTIFICATION_TYPES.ORDER_SHIPPED
      : NOTIFICATION_TYPES.ORDER_DELIVERED;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { customerEmail: true, customerName: true, referenceCode: true, id: true },
    });
    if (!order?.customerEmail) return;

    const claim = await claimNotification(orderId, type, order.customerEmail);
    if (!claim) return;

    try {
      const result = await sendOrderStatusUpdate({
        to: order.customerEmail,
        customerName: order.customerName ?? 'there',
        referenceCode: order.referenceCode ?? order.id.slice(0, 12),
        status,
      });
      await settleNotification(
        claim.id,
        claim.attempts,
        result.success,
        result.success ? undefined : 'Email provider reported failure'
      );
      logger.info({ orderId, status, ok: result.success }, '[OrderNotify] Status update attempted');
    } catch (err) {
      await settleNotification(
        claim.id,
        claim.attempts,
        false,
        err instanceof Error ? err.message : String(err)
      );
      logger.error({ err, orderId, status }, '[OrderNotify] Status update threw — queued for retry');
    }
  } catch (err) {
    logger.error({ err, orderId, status }, '[OrderNotify] Status update could not be attempted');
  }
}

/**
 * Retries notifications left in FAILED state.
 * Driven by /api/cron/retry-notifications — without it, a transient provider
 * outage would still lose the message permanently.
 */
export async function retryFailedNotifications(limit = 50): Promise<{
  attempted: number;
  recovered: number;
}> {
  const failed = await prisma.notificationLog.findMany({
    where: { status: 'FAILED', attempts: { lt: MAX_NOTIFICATION_ATTEMPTS } },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { orderId: true, type: true },
  });

  let recovered = 0;
  for (const n of failed) {
    if (!n.orderId) continue;
    if (n.type === NOTIFICATION_TYPES.ORDER_CONFIRMATION) {
      await notifyOrderConfirmed(n.orderId);
    } else if (n.type === NOTIFICATION_TYPES.ORDER_SHIPPED) {
      await notifyOrderStatus(n.orderId, 'SHIPPED');
    } else if (n.type === NOTIFICATION_TYPES.ORDER_DELIVERED) {
      await notifyOrderStatus(n.orderId, 'DELIVERED');
    }

    const after = await prisma.notificationLog.findUnique({
      where: { orderId_type: { orderId: n.orderId, type: n.type } },
      select: { status: true },
    });
    if (after?.status === 'SENT') recovered++;
  }

  return { attempted: failed.length, recovered };
}
