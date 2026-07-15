/**
 * POST /api/admin/sync/backfill
 *
 * One-time idempotent backfill: pushes ALL existing PostgreSQL Orders and
 * Coupons into Sanity Studio using upserts (createOrReplace).
 *
 * Safe to call multiple times — every run produces the same result.
 * Existing Sanity documents are overwritten with the current Postgres data.
 *
 * Protected: ADMIN role only.
 * Rate-limited by design — intended as a one-shot operation, not a recurring job.
 *
 * Usage: POST /api/admin/sync/backfill
 * Returns: { success, synced: { orders, coupons }, failed: { orders, coupons } }
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAllOrdersForAdmin } from '@/lib/repositories/order.repository';
import { getAllCoupons } from '@/lib/repositories/coupon.repository';
import {
  syncOrderToSanity,
  syncCouponToSanity,
} from '@/lib/services/sanity-sync.service';
import { logger } from '@/lib/logger';

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  logger.info('[Backfill] Starting Postgres → Sanity backfill');

  const results = {
    orders: { synced: 0, failed: 0 },
    coupons: { synced: 0, failed: 0 },
  };

  // ── Orders ─────────────────────────────────────────────────────────────────
  try {
    const orders = await getAllOrdersForAdmin();
    logger.info({ count: orders.length }, '[Backfill] Syncing orders');

    for (const order of orders) {
      try {
        await syncOrderToSanity(order);
        results.orders.synced++;
      } catch (err) {
        results.orders.failed++;
        logger.error({ orderId: order.id, err }, '[Backfill] Order sync failed');
      }
    }
  } catch (err) {
    logger.error({ err }, '[Backfill] Failed to fetch orders from Postgres');
    return NextResponse.json(
      { error: 'Failed to fetch orders from database' },
      { status: 500 }
    );
  }

  // ── Coupons ────────────────────────────────────────────────────────────────
  try {
    const coupons = await getAllCoupons();
    logger.info({ count: coupons.length }, '[Backfill] Syncing coupons');

    for (const coupon of coupons) {
      try {
        await syncCouponToSanity(coupon);
        results.coupons.synced++;
      } catch (err) {
        results.coupons.failed++;
        logger.error({ couponId: coupon.id, err }, '[Backfill] Coupon sync failed');
      }
    }
  } catch (err) {
    logger.error({ err }, '[Backfill] Failed to fetch coupons from Postgres');
    return NextResponse.json(
      { error: 'Failed to fetch coupons from database' },
      { status: 500 }
    );
  }

  logger.info({ results }, '[Backfill] Completed');

  return NextResponse.json({
    success: results.orders.failed === 0 && results.coupons.failed === 0,
    synced: {
      orders: results.orders.synced,
      coupons: results.coupons.synced,
    },
    failed: {
      orders: results.orders.failed,
      coupons: results.coupons.failed,
    },
  });
}
