/**
 * GET    /api/account/addresses/[id]  — get single address
 * PATCH  /api/account/addresses/[id]  — update address
 * DELETE /api/account/addresses/[id]  — delete address
 *
 * All operations are scoped to the authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import {
  getAddressById,
  updateAddress,
  deleteAddress,
} from '@/lib/repositories/address.repository';

const patchSchema = z.object({
  label: z.enum(['HOME', 'WORK', 'OTHER']).optional(),
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().min(7).max(30).optional(),
  addressLine1: z.string().min(5).max(200).optional(),
  addressLine2: z.string().max(200).nullable().optional(),
  city: z.string().min(2).max(100).optional(),
  country: z.string().min(2).max(100).optional(),
  isDefault: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const address = await getAddressById(id, session.user.id);
  if (!address) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ address });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { id } = await params;
  // Convert null addressLine2 to undefined so the repo function is happy
  const input = { ...parsed.data, addressLine2: parsed.data.addressLine2 ?? undefined };
  const address = await updateAddress(id, session.user.id, input);
  if (!address) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ address });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteAddress(id, session.user.id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
