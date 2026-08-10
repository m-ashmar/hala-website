/**
 * Fulfilment for paid custom requests.
 *
 * Both the Stripe webhook and the /checkout/stripe-return polling route need
 * to turn a paid custom request into an order, and whichever arrives first
 * should win. They previously each held their own copy of this logic behind a
 * non-atomic `if (!order)` check, so a webhook and a return-URL hit landing
 * together could create two orders for one payment — the standard checkout
 * path is protected by a unique stripeSessionId, this one was not.
 *
 * This is now the single implementation, and it is idempotent by
 * construction: the order is created and linked inside one transaction, and
 * CustomRequest.orderId is unique, so a concurrent second attempt rolls back
 * rather than leaving an orphaned order behind.
 */

import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { generateUniqueReferenceCode } from '@/lib/repositories/order.repository';
import { syncCustomRequestToSanity, syncOrderToSanity } from './sanity-sync.service';
import { notifyOrderConfirmed } from './order-notification.service';

/** Placeholder product row that custom-request order items point at. */
const CUSTOM_REQUEST_SANITY_ID = 'custom-request';
const CUSTOM_REQUEST_PRODUCT_ID = 'custom-request-item';

export interface FulfillCustomRequestResult {
  orderId: string;
  referenceCode: string | null;
  /** True when this call created the order; false when it already existed. */
  created: boolean;
}

export async function fulfillCustomRequestPayment(
  customRequestId: string,
  stripeSessionId: string | null,
  stripePaymentIntentId: string | null
): Promise<FulfillCustomRequestResult | null> {
  const customRequest = await prisma.customRequest.findUnique({
    where: { id: customRequestId },
    include: { order: true },
  });

  if (!customRequest) {
    logger.warn({ customRequestId }, '[CustomRequest] Not found — cannot fulfil');
    return null;
  }

  // Fast path: already fulfilled (webhook and return URL both fired).
  if (customRequest.order) {
    return {
      orderId: customRequest.order.id,
      referenceCode: customRequest.order.referenceCode,
      created: false,
    };
  }

  // The placeholder product must exist to satisfy the OrderItem foreign key.
  await prisma.productSync.upsert({
    where: { sanityId: CUSTOM_REQUEST_SANITY_ID },
    update: {},
    create: {
      id: CUSTOM_REQUEST_PRODUCT_ID,
      sanityId: CUSTOM_REQUEST_SANITY_ID,
      price: 0,
      stock: 999_999,
      isActive: true,
    },
  });

  const referenceCode = await generateUniqueReferenceCode();
  const amount = customRequest.quotePrice ?? 0;

  try {
    const order = await prisma.$transaction(async (tx) => {
      // Re-check inside the transaction: another request may have linked an
      // order between our read above and here.
      const fresh = await tx.customRequest.findUnique({
        where: { id: customRequestId },
        select: { orderId: true },
      });
      if (fresh?.orderId) {
        const existing = await tx.order.findUnique({ where: { id: fresh.orderId } });
        if (existing) return existing;
      }

      const created = await tx.order.create({
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          totalAmount: amount,
          currency: customRequest.currency || 'SYP',
          referenceCode,
          customerName: customRequest.name,
          customerEmail: customRequest.email,
          userId: customRequest.userId ?? null,
          stripeSessionId,
          stripePaymentIntentId,
          paidAt: new Date(),
          items: {
            create: [
              {
                productSyncId: CUSTOM_REQUEST_PRODUCT_ID,
                quantity: 1,
                priceAtPurchase: amount,
                snapshotTitle: customRequest.title,
                customization: { customRequestId: customRequest.id },
              },
            ],
          },
        },
        include: { items: true },
      });

      // Linking here is the race guard: CustomRequest.orderId is unique, so a
      // concurrent attempt fails and this whole transaction — including the
      // order — is rolled back.
      await tx.customRequest.update({
        where: { id: customRequestId },
        data: { status: 'PAID', orderId: created.id },
      });

      return created;
    });

    void syncOrderToSanity(
      (await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          user: { select: { name: true, email: true, whatsappPhone: true } },
          items: { include: { productSync: { select: { sanityId: true } } } },
          coupon: { select: { code: true } },
        },
      })) as never
    );

    const updated = await prisma.customRequest.findUnique({ where: { id: customRequestId } });
    if (updated) {
      void syncCustomRequestToSanity({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        title: updated.title,
        details: updated.details,
        imageUrls: updated.imageUrls,
        requestedQuantity: updated.requestedQuantity,
        status: updated.status,
        quotePrice: updated.quotePrice,
        currency: updated.currency,
        estimatedDays: updated.estimatedDays,
        adminNotes: updated.adminNotes,
      });
    }

    void notifyOrderConfirmed(order.id);

    return { orderId: order.id, referenceCode: order.referenceCode, created: true };
  } catch (err) {
    // Lost the race — re-read and return the winner's order rather than failing.
    const retry = await prisma.customRequest.findUnique({
      where: { id: customRequestId },
      include: { order: true },
    });
    if (retry?.order) {
      logger.info(
        { customRequestId, orderId: retry.order.id },
        '[CustomRequest] Concurrent fulfilment detected — using existing order'
      );
      return {
        orderId: retry.order.id,
        referenceCode: retry.order.referenceCode,
        created: false,
      };
    }
    throw err;
  }
}
