/**
 * GET /api/orders  — list all orders for the authenticated customer.
 * Ordered newest-first. Includes item snapshots for display.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrdersByUserId } from '@/lib/repositories/order.repository';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orders = await getOrdersByUserId(session.user.id);
  return NextResponse.json({ orders });
}
