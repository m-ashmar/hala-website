/**
 * Coupon repository — all database operations for the Coupon model.
 *
 * Design principles:
 * - No business logic here — pure data access only.
 * - No Sanity sync calls — that belongs in the service or API route layer.
 * - Callers are responsible for invoking sanity-sync.service after mutations.
 */

import prisma from '@/lib/prisma'
import { DiscountType } from '@prisma/client'

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
