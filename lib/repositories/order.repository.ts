/**
 * Order repository — all database operations for Order and OrderItem.
 *
 * Design principles:
 * - No business logic here — pure data access only
 * - All mutations run inside Prisma transactions where atomicity matters
 * - Reference codes are short, human-readable, and uppercase for easy quoting
 * - No Sanity sync calls — that belongs in the service or API route layer
 */

import { randomBytes } from 'crypto';
import prisma, { type TxClient } from '@/lib/prisma';
import type { CheckoutPayload } from '@/types/cart';
import { OrderStatus, Prisma } from '@prisma/client';
import { recordCouponUsage } from './coupon.repository';
import { reportWarning } from '@/lib/monitoring';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ValidatedOrderItem {
  productSyncId: string;
  sanityId: string;
  quantity: number;
  priceAtPurchase: number; // price from DB at order creation time (source of truth)
  snapshotTitle?: string;
  snapshotImageUrl?: string;
  customization?: Record<string, string>;
}

/**
 * Immutable snapshot of where an order ships. Denormalised on purpose — the
 * customer's saved Address may later be edited or deleted, and a fulfilled
 * order must always retain the address it was actually shipped to.
 */
export interface ShippingSnapshot {
  shippingAddressId?: string | null;
  shippingFullName?: string | null;
  shippingPhone?: string | null;
  shippingAddressLine1?: string | null;
  shippingAddressLine2?: string | null;
  shippingCity?: string | null;
  shippingCountry?: string | null;
}

export interface CreateOrderInput {
  customer: CheckoutPayload['customer'];
  items: ValidatedOrderItem[];
  totalAmount: number;
  referenceCode: string;
  currency: string;
  expiresAt: Date;
  userId?: string;
  couponId?: string;
  discountAmount?: number;
  shipping?: ShippingSnapshot;
}

// ── Reference code generator ──────────────────────────────────────────────────

/**
 * Generates a short, human-readable payment reference code.
 * Format: HL-YYYYMMDD-XXXX (e.g. HL-20260707-A3F2)
 * Customers include this in their ShamCash transfer note.
 */
/**
 * Alphabet for reference codes: uppercase alphanumerics minus the characters
 * people misread aloud or in handwriting (I/1, O/0, U vs V). Codes are read
 * over the phone and copied into transfer notes, so ambiguity is a real cost.
 */
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTVWXYZ23456789';
const REFERENCE_LENGTH = 10;

/**
 * Generates an order reference code.
 *
 * Security note: this is the lookup key for /api/orders/by-reference, which is
 * unauthenticated by design so guests can track an order. That makes the code a
 * bearer token over customer data, and it must not be guessable.
 *
 * The previous implementation used Math.random() with 4 base-36 characters
 * (~1.7M combinations, non-CSPRNG, and predictable from prior outputs) while
 * the checkout route's own comment claimed it was "cryptographically random
 * enough to prevent guessing". It was not.
 *
 * This uses crypto.randomBytes with rejection sampling — taking bytes modulo
 * the alphabet length would bias the earlier characters — giving
 * 31^10 ≈ 8.2e14 combinations.
 */
export function generateReferenceCode(): string {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');

  // Largest multiple of the alphabet size that fits in a byte; values at or
  // above it are rejected so every character is uniformly distributed.
  const limit = 256 - (256 % REFERENCE_ALPHABET.length);

  let out = '';
  while (out.length < REFERENCE_LENGTH) {
    for (const byte of randomBytes(REFERENCE_LENGTH)) {
      if (byte >= limit) continue;
      out += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
      if (out.length === REFERENCE_LENGTH) break;
    }
  }

  return `HL-${datePart}-${out}`;
}

/**
 * Generates a reference code guaranteed not to collide with an existing order.
 *
 * `referenceCode` is a unique column, so a collision would surface as an
 * opaque constraint violation at order-creation time. Collisions are
 * vanishingly unlikely at this entropy, but a failed checkout is expensive
 * enough to be worth the check.
 */
export async function generateUniqueReferenceCode(maxAttempts = 5): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateReferenceCode();
    const existing = await prisma.order.findUnique({
      where: { referenceCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique order reference code');
}

// ── Read operations ───────────────────────────────────────────────────────────

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id, deletedAt: null },
    include: {
      user: { select: { name: true, email: true } },
      items: { include: { productSync: { select: { sanityId: true } } } },
    },
  });
}

export async function getOrderByReferenceCode(referenceCode: string) {
  return prisma.order.findFirst({
    where: { referenceCode, deletedAt: null },
    include: {
      items: { include: { productSync: { select: { sanityId: true, price: true } } } },
    },
  });
}

// ── Write operations ──────────────────────────────────────────────────────────

/**
 * Creates a PENDING order with all line items.
 * We use paymentIntentId to store the ShamCash reference code
 * (field reuse — avoids a schema migration for this phase).
 */
export async function createPendingOrder(input: CreateOrderInput) {
  return prisma.order.create({
    data: {
      status: 'PENDING',
      paymentStatus: 'PENDING',
      totalAmount: input.totalAmount,
      currency: input.currency,
      referenceCode: input.referenceCode,
      customerName: input.customer.name,
      customerEmail: input.customer.email,
      customerPhone: input.customer.phone ?? null,
      customerNote: input.customer.note ?? null,
      expiresAt: input.expiresAt,
      userId: input.userId ?? null,
      couponId: input.couponId ?? null,
      discountAmount: input.discountAmount ?? 0,
      ...(input.shipping ?? {}),
      items: {
        create: input.items.map((item) => ({
          productSyncId: item.productSyncId,
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchase,
          snapshotTitle: item.snapshotTitle ?? null,
          snapshotImageUrl: item.snapshotImageUrl ?? null,
          customization: (item.customization as Prisma.InputJsonValue) ?? null,
        })),
      },
    },
    include: {
      items: true,
    },
  });
}

/**
 * Returns all orders for a given user (customer dashboard).
 * Ordered newest-first.
 */
export async function getOrdersByUserId(userId: string) {
  return prisma.order.findMany({
    where: { userId, deletedAt: null },
    include: {
      items: {
        include: {
          productSync: { select: { sanityId: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Returns a single order with full detail — user-scoped for security.
 * Returns null if the order does not belong to the requesting user.
 */
export async function getOrderDetailById(id: string, userId: string) {
  return prisma.order.findFirst({
    where: { id, userId, deletedAt: null },
    include: {
      user: { select: { name: true, email: true, whatsappPhone: true } },
      items: {
        include: {
          productSync: { select: { sanityId: true, price: true } },
        },
      },
      coupon: { select: { code: true, discountType: true, discountValue: true } },
    },
  });
}

/**
 * Marks an order as PROCESSING (payment confirmed).
 * Deducts stock for each item inside a single transaction.
 * Idempotent: if already PROCESSING, returns without error.
 */
export async function confirmOrderPayment(orderId: string, stripePaymentIntentId?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new Error(`Order ${orderId} not found`);

    // Idempotency check — already confirmed
    if (order.paymentStatus === 'PAID') return order;
    if (order.status === 'CANCELLED') {
      throw new Error(`Order ${orderId} is cancelled — cannot confirm payment`);
    }

    // Deduct stock atomically.
    //
    // A read-then-write (findUnique, compare, update) is NOT safe here: two
    // concurrent confirmations can both read the same stock value and both
    // pass the check, overselling into negative. A conditional updateMany
    // makes the check and the decrement a single atomic statement — a count
    // of 0 means someone else took the stock first.
    for (const item of order.items) {
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

    // Record the coupon redemption in the same transaction, so a coupon can
    // never be counted against an order that failed to confirm.
    if (order.couponId) {
      const outcome = await recordCouponUsage(tx, order.couponId, order.id, order.userId);
      if (outcome === 'LIMIT_EXCEEDED') {
        // Not fatal — the customer has already paid the discounted price and
        // the order must stand. Logged loudly so it can be reconciled.
        reportWarning('Coupon redeemed past maxUses — over-issued, needs review', {
          scope: 'coupon.overIssued',
          orderId: order.id,
          couponId: order.couponId,
        });
      }
    }

    // Update order status
    return tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        paidAt: new Date(),
        ...(stripePaymentIntentId && { stripePaymentIntentId })
      },
    });
  });
}

/**
 * Attaches a Stripe Checkout Session ID to an existing order.
 */
export async function updateOrderStripeSession(orderId: string, sessionId: string) {
  return prisma.order.update({
    where: { id: orderId },
    data: { stripeSessionId: sessionId },
  });
}

/**
 * Marks an order as failed if the payment failed.
 * Idempotent.
 */
export async function markOrderFailed(orderId: string) {
  return prisma.order.updateMany({
    where: { id: orderId, paymentStatus: 'PENDING' },
    data: { status: 'CANCELLED', paymentStatus: 'FAILED' },
  });
}

/**
 * Marks an order as refunded (e.g. from charge.refunded).
 */
export async function markOrderRefunded(orderId: string) {
  return prisma.$transaction(async (tx) => {
    // Conditional update doubles as the idempotency guard: only an order
    // still marked PAID transitions here, so a replayed charge.refunded
    // webhook is a no-op and cannot restock the same items twice.
    const updated = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: 'PAID' },
      data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' },
    });

    if (updated.count === 0) return updated; // already refunded, or never paid

    // Refunded goods come back into inventory. Previously they did not, so
    // every refund permanently destroyed stock.
    await restockOrderItems(tx, orderId);

    return updated;
  });
}

/**
 * Cancels a pending order (e.g., expired payment window).
 * Idempotent: cancelling an already-cancelled order is a no-op.
 */
/**
 * Returns an order's items to stock.
 *
 * Only ever called for orders whose stock was actually deducted (i.e. that
 * reached PAID). Guarded by the caller's status check so a replayed webhook
 * cannot restock twice and inflate inventory.
 */
async function restockOrderItems(
  tx: TxClient,
  orderId: string
): Promise<void> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { productSyncId: true, quantity: true },
  });

  for (const item of items) {
    await tx.productSync.update({
      where: { id: item.productSyncId },
      data: { stock: { increment: item.quantity } },
    });
  }
}

/**
 * Records that payment was received for an order that cannot yet be fulfilled.
 *
 * Exists for one specific, real failure: a ShamCash order validates stock at
 * creation but does not reserve it. If the last unit sells between placing and
 * paying, confirmOrderPayment throws on insufficient stock — and the order was
 * left PENDING/PENDING, which meant the expiry cron would later CANCEL an
 * order the customer had genuinely paid for.
 *
 * Setting paymentStatus = PAID does three things:
 *   - removes it from getExpiredPendingOrders(), so it can never be
 *     auto-cancelled;
 *   - tells the truth — the money did arrive;
 *   - surfaces it in admin as paid-but-unfulfilled, which is a human decision
 *     (restock, backorder or refund), not one to make automatically.
 *
 * Status deliberately stays PENDING: the goods cannot ship yet.
 */
export async function markPaymentReceivedPendingFulfilment(
  orderId: string,
  stripePaymentIntentId?: string
) {
  return prisma.order.updateMany({
    where: { id: orderId, paymentStatus: 'PENDING' },
    data: {
      paymentStatus: 'PAID',
      paidAt: new Date(),
      ...(stripePaymentIntentId && { stripePaymentIntentId }),
    },
  });
}

export async function cancelOrder(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, paymentStatus: true },
    });
    if (!order) throw new Error(`Order ${orderId} not found`);

    // Already terminal — nothing to do, and must not restock again.
    if (order.status === 'CANCELLED') return order;

    // Stock is only deducted once payment is confirmed, so only return it
    // when it was actually taken.
    if (order.paymentStatus === 'PAID') {
      await restockOrderItems(tx, orderId);
    }

    return tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });
  });
}

/**
 * Returns all orders that are still PENDING and past their expiry time.
 * Used by a cleanup job to expire unpaid orders.
 */
export async function getExpiredPendingOrders() {
  return prisma.order.findMany({
    where: {
      status: 'PENDING',
      paymentStatus: 'PENDING',
      expiresAt: { lt: new Date() },
      deletedAt: null,
    },
    select: { id: true, referenceCode: true, expiresAt: true },
  });
}

// ── Admin / Sync operations ───────────────────────────────────────────────────

/**
 * Valid status transitions for the order state machine.
 * Terminal states (CANCELLED, FAILED_PAYMENT, REFUNDED) allow no further changes.
 * Enforced server-side to reject invalid Sanity webhook payloads.
 */
const VALID_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING: ['CONFIRMED', 'CANCELLED', 'FAILED_PAYMENT'],
  // REFUNDED is reachable from every paid state, not only DELIVERED.
  // A refund can be issued at any point after payment — a customer changes
  // their mind mid-preparation, a shipment is lost in transit. Stripe already
  // permits this: markOrderRefunded() writes the status directly and bypasses
  // this map, so the webhook path worked while the admin UI refused the same
  // transition. That inconsistency meant an admin could not record a refund
  // they had just issued.
  CONFIRMED: ['PREPARING', 'CANCELLED', 'REFUNDED'],
  PREPARING: ['READY_FOR_SHIPPING', 'CANCELLED', 'REFUNDED'],
  READY_FOR_SHIPPING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
  // No CANCELLED once shipped — the goods are already with the courier.
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  // Terminal states — no outgoing transitions
  CANCELLED: [],
  FAILED_PAYMENT: [],
  REFUNDED: [],
};

/**
 * Returns true when transitioning from `from` to `to` is allowed.
 * Transitioning to the same state is always a no-op (idempotent).
 */
export function isValidStatusTransition(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  if (from === to) return true; // idempotent no-op
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Updates order status after validating the state machine transition.
 * Throws AppError with 422 on invalid transitions.
 * Used by the Sanity webhook handler when an admin changes status in Studio.
 */
/** States that return goods to inventory when an order enters them. */
const RESTOCKING_STATUSES: OrderStatus[] = ['CANCELLED', 'REFUNDED'];

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId, deletedAt: null },
      select: { id: true, status: true, paymentStatus: true },
    });

    if (!order) throw new Error(`Order ${orderId} not found`);

    if (!isValidStatusTransition(order.status, newStatus)) {
      throw new Error(
        `Invalid status transition: ${order.status} → ${newStatus}`
      );
    }

    // No-op if already in target status (idempotent)
    if (order.status === newStatus) return order;

    // Return goods to inventory when the order enters a restocking state.
    //
    // This lives here rather than only in cancelOrder()/markOrderRefunded()
    // because inventory correctness must not depend on WHICH path was taken.
    // Previously the expiry cron and the Stripe refund webhook restocked, but
    // an admin (or a Sanity Studio edit, which routes through this same
    // function) changing the status to CANCELLED or REFUNDED silently did
    // not — so the same business outcome gave two different stock levels.
    //
    // Guarded on paymentStatus PAID because stock is only deducted at
    // confirmation; an unpaid order never took any. `order.status` is
    // re-read inside the transaction, so a concurrent update cannot cause a
    // double restock.
    const isRestocking =
      RESTOCKING_STATUSES.includes(newStatus) &&
      !RESTOCKING_STATUSES.includes(order.status) &&
      order.paymentStatus === 'PAID';

    if (isRestocking) {
      await restockOrderItems(tx, orderId);
    }

    return tx.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        // Keep paymentStatus truthful when an admin records a refund directly.
        ...(newStatus === 'REFUNDED' && { paymentStatus: 'REFUNDED' as const }),
      },
    });
  });
}

/**
 * Returns a single order with all data required to build a Sanity sync payload.
 * Includes items, productSync, user, and coupon.
 */
export async function getOrderWithItemsById(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId, deletedAt: null },
    include: {
      user: { select: { name: true, email: true, whatsappPhone: true } },
      items: {
        include: {
          productSync: { select: { sanityId: true } },
        },
      },
      coupon: { select: { code: true } },
    },
  });
}

/**
 * Returns all orders with full detail for the admin backfill endpoint.
 * Ordered newest-first. Excludes soft-deleted rows.
 */
export async function getAllOrdersForAdmin() {
  return prisma.order.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          productSync: { select: { sanityId: true } },
        },
      },
      coupon: { select: { code: true } },
    },
  });
}
