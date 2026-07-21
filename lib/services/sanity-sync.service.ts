/**
 * Sanity Sync Service
 *
 * Single-responsibility: synchronize transactional data from PostgreSQL to Sanity.
 *
 * Architecture rules enforced here:
 *  - All Sanity write calls go through this file only.
 *  - Never import this service in client components or pages.
 *  - Never call this service from the Sanity webhook handler (to prevent loops).
 *  - Uses upserts for every operation — idempotent, no duplicate documents.
 *  - Failures are logged but do NOT throw — PostgreSQL remains the source of truth.
 *
 * Document ID conventions (deterministic, collision-free):
 *  - Order:  "order-{pgId}"
 *  - Coupon: "coupon-{pgId}"
 *  - CustomRequest: "customrequest-{pgId}"
 */

import { writeClient } from '@/sanity/lib/client'
import type { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'

// ── Types ─────────────────────────────────────────────────────────────────────

/** Minimal Order shape required to build a Sanity document. */
export interface OrderSyncInput {
  id: string
  referenceCode: string | null
  status: string
  paymentStatus: string
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  customerNote: string | null
  currency: string
  totalAmount: number
  discountAmount: number
  coupon?: { code: string } | null
  shippingCost?: number | null
  createdAt: Date
  items: Array<{
    productSync: { sanityId: string }
    snapshotTitle: string | null
    snapshotImageUrl: string | null
    quantity: number
    priceAtPurchase: number
    customization: Prisma.JsonValue | null
  }>
}

/** Minimal Coupon shape required to build a Sanity document. */
export interface CouponSyncInput {
  id: string
  code: string
  description: string | null
  discountType: string
  discountValue: number
  minOrderAmount: number | null
  maxUses: number | null
  usedCount: number
  expiresAt: Date | null
  isActive: boolean
}

/** Minimal User shape required to build a Sanity document. */
export interface UserSyncInput {
  id: string
  name: string | null
  email: string | null
  role: string
  whatsappPhone: string | null
  whatsappVerified: boolean
  createdAt: Date
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the deterministic Sanity document ID for a Postgres order. */
export function orderSanityId(pgId: string): string {
  return `order-${pgId}`
}

/** Returns the deterministic Sanity document ID for a Postgres coupon. */
export function couponSanityId(pgId: string): string {
  return `coupon-${pgId}`
}

/** Returns the deterministic Sanity document ID for a Postgres user. */
export function userSanityId(pgId: string): string {
  return `user-${pgId}`
}

/** Returns the deterministic Sanity document ID for a Postgres custom request. */
export function customRequestSanityId(pgId: string): string {
  return `customrequest-${pgId}`
}

// ── Order Sync ────────────────────────────────────────────────────────────────

/**
 * Upserts an Order document in Sanity.
 *
 * Uses createOrReplace so the operation is always idempotent.
 * Call this whenever an order is created or updated in PostgreSQL.
 * Do NOT call this from the Sanity webhook handler (prevents sync loops).
 */
export async function syncOrderToSanity(order: OrderSyncInput): Promise<void> {
  const docId = orderSanityId(order.id)

  try {
    const doc = {
      _id: docId,
      _type: 'order',
      pgId: order.id,
      referenceCode: order.referenceCode ?? '',
      status: order.status,
      paymentStatus: order.paymentStatus,
      customerName: order.customerName ?? '',
      customerEmail: order.customerEmail ?? '',
      customerPhone: order.customerPhone ?? '',
      customerNote: order.customerNote ?? '',
      currency: order.currency,
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount,
      couponCode: order.coupon?.code ?? null,
      shippingCost: order.shippingCost ?? 0,
      pgCreatedAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        _key: `${item.productSync.sanityId}-${item.quantity}`,
        productTitle: item.productSync.sanityId,
        snapshotTitle: item.snapshotTitle ?? '',
        snapshotImageUrl: item.snapshotImageUrl ?? '',
        quantity: item.quantity,
        unitPrice: item.priceAtPurchase,
        customization: item.customization
          ? JSON.stringify(item.customization)
          : null,
      })),
    }

    await writeClient.createOrReplace(doc)
    logger.info({ orderId: order.id, docId }, '[SanitySync] Order synced')
  } catch (err) {
    // Log and swallow — Postgres is source of truth, sync is best-effort
    logger.error({ orderId: order.id, err }, '[SanitySync] Failed to sync order')
  }
}

/**
 * Patches a specific field on an existing Order document.
 * Used for lightweight updates (e.g. status-only change) without needing
 * the full order payload.
 *
 * Call this wherever syncOrderToSanity would be too expensive or unavailable.
 */
export async function patchOrderStatusInSanity(
  pgId: string,
  status: string
): Promise<void> {
  const docId = orderSanityId(pgId)
  try {
    await writeClient.patch(docId).set({ status }).commit()
    logger.info({ pgId, status }, '[SanitySync] Order status patched')
  } catch (err) {
    logger.error({ pgId, err }, '[SanitySync] Failed to patch order status')
  }
}

// ── Coupon Sync ───────────────────────────────────────────────────────────────

/**
 * Upserts a Coupon document in Sanity.
 *
 * Uses createOrReplace so the operation is always idempotent.
 * Call this whenever a coupon is created or updated in PostgreSQL.
 * Do NOT call this from the Sanity webhook handler (prevents sync loops).
 */
export async function syncCouponToSanity(coupon: CouponSyncInput): Promise<void> {
  const docId = couponSanityId(coupon.id)

  try {
    const doc = {
      _id: docId,
      _type: 'coupon',
      pgId: coupon.id,
      code: coupon.code,
      description: coupon.description ?? '',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount ?? null,
      maxUses: coupon.maxUses ?? null,
      usedCount: coupon.usedCount,
      expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
      isActive: coupon.isActive,
    }

    await writeClient.createOrReplace(doc)
    logger.info({ couponId: coupon.id, docId }, '[SanitySync] Coupon synced')
  } catch (err) {
    logger.error({ couponId: coupon.id, err }, '[SanitySync] Failed to sync coupon')
  }
}

/**
 * Patches only the usedCount on an existing Coupon document.
 * Called after every successful checkout where a coupon is applied.
 */
export async function syncCouponUsageToSanity(
  pgId: string,
  usedCount: number
): Promise<void> {
  const docId = couponSanityId(pgId)
  try {
    await writeClient.patch(docId).set({ usedCount }).commit()
    logger.info({ pgId, usedCount }, '[SanitySync] Coupon usage synced')
  } catch (err) {
    logger.error({ pgId, err }, '[SanitySync] Failed to sync coupon usage')
  }
}

/**
 * Deletes a Coupon document from Sanity.
 *
 * Orders should never be deleted — use status updates instead.
 * Coupons may be permanently removed when an admin deletes them in Studio.
 */
export async function deleteCouponFromSanity(pgId: string): Promise<void> {
  const docId = couponSanityId(pgId)
  try {
    await writeClient.delete(docId)
    logger.info({ pgId, docId }, '[SanitySync] Coupon deleted from Sanity')
  } catch (err) {
    logger.error({ pgId, err }, '[SanitySync] Failed to delete coupon from Sanity')
  }
}

// ── User Sync ─────────────────────────────────────────────────────────────────

/**
 * Upserts a User document in Sanity.
 *
 * Uses createOrReplace so the operation is always idempotent.
 * Call this whenever a user is created or updated in PostgreSQL.
 */
export async function syncUserToSanity(user: UserSyncInput): Promise<void> {
  const docId = userSanityId(user.id)

  try {
    const doc = {
      _id: docId,
      _type: 'user',
      pgId: user.id,
      name: user.name ?? '',
      email: user.email ?? '',
      role: user.role,
      whatsappPhone: user.whatsappPhone ?? '',
      whatsappVerified: user.whatsappVerified,
      pgCreatedAt: user.createdAt.toISOString(),
    }

    await writeClient.createOrReplace(doc)
    logger.info({ userId: user.id, docId }, '[SanitySync] User synced')
  } catch (err) {
    logger.error({ userId: user.id, err }, '[SanitySync] Failed to sync user')
  }
}

// ── Custom Request Sync ───────────────────────────────────────────────────────

export interface CustomRequestSyncInput {
  id: string
  name: string
  email: string
  title: string
  details: string
  imageUrls: string[]
  requestedQuantity: number
  status: string
  quotePrice: number | null
  currency: string
  estimatedDays: number | null
  adminNotes: string | null
}

export async function syncCustomRequestToSanity(req: CustomRequestSyncInput): Promise<void> {
  const docId = customRequestSanityId(req.id)

  try {
    const doc = {
      _id: docId,
      _type: 'customRequest',
      prismaId: req.id,
      name: req.name,
      email: req.email,
      title: req.title,
      details: req.details,
      imageUrls: req.imageUrls,
      requestedQuantity: req.requestedQuantity,
      status: req.status,
      quotePrice: req.quotePrice,
      estimatedDays: req.estimatedDays,
      adminNotes: req.adminNotes,
    }

    await writeClient.createOrReplace(doc)
    logger.info({ customRequestId: req.id, docId }, '[SanitySync] CustomRequest synced')
  } catch (err) {
    logger.error({ customRequestId: req.id, err }, '[SanitySync] Failed to sync CustomRequest')
  }
}
