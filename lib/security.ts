/**
 * lib/security.ts
 *
 * Shared security utilities:
 *  - CSRF origin validation
 *  - Allowed MIME types / max sizes for file uploads
 *  - IP extraction helper
 */

import { NextRequest, NextResponse } from 'next/server';

// ── CSRF Origin Validation ────────────────────────────────────────────────────

/**
 * Returns the list of allowed origins derived from NEXTAUTH_URL.
 * Includes localhost variants for development.
 */
function getAllowedOrigins(): string[] {
  const origins = new Set<string>();

  // Primary: NEXTAUTH_URL (e.g. https://yourdomain.com)
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (nextAuthUrl) origins.add(nextAuthUrl.replace(/\/$/, ''));

  // Secondary: explicit site URL override
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) origins.add(siteUrl.replace(/\/$/, ''));

  // Vercel automatic deployment URL (e.g. hala-website.vercel.app)
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) origins.add(`https://${vercelUrl.replace(/\/$/, '')}`);

  // Always allow localhost in development
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }

  // Fallback: if nothing is configured, allow localhost
  if (origins.size === 0) {
    origins.add('http://localhost:3000');
  }

  return Array.from(origins);
}

/**
 * Validates the Origin/Referer header against the allowed origins.
 * Returns a 403 NextResponse if the origin is invalid, otherwise null.
 *
 * Usage:
 *   const csrfError = validateCsrfOrigin(req);
 *   if (csrfError) return csrfError;
 */
export function validateCsrfOrigin(req: NextRequest): NextResponse | null {
  // Skip validation in test environments
  if (process.env.NODE_ENV === 'test') return null;

  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  const allowed = getAllowedOrigins();

  // Check Origin header first (present in CORS / same-site fetch)
  if (origin) {
    const normalised = origin.replace(/\/$/, '');
    if (!allowed.some((a) => normalised === a || normalised.startsWith(a))) {
      return NextResponse.json(
        { error: 'Forbidden: invalid origin' },
        { status: 403 }
      );
    }
    return null; // Origin is valid
  }

  // Fallback: check Referer header (sent by browsers for form posts)
  if (referer) {
    const refererOrigin = (() => {
      try {
        const u = new URL(referer);
        return `${u.protocol}//${u.host}`;
      } catch {
        return null;
      }
    })();

    if (
      refererOrigin &&
      !allowed.some((a) => refererOrigin === a || refererOrigin.startsWith(a))
    ) {
      return NextResponse.json(
        { error: 'Forbidden: invalid referer' },
        { status: 403 }
      );
    }
  }

  // No Origin / Referer — allow (server-to-server, mobile apps, Postman)
  return null;
}

// ── File Upload Validation ───────────────────────────────────────────────────

/** Maximum file size allowed for customer uploads (5 MB). */
export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Maximum file size for admin uploads (20 MB). */
export const MAX_ADMIN_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/** MIME types accepted for customer image uploads. */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

/**
 * Validates an uploaded File object.
 * Returns a 400 NextResponse on failure, otherwise null.
 */
export function validateUploadedFile(
  file: File,
  options?: {
    maxBytes?: number;
    allowedTypes?: readonly string[];
  }
): NextResponse | null {
  const maxBytes = options?.maxBytes ?? MAX_UPLOAD_SIZE_BYTES;
  const allowedTypes = options?.allowedTypes ?? ALLOWED_IMAGE_MIME_TYPES;

  if (!allowedTypes.includes(file.type as AllowedImageMimeType)) {
    return NextResponse.json(
      {
        error: `Invalid file type "${file.type}". Allowed: ${allowedTypes.join(', ')}`,
      },
      { status: 400 }
    );
  }

  if (file.size > maxBytes) {
    const mb = (maxBytes / 1024 / 1024).toFixed(0);
    return NextResponse.json(
      { error: `File too large. Maximum size is ${mb} MB.` },
      { status: 400 }
    );
  }

  return null; // Valid
}

// ── IP Extraction ─────────────────────────────────────────────────────────────

/**
 * Extracts the real client IP from common proxy headers.
 * Falls back to 'unknown' if unavailable.
 */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
