export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { client } from '@/sanity/lib/client';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { DiscountType } from '@prisma/client';
import { validateCsrfOrigin } from '@/lib/security';

export async function POST(req: NextRequest) {
  // CSRF origin check — applied to every state-changing route.
  const csrfError = validateCsrfOrigin(req);
  if (csrfError) return csrfError;

  // Admin-only: this endpoint upserts coupon records into Postgres.
  // It previously had no authorization check at all, unlike every sibling
  // route under /api/admin.
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const query = `*[_type == "promotion" && defined(couponCode)] { 
      _id, title, couponCode, discountType, discountValue, endDate, isActive 
    }`;
    const promos = await client.fetch(query);
    
    logger.info({ count: promos.length }, '[Backfill] Found promotions with coupon codes in Sanity');

    let synced = 0;
    let failed = 0;

    for (const promo of promos) {
      if (promo.discountType !== 'PERCENTAGE' && promo.discountType !== 'FIXED') {
        continue;
      }
      
      const codeUpper = promo.couponCode.toUpperCase();
      const data = {
        description: promo.title ?? null,
        discountType: promo.discountType as DiscountType,
        discountValue: promo.discountValue,
        expiresAt: promo.endDate ? new Date(promo.endDate) : null,
        isActive: promo.isActive ?? true,
      };
      
      try {
        await prisma.coupon.upsert({
          where: { code: codeUpper },
          create: { code: codeUpper, ...data },
          update: data,
        });
        synced++;
        logger.info({ code: codeUpper }, '[Backfill] Upserted coupon from promotion');
      } catch (err) {
        failed++;
        logger.error({ code: codeUpper, err }, '[Backfill] Failed to upsert coupon');
      }
    }

    return NextResponse.json({ success: true, synced, failed });
  } catch (err) {
    logger.error({ err }, '[Backfill] Failed to fetch promotions from Sanity');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
