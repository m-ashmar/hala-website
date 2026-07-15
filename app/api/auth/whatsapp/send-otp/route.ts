import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/services/whatsapp.service';
import { createRateLimiter } from '@/lib/rate-limit';

// 5 OTP requests per IP per minute
const otpLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const limited = otpLimiter.check(`otp_${ip}`);
    if (limited) return limited;

    const { phone } = await req.json();

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 });
    }

    // Basic E.164 validation (starts with + and contains 10-15 digits)
    const phoneRegex = /^\+[1-9]\d{9,14}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ error: 'Phone number must be in E.164 format (e.g. +963912345678)' }, { status: 400 });
    }

    const result = await whatsappService.sendOTP(phone);

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      // In mock mode the code is returned so the login UI can display it
      ...(result.mock && { mockCode: result.code }),
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
