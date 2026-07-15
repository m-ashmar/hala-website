/**
 * Address repository — CRUD for customer saved addresses.
 *
 * Design principles:
 * - All mutations are scoped to userId — no cross-user access possible
 * - When setting a new default address, the old default is unset atomically
 * - Soft-delete not used for addresses (they're personal data, hard-delete is fine)
 */

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CreateAddressInput {
  userId: string;
  label: 'HOME' | 'WORK' | 'OTHER';
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  country?: string;
  isDefault?: boolean;
}

export type UpdateAddressInput = Partial<Omit<CreateAddressInput, 'userId'>>;

// ── Read ───────────────────────────────────────────────────────────────────────

export async function getAddressesByUserId(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
}

export async function getAddressById(id: string, userId: string) {
  return prisma.address.findFirst({ where: { id, userId } });
}

// ── Write ──────────────────────────────────────────────────────────────────────

/**
 * Creates a new address. If `isDefault` is true, clears isDefault on all other
 * addresses for this user in the same transaction.
 */
export async function createAddress(input: CreateAddressInput) {
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({
        where: { userId: input.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If this is the user's first address, make it default automatically
    const count = await tx.address.count({ where: { userId: input.userId } });
    const shouldBeDefault = input.isDefault ?? count === 0;

    return tx.address.create({
      data: {
        userId: input.userId,
        label: input.label,
        fullName: input.fullName,
        phone: input.phone,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 ?? null,
        city: input.city,
        country: input.country ?? 'Syria',
        isDefault: shouldBeDefault,
      },
    });
  });
}

/**
 * Updates an existing address, with optional re-defaulting.
 * Returns null if the address doesn't belong to the user.
 */
export async function updateAddress(id: string, userId: string, input: UpdateAddressInput) {
  const address = await prisma.address.findFirst({ where: { id, userId } });
  if (!address) return null;

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.address.update({
      where: { id },
      data: {
        ...(input.label !== undefined && { label: input.label }),
        ...(input.fullName !== undefined && { fullName: input.fullName }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.addressLine1 !== undefined && { addressLine1: input.addressLine1 }),
        ...(input.addressLine2 !== undefined && { addressLine2: input.addressLine2 }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.country !== undefined && { country: input.country }),
        ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
      },
    });
  });
}

/** Deletes an address — hard delete. Returns null if not found / wrong user. */
export async function deleteAddress(id: string, userId: string) {
  const address = await prisma.address.findFirst({ where: { id, userId } });
  if (!address) return null;

  return prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id } });

    // If deleted address was default, promote the next-oldest address
    if (address.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
      if (next) {
        await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
    return address;
  });
}
