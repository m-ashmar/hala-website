/**
 * GET    /api/admin/coupons/[id]  — get single coupon
 * PATCH  /api/admin/coupons/[id]  — update coupon + sync to Sanity
 * DELETE /api/admin/coupons/[id]  — delete coupon + remove from Sanity
 *
 * Protected: ADMIN role only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import {
  getCouponById,
  updateCoupon,
  deleteCoupon,
} from '@/lib/repositories/coupon.repository';
import {
  syncCouponToSanity,
  deleteCouponFromSanity,
} from '@/lib/services/sanity-sync.service';
import { logger } from '@/lib/logger';

// ── Validation ────────────────────────────────────────────────────────────────

const updateCouponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric')
    .optional(),
  description: z.string().max(255).optional().nullable(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  discountValue: z.number().min(0).optional(),
  minOrderAmount: z.number().min(0).optional().nullable(),
  maxUses: z.number().int().min(1).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
});

// ── Route params type ─────────────────────────────────────────────────────────

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const coupon = await getCouponById(id);
    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }
    return NextResponse.json({ coupon });
  } catch (err) {
    logger.error({ err, id }, '[GET /api/admin/coupons/[id]]');
    return NextResponse.json({ error: 'Failed to fetch coupon' }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await getCouponById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const data = parsed.data;
    const updated = await updateCoupon(id, {
      ...data,
      expiresAt: data.expiresAt !== undefined
        ? (data.expiresAt ? new Date(data.expiresAt) : null)
        : undefined,
    });

    // Postgres → Sanity sync (fire-and-forget)
    void syncCouponToSanity(updated);

    logger.info({ id }, '[PATCH /api/admin/coupons/[id]] Coupon updated');
    return NextResponse.json({ coupon: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ err, id }, '[PATCH /api/admin/coupons/[id]]');
    if (message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A coupon with that code already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await getCouponById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    await deleteCoupon(id);

    // Postgres → Sanity: remove the document (fire-and-forget)
    void deleteCouponFromSanity(id);

    logger.info({ id }, '[DELETE /api/admin/coupons/[id]] Coupon deleted');
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ err, id }, '[DELETE /api/admin/coupons/[id]]');
    if (message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Cannot delete coupon that is referenced by existing orders' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}
