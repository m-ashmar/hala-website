import prisma from '@/lib/prisma';
import { Order } from '@prisma/client';
import { getCheckoutDraftBySessionId, markDraftCompleted } from '../repositories/checkout-draft.repository';
import { recordCouponUsage } from '../repositories/coupon.repository';
import { notifyOrderConfirmed } from './order-notification.service';
import { generateReferenceCode } from '../repositories/order.repository';
import { syncOrderToSanity } from './sanity-sync.service';
import { reportWarning } from '@/lib/monitoring';

/**
 * Creates a confirmed Stripe order from a CheckoutDraft.
 * Idempotent: if an order already exists for stripeSessionId, returns it immediately.
 */
export async function fulfillStripeCheckout(
  stripeSessionId: string,
  stripePaymentIntentId: string | null
): Promise<Order> {
  // 1. Idempotency check: does the order already exist?
  const existingOrder = await prisma.order.findUnique({
    where: { stripeSessionId },
  });
  if (existingOrder) {
    return existingOrder;
  }

  // 2. Load the draft
  const draft = await getCheckoutDraftBySessionId(stripeSessionId);
  if (!draft) {
    throw new Error(`CheckoutDraft not found for stripeSessionId: ${stripeSessionId}`);
  }

  // 3. Create the order and deduct stock atomically
  const order = await prisma.$transaction(async (tx) => {
    // 3a. Deduct stock for each item.
    //
    // Conditional updateMany rather than read-then-write: two concurrent
    // fulfilments could otherwise both pass the check and oversell into
    // negative stock. A count of 0 means someone else took it first.
    const items = draft.items as any[];
    for (const item of items) {
      const result = await tx.productSync.updateMany({
        where: { id: item.productSyncId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });

      if (result.count === 0) {
        const product = await tx.productSync.findUnique({
          where: { id: item.productSyncId },
          select: { sanityId: true, stock: true },
        });
        if (!product) throw new Error(`Product ${item.productSyncId} not found`);
        throw new Error(
          `Insufficient stock for ${product.sanityId}: have ${product.stock}, need ${item.quantity}`
        );
      }
    }

    // 3b. Create the Order
    const newOrder = await tx.order.create({
      data: {
        userId: draft.userId,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        totalAmount: draft.totalAmount,
        currency: draft.currency,
        referenceCode: generateReferenceCode(), // needed even for Stripe
        customerName: draft.customerName,
        customerEmail: draft.customerEmail,
        customerPhone: draft.customerPhone,
        customerNote: draft.customerNote,
        couponId: draft.couponId,
        discountAmount: draft.discountAmount,
        // Carry the conversion snapshot through so the order records what was
        // actually charged, immune to later exchange-rate edits.
        chargedAmount: draft.chargedAmount,
        chargedCurrency: draft.chargedCurrency,
        exchangeRate: draft.exchangeRate,
        // Shipping snapshot captured before the Stripe redirect.
        shippingAddressId: draft.shippingAddressId,
        shippingFullName: draft.shippingFullName,
        shippingPhone: draft.shippingPhone,
        shippingAddressLine1: draft.shippingAddressLine1,
        shippingAddressLine2: draft.shippingAddressLine2,
        shippingCity: draft.shippingCity,
        shippingCountry: draft.shippingCountry,
        stripeSessionId,
        stripePaymentIntentId,
        paidAt: new Date(),
        items: {
          create: items.map((item: any) => ({
            productSyncId: item.productSyncId,
            quantity: item.quantity,
            priceAtPurchase: item.priceAtPurchase,
            snapshotTitle: item.snapshotTitle,
            snapshotImageUrl: item.snapshotImageUrl,
            customization: item.customization,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Record the redemption in the same transaction, so a coupon is never
    // counted against an order that failed to be created.
    if (draft.couponId) {
      const outcome = await recordCouponUsage(tx, draft.couponId, newOrder.id, draft.userId);
      if (outcome === 'LIMIT_EXCEEDED') {
        // The customer has already been charged; the order stands. Logged so
        // an over-issued coupon can be reconciled.
        reportWarning('Coupon redeemed past maxUses — over-issued, needs review', {
          scope: 'coupon.overIssued',
          orderId: newOrder.id,
          couponId: draft.couponId,
        });
      }
    }

    return newOrder;
  });

  // 4. Mark draft as completed
  await markDraftCompleted(draft.id);

  // 5. Confirmation email — best-effort, never blocks or fails the order.
  void notifyOrderConfirmed(order.id);

  // 5. Fire-and-forget Sanity sync
  void prisma.order.findUnique({
    where: { id: order.id },
    include: {
      user: { select: { name: true, email: true, whatsappPhone: true } },
      items: { include: { productSync: { select: { sanityId: true } } } },
      coupon: { select: { code: true } },
    }
  }).then(fullOrder => {
    if (fullOrder) syncOrderToSanity(fullOrder as any);
  });

  return order;
}

