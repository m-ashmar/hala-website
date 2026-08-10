/**
 * POST /api/auth/whatsapp/send-otp
 *
 * Sends a WhatsApp OTP to the provided phone number.
 *
 * Security:
 *  - CSRF origin validation
 *  - Rate-limited: 5 OTP requests per IP per minute
 *  - Zod validation on the phone number
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { z } from 'zod';
import { whatsappService } from '@/lib/services/whatsapp.service';
import { createRateLimiter } from '@/lib/rate-limit';
import { validateCsrfOrigin, getClientIp } from '@/lib/security';

// 5 OTP requests per IP per minute
const otpLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

const sendOtpSchema = z.object({
  phone: z
    .string()
    .regex(
      /^\+[1-9]\d{9,14}$/,
      'Phone number must be in E.164 format (e.g. +963912345678)'
    ),
});

export async function POST(req: NextRequest) {
  try {
    // 1. CSRF origin check
    const csrfError = validateCsrfOrigin(req);
    if (csrfError) return csrfError;

    // 2. Rate limit by IP
    const ip = getClientIp(req);
    const rateLimitError = await otpLimiter.check(`otp_${ip}`);
    if (rateLimitError) return rateLimitError;

    // 3. Validate body
    const body = await req.json();
    const parsed = sendOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { phone } = parsed.data;
    const result = await whatsappService.sendOTP(phone);

    // The code is only ever surfaced outside production. isMockMode() already
    // refuses to engage in production, but this is a second, independent gate
    // so the OTP can never be read off the API response on a live deploy.
    const exposeCode = result.mock && process.env.NODE_ENV !== 'production';

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      ...(exposeCode && { mockCode: result.code }),
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
