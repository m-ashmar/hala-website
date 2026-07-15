/**
 * GET /api/orders/[id]  — get a single order with full detail.
 *
 * Scoped to the authenticated user — returns 404 for cross-user access
 * to avoid leaking that the order exists at all.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrderDetailById } from '@/lib/repositories/order.repository';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const order = await getOrderDetailById(id, session.user.id);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  return NextResponse.json({ order });
}
