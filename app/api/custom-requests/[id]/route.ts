import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const request = await prisma.customRequest.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            referenceCode: true,
          }
        }
      }
    });

    if (!request) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Ensure the request belongs to the authenticated user
    if (request.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ request });
  } catch (error) {
    console.error(`[GET /api/custom-requests/[id]]`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
