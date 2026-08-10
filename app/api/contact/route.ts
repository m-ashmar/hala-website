import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { z } from 'zod';
import {
  sendContactConfirmation,
  sendContactNotificationToAdmin,
} from '@/lib/services/email.service';
import { createRateLimiter } from '@/lib/rate-limit';
import { validateCsrfOrigin, getClientIp } from '@/lib/security';

// 5 contact submissions per IP per 10 minutes
const contactLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
});

export async function POST(req: NextRequest) {
  try {
    // 1. CSRF origin check
    const csrfError = validateCsrfOrigin(req);
    if (csrfError) return csrfError;

    // 2. Rate limit by IP
    const ip = getClientIp(req);
    const rateLimitError = await contactLimiter.check(`contact_${ip}`);
    if (rateLimitError) return rateLimitError;

    // 3. Validate body
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, message } = parsed.data;

    // Send emails concurrently (don't block on admin email)
    await Promise.allSettled([
      sendContactConfirmation(name, email, message),
      sendContactNotificationToAdmin(name, email, message),
    ]);

    return NextResponse.json(
      { success: true, message: "Message received! We'll be in touch soon." },
      { status: 200 }
    );
  } catch (err) {
    console.error('[POST /api/contact]', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
