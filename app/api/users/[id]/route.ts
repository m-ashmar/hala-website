import { NextResponse } from 'next/server';
import { userService } from '../../../../lib/services/user.service';
import { auth } from '../../../../auth';
import { logger } from '../../../../lib/logger';
import { z } from 'zod';
import { AppError } from '../../../../lib/errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const resolvedParams = await params;
    
    // Basic Authorization
    if (!session || (session.user.id !== resolvedParams.id && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validation
    const idSchema = z.string().cuid();
    const parseResult = idSchema.safeParse(resolvedParams.id);
    
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid User ID format' }, { status: 400 });
    }

    const profile = await userService.getUserProfile(parseResult.data);
    return NextResponse.json(profile);
  } catch (error) {
    logger.error({ error }, 'Failed to get user profile');

    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
