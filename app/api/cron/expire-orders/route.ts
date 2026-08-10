export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/expire-orders
 *
 * Cancels PENDING orders whose payment window has elapsed.
 *
 * `getExpiredPendingOrders()` was written for a cleanup job that never
 * existed, so expired orders lingered indefinitely — cluttering the admin
 * view and leaving customers with orders that look live but cannot be paid.
 *
 * Cancelling also releases any stock the order had claimed (see cancelOrder;
 * for PENDING orders none was deducted, but the call stays correct if that
 * ever changes).
 *
 * Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. When
 * CRON_SECRET is set the header is required — the endpoint mutates order
 * state and must not be publicly triggerable. Deliberately fails CLOSED in
 * production if the secret is missing, matching the Block 0 convention.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getExpiredPendingOrders, cancelOrder } from '@/lib/repositories/order.repository';
import { logger } from '@/lib/logger';
import { reportError } from '@/lib/monitoring';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('[Cron/expire-orders] CRON_SECRET is not configured — refusing to run');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }
    logger.warn('[Cron/expire-orders] Running without CRON_SECRET (development only)');
  } else {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const expired = await getExpiredPendingOrders();

    let cancelled = 0;
    const failed: string[] = [];

    // Sequential, and one failure must not abort the rest of the batch.
    for (const order of expired) {
      try {
        await cancelOrder(order.id);
        cancelled++;
      } catch (err) {
        failed.push(order.id);
        logger.error({ err, orderId: order.id }, '[Cron/expire-orders] Failed to cancel');
      }
    }

    logger.info({ found: expired.length, cancelled, failed: failed.length }, '[Cron/expire-orders] Run complete');

    return NextResponse.json({
      found: expired.length,
      cancelled,
      failed: failed.length,
    });
  } catch (err) {
    reportError(err, { scope: 'cron.expireOrders' });
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
