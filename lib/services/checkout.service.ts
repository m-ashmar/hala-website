import prisma from '@/lib/prisma';
import { Order } from '@prisma/client';
import { getCheckoutDraftBySessionId, markDraftCompleted } from '../repositories/checkout-draft.repository';
import { generateReferenceCode } from '../repositories/order.repository';
import { syncOrderToSanity } from './sanity-sync.service';

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
    // 3a. Deduct stock for each item
    const items = draft.items as any[];
    for (const item of items) {
      const product = await tx.productSync.findUnique({
        where: { id: item.productSyncId },
      });
      if (!product) throw new Error(`Product ${item.productSyncId} not found`);
      if (product.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for ${product.sanityId}: have ${product.stock}, need ${item.quantity}`
        );
      }
      await tx.productSync.update({
        where: { id: item.productSyncId },
        data: { stock: { decrement: item.quantity } },
      });
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

    return newOrder;
  });

  // 4. Mark draft as completed
  await markDraftCompleted(draft.id);

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

