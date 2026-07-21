import { NextRequest, NextResponse } from 'next/server';
import { getOrderByReferenceCode } from '@/lib/repositories/order.repository';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
    }

    const order = await getOrderByReferenceCode(code);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Return safe public fields for guest users
    return NextResponse.json({
      orderId: order.id,
      referenceCode: order.referenceCode,
      status: order.status,
      totalAmount: order.totalAmount,
      currency: (order as any).currency || 'SYP',
      createdAt: order.createdAt,
      items: order.items.map(item => ({
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
        productSync: item.productSync
      }))
    });
  } catch (error) {
    console.error('[by-reference] Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

