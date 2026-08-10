import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { uploadFile } from '@/lib/storage';
import { createRateLimiter } from '@/lib/rate-limit';
import {
  validateCsrfOrigin,
  validateUploadedFile,
  getClientIp,
  MAX_UPLOAD_SIZE_BYTES,
  ALLOWED_IMAGE_MIME_TYPES,
} from '@/lib/security';

// 10 uploads per IP per minute
const uploadLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

export async function POST(req: NextRequest) {
  try {
    // 1. CSRF origin check
    const csrfError = validateCsrfOrigin(req);
    if (csrfError) return csrfError;

    // 2. Rate limit by IP
    const ip = getClientIp(req);
    const rateLimitError = await uploadLimiter.check(`upload_${ip}`);
    if (rateLimitError) return rateLimitError;

    // 3. Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 4. Parse form
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 5. Validate MIME type and size
    const fileError = validateUploadedFile(file, {
      maxBytes: MAX_UPLOAD_SIZE_BYTES,
      allowedTypes: ALLOWED_IMAGE_MIME_TYPES,
    });
    if (fileError) return fileError;

    const url = await uploadFile(file, 'custom-requests');

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[POST /api/upload]', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

