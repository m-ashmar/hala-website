import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ValidatedOrderItem } from './order.repository';

export interface CreateCheckoutDraftInput {
  checkoutToken: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerNote?: string;
  items: ValidatedOrderItem[];
  couponId?: string;
  discountAmount: number;
  subtotal: number;
  totalAmount: number;
  currency: string;
  shippingAmount?: number;
  expiresAt: Date;
}

/**
 * Creates a CheckoutDraft containing the full cart snapshot before redirecting to Stripe.
 */
export async function createCheckoutDraft(input: CreateCheckoutDraftInput) {
  return prisma.checkoutDraft.create({
    data: {
      checkoutToken: input.checkoutToken,
      userId: input.userId,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      customerNote: input.customerNote,
      // Store validated items as JSON so it survives product deletions
      items: input.items as unknown as Prisma.InputJsonValue,
      couponId: input.couponId,
      discountAmount: input.discountAmount,
      subtotal: input.subtotal,
      totalAmount: input.totalAmount,
      currency: input.currency,
      shippingAmount: input.shippingAmount ?? 0,
      expiresAt: input.expiresAt,
      status: 'PENDING',
    },
  });
}

/**
 * Finds a draft by its unique token (used when coming back from Stripe webhook/return).
 */
export async function getCheckoutDraftByToken(checkoutToken: string) {
  return prisma.checkoutDraft.findUnique({
    where: { checkoutToken },
  });
}

/**
 * Updates a draft with the Stripe Session ID right after creating the session.
 */
export async function markDraftStripeSession(draftId: string, stripeSessionId: string) {
  return prisma.checkoutDraft.update({
    where: { id: draftId },
    data: { stripeSessionId },
  });
}

/**
 * Finds a draft by Stripe Session ID.
 */
export async function getCheckoutDraftBySessionId(stripeSessionId: string) {
  return prisma.checkoutDraft.findUnique({
    where: { stripeSessionId },
  });
}

/**
 * Marks a draft as COMPLETED (order successfully created).
 */
export async function markDraftCompleted(draftId: string) {
  return prisma.checkoutDraft.update({
    where: { id: draftId },
    data: { status: 'COMPLETED' },
  });
}

/**
 * Marks a draft as EXPIRED (e.g., via cleanup job).
 */
export async function markDraftExpired(draftId: string) {
  return prisma.checkoutDraft.update({
    where: { id: draftId },
    data: { status: 'EXPIRED' },
  });
}

/**
 * Marks a draft as CANCELLED (e.g., user clicked back).
 */
export async function markDraftCancelled(draftId: string) {
  return prisma.checkoutDraft.update({
    where: { id: draftId },
    data: { status: 'CANCELLED' },
  });
}
