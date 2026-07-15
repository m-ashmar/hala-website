/**
 * GET  /api/admin/coupons  — list all coupons
 * POST /api/admin/coupons  — create a coupon and sync to Sanity
 *
 * Protected: ADMIN role only.
 *
 * Sync direction: Postgres → Sanity (never Sanity → Postgres from here).
 * The Sanity webhook handles the Sanity → Postgres direction for coupons
 * created or edited directly in Studio.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import {
  getAllCoupons,
  createCoupon,
} from '@/lib/repositories/coupon.repository';
import { syncCouponToSanity } from '@/lib/services/sanity-sync.service';
import { logger } from '@/lib/logger';

// ── Validation ────────────────────────────────────────────────────────────────

const createCouponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric'),
  description: z.string().max(255).optional().nullable(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().min(0),
  minOrderAmount: z.number().min(0).optional().nullable(),
  maxUses: z.number().int().min(1).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const coupons = await getAllCoupons();
    return NextResponse.json({ coupons });
  } catch (err) {
    logger.error({ err }, '[GET /api/admin/coupons]');
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const coupon = await createCoupon({
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    });

    // Postgres → Sanity sync (fire-and-forget, never re-triggers webhook)
    void syncCouponToSanity(coupon);

    logger.info({ couponId: coupon.id, code: coupon.code }, '[POST /api/admin/coupons] Coupon created');
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ err }, '[POST /api/admin/coupons]');
    if (message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A coupon with that code already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}
