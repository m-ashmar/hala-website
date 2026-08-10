export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getActiveProducts } from '@/lib/repositories/product.repository';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Validate rather than cast. `as` on a query parameter is a lie: the value
    // is whatever the caller sent, and it ends up as a `startsWith` filter on
    // sanityId, so an arbitrary string silently returns an arbitrary subset
    // instead of an error.
    const raw = searchParams.get('type');
    if (raw !== null && raw !== 'hijab' && raw !== 'plexi') {
      return NextResponse.json(
        { error: 'Invalid type. Expected "hijab" or "plexi".' },
        { status: 400 }
      );
    }

    const products = await getActiveProducts(raw ?? undefined);

    return NextResponse.json({ products }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/products]', err);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
