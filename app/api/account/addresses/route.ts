/**
 * GET  /api/account/addresses      — list all addresses for the authenticated user
 * POST /api/account/addresses      — create a new address
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import { createAddress, getAddressesByUserId } from '@/lib/repositories/address.repository';

const createSchema = z.object({
  label: z.enum(['HOME', 'WORK', 'OTHER']).default('HOME'),
  fullName: z.string().min(2).max(100),
  phone: z.string().min(7).max(30),
  addressLine1: z.string().min(5).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  country: z.string().min(2).max(100).optional(),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const addresses = await getAddressesByUserId(session.user.id);
  return NextResponse.json({ addresses });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const address = await createAddress({ userId: session.user.id, ...parsed.data });
  return NextResponse.json({ address }, { status: 201 });
}
