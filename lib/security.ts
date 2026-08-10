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
 * Exact origin comparison.
 *
 * This was previously `candidate === a || candidate.startsWith(a)`, and the
 * prefix arm was a straightforward bypass: with `https://halahello.com`
 * allowed, an attacker origin of `https://halahello.com.evil.com` starts with
 * it and was accepted. Registering a domain that begins with the victim's is
 * trivial, so every CSRF check in the app was defeatable.
 *
 * An Origin header is always scheme://host[:port] with no path, and the
 * referer branch reduces to the same shape before comparing, so exact equality
 * is both correct and sufficient. Case is normalised because scheme and host
 * are case-insensitive.
 */
function isAllowedOrigin(candidate: string, allowed: string[]): boolean {
  const c = candidate.toLowerCase();
  return allowed.some((a) => a.toLowerCase() === c);
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
    if (!isAllowedOrigin(normalised, allowed)) {
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

    if (refererOrigin && !isAllowedOrigin(refererOrigin, allowed)) {
      return NextResponse.json(
        { error: 'Forbidden: invalid referer' },
        { status: 403 }
      );
    }
  }

  // No Origin / Referer — allow (server-to-server, mobile apps, Postman)
  return null;
}

// ── Post-login redirect validation ───────────────────────────────────────────

/**
 * Constrains a `callbackUrl` to a path on this site.
 *
 * The login page read `searchParams.get('callbackUrl')` and pushed straight to
 * it, so `/en/login?callbackUrl=https://evil.com` sent the user to an
 * arbitrary origin the moment they authenticated. That is a phishing primitive
 * rather than a cosmetic bug: the victim sees a genuine, trusted domain, signs
 * in for real, and is handed to a look-alike immediately afterwards.
 *
 * Only same-site absolute paths are accepted. Rejected are:
 *   - absolute URLs of any scheme, including `javascript:` and `data:`
 *   - protocol-relative `//evil.com`, which browsers treat as cross-origin
 *   - backslash variants (`/\evil.com`) that some parsers normalise to `//`
 *
 * @returns the path when safe, otherwise `fallback`
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = '/'
): string {
  if (!value) return fallback;

  const trimmed = value.trim();

  // Must be an absolute path on this site.
  if (!trimmed.startsWith('/')) return fallback;

  // `//host` and `/\host` are cross-origin despite the leading slash.
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return fallback;

  // Control characters can be used to smuggle past naive checks.
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return fallback;

  return trimmed;
}

// ── Uploaded-asset URL validation ────────────────────────────────────────────

/** Host suffix of Vercel Blob public URLs. */
const BLOB_HOST_SUFFIX = '.public.blob.vercel-storage.com';

/**
 * True when a URL points at our own blob storage.
 *
 * Used to constrain client-supplied image URLs (e.g. custom-request
 * attachments) to assets that actually went through the validated upload
 * endpoint. Accepting arbitrary URLs meant a submitter could embed any remote
 * content into the admin panel — a tracking pixel that reports when staff open
 * a request, or a hostile image aimed at the browser's decoder. Neither is
 * exotic, and neither needs to be possible: legitimate attachments are always
 * blob URLs returned by /api/upload.
 */
export function isOwnUploadUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  return url.hostname.toLowerCase().endsWith(BLOB_HOST_SUFFIX);
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
