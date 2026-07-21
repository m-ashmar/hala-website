import { NextResponse } from 'next/server';
import { getFeaturedPromotions } from '@/sanity/lib/queries';

// Cache promotions for 2 minutes — time-sensitive but not as critical as banners
export const revalidate = 120;

export async function GET() {
  try {
    const promotions = await getFeaturedPromotions();
    return NextResponse.json({ promotions }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/sanity/promotions]', err);
    return NextResponse.json({ error: 'Failed to fetch promotions from Sanity' }, { status: 500 });
  }
}
