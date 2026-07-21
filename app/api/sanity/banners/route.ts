import { NextResponse } from 'next/server';
import { getHomepageBanners } from '@/sanity/lib/queries';

// Cache banners for 60 seconds — they change more often than other content
export const revalidate = 60;

export async function GET() {
  try {
    const banners = await getHomepageBanners();
    return NextResponse.json({ banners }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/sanity/banners]', err);
    return NextResponse.json({ error: 'Failed to fetch banners from Sanity' }, { status: 500 });
  }
}
