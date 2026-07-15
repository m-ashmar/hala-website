/**
 * GET /api/promotions
 *
 * Returns all currently active promotions/coupons that are publicly visible.
 * "Active" means: isActive=true, usedCount < maxUses (if set),
 * and not past their expiresAt date.
 */

import { NextResponse } from 'next/server';
import { getActivePromotions } from '@/sanity/lib/queries';

export async function GET() {
  try {
    const promotions = await getActivePromotions();
    return NextResponse.json({ promotions }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/promotions]', err);
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 });
  }
}
