/**
 * POST /api/promotions/validate-coupon
 *
 * Validates a coupon code and returns the discount details.
 * Body: { code: string; orderAmount: number }
 *
 * Returns:
 *   200 { valid: true, couponId, discountType, discountValue, discountAmount, finalAmount }
 *   400 { valid: false, error: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, orderAmount } = body as { code?: string; orderAmount?: number };

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Coupon code is required.' }, { status: 400 });
    }
    if (typeof orderAmount !== 'number' || orderAmount <= 0) {
      return NextResponse.json({ valid: false, error: 'Invalid order amount.' }, { status: 400 });
    }

    const now = new Date();
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.trim().toUpperCase(),
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
    });

    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired coupon code.' }, { status: 400 });
    }

    // Check usage limit
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ valid: false, error: 'This coupon has reached its usage limit.' }, { status: 400 });
    }

    // Check minimum order amount
    const minAmount = coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0;
    if (orderAmount < minAmount) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order amount for this coupon is ${minAmount.toLocaleString()} ${process.env.NEXT_PUBLIC_CURRENCY ?? 'SYP'}.`,
      }, { status: 400 });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((orderAmount * Number(coupon.discountValue)) / 100);
    } else {
      // FIXED
      discountAmount = Math.min(Number(coupon.discountValue), orderAmount);
    }

    const finalAmount = Math.max(0, orderAmount - discountAmount);

    return NextResponse.json({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      discountAmount,
      finalAmount,
      description: coupon.description,
    });
  } catch (err) {
    console.error('[POST /api/promotions/validate-coupon]', err);
    return NextResponse.json({ valid: false, error: 'Server error. Please try again.' }, { status: 500 });
  }
}
