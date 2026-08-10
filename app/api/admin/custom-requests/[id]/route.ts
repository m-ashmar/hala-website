export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { updateCustomRequestStatus } from '@/lib/repositories/custom-request.repository';
import { CustomRequestStatus } from '@prisma/client';
import { z } from 'zod';
import { validateCsrfOrigin } from '@/lib/security';

const patchSchema = z.object({
  status: z.nativeEnum(CustomRequestStatus),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF origin check — applied to every state-changing route.
  const csrfError = validateCsrfOrigin(req);
  if (csrfError) return csrfError;

  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const updated = await updateCustomRequestStatus(id, parsed.data.status);
  return NextResponse.json({ request: updated });
}
