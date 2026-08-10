export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/retry-notifications
 *
 * Retries transactional emails left in FAILED state.
 *
 * Order emails are sent without blocking the payment, which is correct — an
 * email outage must never fail a checkout. But that alone meant a failed
 * confirmation was lost permanently and the customer heard nothing. Failures
 * are persisted in NotificationLog; this job drains them.
 *
 * Auth mirrors /api/cron/expire-orders: CRON_SECRET is required, and in
 * production a missing secret fails closed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { retryFailedNotifications } from '@/lib/services/order-notification.service';
import { logger } from '@/lib/logger';
import { reportError } from '@/lib/monitoring';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('[Cron/retry-notifications] CRON_SECRET is not configured — refusing to run');
      return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
    }
    logger.warn('[Cron/retry-notifications] Running without CRON_SECRET (development only)');
  } else if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { attempted, recovered } = await retryFailedNotifications();
    logger.info({ attempted, recovered }, '[Cron/retry-notifications] Run complete');
    return NextResponse.json({ attempted, recovered });
  } catch (err) {
    reportError(err, { scope: 'cron.retryNotifications' });
    return NextResponse.json({ error: 'Retry run failed' }, { status: 500 });
  }
}
