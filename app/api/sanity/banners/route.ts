import { NextResponse } from 'next/server';
import { getHomepageBanners } from '@/sanity/lib/queries';

export async function GET() {
  try {
    const banners = await getHomepageBanners();
    return NextResponse.json({ banners }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/sanity/banners]', err);
    return NextResponse.json({ error: 'Failed to fetch banners from Sanity' }, { status: 500 });
  }
}
