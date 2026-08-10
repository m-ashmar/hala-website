/**
 * Order notifications.
 *
 * Kept out of the repository layer (which stays pure data access) and out of
 * individual route handlers, so every path that confirms a payment — ShamCash
 * verification, the Stripe webhook, and the admin "mark as paid" action — sends
 * the same email.
 *
 * Every function here is best-effort: a delivery failure is logged and
 * swallowed. An email outage must never roll back a paid order or fail an
 * admin action.
 */

import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  type OrderEmailItem,
} from './email.service';

async function loadOrderForEmail(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { productSync: { select: { sanityId: true } } } },
    },
  });
}

function toEmailItems(
  items: { quantity: number; priceAtPurchase: number; snapshotTitle: string | null; productSync: { sanityId: string } }[]
): OrderEmailItem[] {
  return items.map((i) => ({
    title: i.snapshotTitle ?? i.productSync.sanityId,
    quantity: i.quantity,
    lineTotal: i.priceAtPurchase * i.quantity,
  }));
}

/** Sends the order confirmation. Safe to call from any payment path. */
export async function notifyOrderConfirmed(orderId: string): Promise<void> {
  try {
    const order = await loadOrderForEmail(orderId);
    if (!order) return;

    const to = order.customerEmail;
    if (!to) {
      logger.warn({ orderId }, '[OrderNotify] No customer email — skipping confirmation');
      return;
    }

    await sendOrderConfirmation({
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

    logger.info({ orderId }, '[OrderNotify] Confirmation sent');
  } catch (err) {
    // Never propagate: the payment already succeeded.
    logger.error({ err, orderId }, '[OrderNotify] Failed to send confirmation');
  }
}

/** Sends a shipped/delivered notification. No-op for other statuses. */
export async function notifyOrderStatus(
  orderId: string,
  status: string
): Promise<void> {
  if (status !== 'SHIPPED' && status !== 'DELIVERED') return;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { customerEmail: true, customerName: true, referenceCode: true, id: true },
    });
    if (!order?.customerEmail) return;

    await sendOrderStatusUpdate({
      to: order.customerEmail,
      customerName: order.customerName ?? 'there',
      referenceCode: order.referenceCode ?? order.id.slice(0, 12),
      status,
    });

    logger.info({ orderId, status }, '[OrderNotify] Status update sent');
  } catch (err) {
    logger.error({ err, orderId, status }, '[OrderNotify] Failed to send status update');
  }
}
