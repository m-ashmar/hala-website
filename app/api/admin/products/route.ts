export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getActiveProducts, upsertProduct } from '@/lib/repositories/product.repository';
import { z } from 'zod';
import { validateCsrfOrigin } from '@/lib/security';

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const products = await getActiveProducts();
  return NextResponse.json({ products });
}

const createSchema = z.object({
  sanityId: z.string().min(1),
  price: z.number().positive(),
  stock: z.number().int().min(0),
});

export async function POST(req: NextRequest) {
  // CSRF origin check — applied to every state-changing route.
  const csrfError = validateCsrfOrigin(req);
  if (csrfError) return csrfError;

  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.flatten() }, { status: 400 });
  }
  // Map explicitly rather than spreading parsed.data: `stock` only applies
  // when the row is created, and passing the object wholesale would let a
  // renamed field be silently dropped — TypeScript's excess-property check
  // does not apply to a variable, so it would compile and quietly do nothing.
  //
  // To adjust stock on an EXISTING product, use PATCH /api/admin/products/[id];
  // this endpoint intentionally cannot overwrite it, because doing so is what
  // let the Sanity webhook reset inventory.
  const product = await upsertProduct({
    sanityId: parsed.data.sanityId,
    price: parsed.data.price,
    initialStock: parsed.data.stock,
  });
  return NextResponse.json({ product }, { status: 201 });
}
