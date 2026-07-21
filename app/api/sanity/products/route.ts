import { NextResponse } from 'next/server';
import { getAllProducts } from '@/sanity/lib/queries';

// Cache product listings for 5 minutes
export const revalidate = 300;

export async function GET() {
  try {
    const products = await getAllProducts();
    return NextResponse.json({ products }, { status: 200 });
  } catch (err) {
    console.error('[GET /api/sanity/products]', err);
    return NextResponse.json({ error: 'Failed to fetch products from Sanity' }, { status: 500 });
  }
}
