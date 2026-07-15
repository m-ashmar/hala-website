import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await prisma.wishlist.findMany({
      where: { userId: session.user.id },
      select: { sanityProductId: true },
    });

    const productIds = items.map((item) => item.sanityProductId);
    return NextResponse.json({ productIds });
  } catch (error) {
    console.error('Wishlist GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

const toggleSchema = z.object({
  productId: z.string().min(1),
  action: z.enum(['add', 'remove']),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = toggleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { productId, action } = result.data;
    const userId = session.user.id;

    if (action === 'add') {
      await prisma.wishlist.upsert({
        where: {
          userId_sanityProductId: {
            userId,
            sanityProductId: productId,
          },
        },
        create: {
          userId,
          sanityProductId: productId,
        },
        update: {}, // Do nothing if it exists
      });
    } else {
      await prisma.wishlist.deleteMany({
        where: {
          userId,
          sanityProductId: productId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Wishlist POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
