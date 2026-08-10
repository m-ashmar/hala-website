/**
 * Coupon repository — all database operations for the Coupon model.
 *
 * Design principles:
 * - No business logic here — pure data access only.
 * - No Sanity sync calls — that belongs in the service or API route layer.
 * - Callers are responsible for invoking sanity-sync.service after mutations.
 */

import prisma, { type TxClient } from '@/lib/prisma'
import { DiscountType, Prisma } from '@prisma/client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateCouponInput {
  code: string
  description?: string | null
  discountType: DiscountType
  discountValue: number
  minOrderAmount?: number | null
  maxUses?: number | null
  expiresAt?: Date | null
  isActive?: boolean
}

export interface UpdateCouponInput {
  code?: string
  description?: string | null
  discountType?: DiscountType
  discountValue?: number
  minOrderAmount?: number | null
  maxUses?: number | null
  expiresAt?: Date | null
  isActive?: boolean
}

// ── Read operations ───────────────────────────────────────────────────────────

/** Returns all coupons ordered by creation date (newest first). */
export async function getAllCoupons() {
  return prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

/** Returns a single coupon by its Postgres ID. */
export async function getCouponById(id: string) {
  return prisma.coupon.findUnique({
    where: { id },
  })
}

/** Returns a single coupon by its code (case-insensitive via DB collation). */
export async function getCouponByCode(code: string) {
  return prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
  })
}

// ── Write operations ──────────────────────────────────────────────────────────

/**
 * Creates a new coupon.
 * Throws if the code already exists (unique constraint).
 */
export async function createCoupon(input: CreateCouponInput) {
  return prisma.coupon.create({
    data: {
      code: input.code.toUpperCase(),
      description: input.description ?? null,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minOrderAmount: input.minOrderAmount ?? null,
      maxUses: input.maxUses ?? null,
      expiresAt: input.expiresAt ?? null,
      isActive: input.isActive ?? true,
    },
  })
}

/**
 * Upserts a coupon by its code (creates if not exists, updates if exists).
 * Primarily used by the Sanity webhook for promotion syncing.
 */
export async function upsertCouponByCode(input: CreateCouponInput) {
  const codeUpper = input.code.toUpperCase()
  const data = {
    description: input.description ?? null,
    discountType: input.discountType,
    discountValue: input.discountValue,
    minOrderAmount: input.minOrderAmount ?? null,
    maxUses: input.maxUses ?? null,
    expiresAt: input.expiresAt ?? null,
    isActive: input.isActive ?? true,
  }
  return prisma.coupon.upsert({
    where: { code: codeUpper },
    create: { code: codeUpper, ...data },
    update: data,
  })
}

/**
 * Updates a coupon by ID.
 * Returns the updated coupon.
 */
export async function updateCoupon(id: string, input: UpdateCouponInput) {
  return prisma.coupon.update({
    where: { id },
    data: {
      ...(input.code !== undefined && { code: input.code.toUpperCase() }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.discountType !== undefined && { discountType: input.discountType }),
      ...(input.discountValue !== undefined && { discountValue: input.discountValue }),
      ...(input.minOrderAmount !== undefined && { minOrderAmount: input.minOrderAmount }),
      ...(input.maxUses !== undefined && { maxUses: input.maxUses }),
      ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  })
}

/**
 * Increments usedCount for a coupon — called after successful checkout.
 * Idempotent only in the sense that it always increments; the checkout
 * flow must ensure this is called at most once per order.
 */
export async function incrementCouponUsage(id: string) {
  return prisma.coupon.update({
    where: { id },
    data: { usedCount: { increment: 1 } },
  })
}

export type CouponRedemptionOutcome =
  /** First time this order redeemed this coupon; usedCount was incremented. */
  | 'RECORDED'
  /** This exact (coupon, order) pair was already recorded — replayed webhook. */
  | 'ALREADY_RECORDED'
  /** Recorded, but the coupon was already at maxUses. Requires attention. */
  | 'LIMIT_EXCEEDED'

/**
 * Records a coupon redemption against an order.
 *
 * Must run inside the same transaction that confirms the order, so a coupon is
 * never counted against an order that failed to complete.
 *
 * ── Guard 1: replay protection ──
 * Attempts an explicit insert and catches the unique-constraint violation on
 * [couponId, orderId] (Prisma P2002). This is deliberately explicit rather
 * than `skipDuplicates`, so a replay is a named, testable outcome rather than
 * an invisible no-op — a payment webhook redelivered by Stripe must not
 * inflate usedCount.
 *
 * ── Guard 2: atomic limit enforcement ──
 * The increment is a single conditional statement that only fires while
 * usedCount < maxUses. Checking in application code first would be a
 * check-then-act race: two concurrent redemptions could both read
 * usedCount = 49 against maxUses = 50 and both proceed. Raw SQL is required
 * because Prisma cannot express a column-to-column comparison in `where`.
 *
 * If the limit is already reached the usage row is still kept — the customer
 * has been charged a discounted price and that fact must be auditable — but
 * the caller is told via LIMIT_EXCEEDED so it can be surfaced. Rolling the
 * order back is not an option once money has moved.
 */
export async function recordCouponUsage(
  tx: TxClient,
  couponId: string,
  orderId: string,
  userId?: string | null
): Promise<CouponRedemptionOutcome> {
  // ── Guard 1 ──
  try {
    await tx.couponUsage.create({
      data: { couponId, orderId, userId: userId ?? null },
    })
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return 'ALREADY_RECORDED'
    }
    throw err
  }

  // ── Guard 2 ──
  // Conditional increment. Returns the number of rows actually updated.
  const updated = await tx.$executeRaw`
    UPDATE "Coupon"
       SET "usedCount" = "usedCount" + 1
     WHERE "id" = ${couponId}
       AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
  `

  if (updated === 0) {
    // The usage row stands (money moved), but the coupon was exhausted.
    return 'LIMIT_EXCEEDED'
  }

  return 'RECORDED'
}

/**
 * Permanently deletes a coupon.
 * Should only be called when no orders reference it, or after admin confirmation.
 * Throws if the coupon has active order references (Prisma constraint).
 */
export async function deleteCoupon(id: string) {
  return prisma.coupon.delete({
    where: { id },
  })
}
