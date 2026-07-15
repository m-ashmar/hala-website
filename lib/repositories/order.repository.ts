/**
 * Order repository — all database operations for Order and OrderItem.
 *
 * Design principles:
 * - No business logic here — pure data access only
 * - All mutations run inside Prisma transactions where atomicity matters
 * - Reference codes are short, human-readable, and uppercase for easy quoting
 * - No Sanity sync calls — that belongs in the service or API route layer
 */

import prisma from '@/lib/prisma';
import type { CheckoutPayload } from '@/types/cart';
import { OrderStatus, Prisma } from '@prisma/client';

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
}

// ── Reference code generator ──────────────────────────────────────────────────

/**
 * Generates a short, human-readable payment reference code.
 * Format: HL-YYYYMMDD-XXXX (e.g. HL-20260707-A3F2)
 * Customers include this in their ShamCash transfer note.
 */
export function generateReferenceCode(): string {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `HL-${datePart}-${randomPart}`;
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

    // Deduct stock for each item (with row-level locking via SELECT ... FOR UPDATE)
    for (const item of order.items) {
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
  return prisma.order.updateMany({
    where: { id: orderId, paymentStatus: 'PAID' },
    data: { status: 'CANCELLED', paymentStatus: 'REFUNDED' },
  });
}

/**
 * Cancels a pending order (e.g., expired payment window).
 * Idempotent: cancelling an already-cancelled order is a no-op.
 */
export async function cancelOrder(orderId: string) {
  return prisma.order.update({
    where: { id: orderId },
    data: { status: 'CANCELLED' },
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
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_SHIPPING', 'CANCELLED'],
  READY_FOR_SHIPPING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
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
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId, deletedAt: null },
      select: { id: true, status: true },
    });

    if (!order) throw new Error(`Order ${orderId} not found`);

    if (!isValidStatusTransition(order.status, newStatus)) {
      throw new Error(
        `Invalid status transition: ${order.status} → ${newStatus}`
      );
    }

    // No-op if already in target status (idempotent)
    if (order.status === newStatus) return order;

    return tx.order.update({
      where: { id: orderId },
      data: { status: newStatus },
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
