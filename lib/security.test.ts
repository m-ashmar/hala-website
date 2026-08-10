import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { validateCsrfOrigin, isOwnUploadUrl } from './security';

/**
 * CSRF origin validation.
 *
 * The defect these pin: the allow-list check was
 * `candidate === a || candidate.startsWith(a)`. The prefix arm meant that with
 * `https://halahello.com` allowed, an attacker origin of
 * `https://halahello.com.evil.com` was accepted — registering a domain that
 * begins with the victim's is trivial, so every CSRF check was defeatable.
 */

const SITE = 'https://halahello.com';

function reqWith(headers: Record<string, string>) {
  return new NextRequest('https://halahello.com/api/checkout/order', {
    method: 'POST',
    headers,
  });
}

const allowed = (r: ReturnType<typeof reqWith>) => validateCsrfOrigin(r) === null;

beforeEach(() => {
  vi.stubEnv('NEXTAUTH_URL', SITE);
  // The validator short-circuits when NODE_ENV === 'test', so exercise it as
  // it actually behaves in production.
  vi.stubEnv('NODE_ENV', 'production');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Origin header', () => {
  it('accepts the exact configured origin', () => {
    expect(allowed(reqWith({ origin: SITE }))).toBe(true);
  });

  it('accepts it case-insensitively (scheme and host are case-insensitive)', () => {
    expect(allowed(reqWith({ origin: 'HTTPS://HALAHELLO.COM' }))).toBe(true);
  });

  it('REJECTS a domain that merely starts with the allowed origin', () => {
    // The original bypass.
    expect(allowed(reqWith({ origin: 'https://halahello.com.evil.com' }))).toBe(false);
  });

  it('REJECTS a look-alike suffix domain', () => {
    expect(allowed(reqWith({ origin: 'https://halahello.com.attacker.io' }))).toBe(false);
  });

  it('rejects an unrelated origin', () => {
    expect(allowed(reqWith({ origin: 'https://evil.com' }))).toBe(false);
  });

  it('rejects the same host over a different scheme', () => {
    expect(allowed(reqWith({ origin: 'http://halahello.com' }))).toBe(false);
  });

  it('rejects a different port on the same host', () => {
    expect(allowed(reqWith({ origin: 'https://halahello.com:8443' }))).toBe(false);
  });
});

describe('Referer fallback', () => {
  it('accepts a referer on the allowed origin', () => {
    expect(allowed(reqWith({ referer: `${SITE}/en/checkout` }))).toBe(true);
  });

  it('REJECTS a referer whose host merely starts with the allowed origin', () => {
    expect(allowed(reqWith({ referer: 'https://halahello.com.evil.com/en/checkout' }))).toBe(false);
  });

  it('rejects an unrelated referer', () => {
    expect(allowed(reqWith({ referer: 'https://evil.com/attack' }))).toBe(false);
  });
});

describe('no Origin and no Referer', () => {
  it('is allowed, for server-to-server and native clients', () => {
    // Browsers always send one of the two on a cross-site request, so this
    // does not weaken the browser-facing protection.
    expect(allowed(reqWith({}))).toBe(true);
  });
});

describe('isOwnUploadUrl', () => {
  it('accepts a Vercel Blob URL', () => {
    expect(
      isOwnUploadUrl('https://abc123.public.blob.vercel-storage.com/custom-requests/1-uuid.png')
    ).toBe(true);
  });

  it('rejects an arbitrary remote URL', () => {
    // Would otherwise be rendered in the admin panel — a tracking pixel that
    // reports when staff open a request, or a hostile image.
    expect(isOwnUploadUrl('https://evil.com/tracker.gif')).toBe(false);
  });

  it('rejects a look-alike host', () => {
    expect(isOwnUploadUrl('https://public.blob.vercel-storage.com.evil.com/x.png')).toBe(false);
  });

  it('rejects non-https', () => {
    expect(isOwnUploadUrl('http://abc.public.blob.vercel-storage.com/x.png')).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(isOwnUploadUrl('not-a-url')).toBe(false);
    expect(isOwnUploadUrl('')).toBe(false);
  });

  it('rejects javascript: and data: schemes', () => {
    expect(isOwnUploadUrl('javascript:alert(1)')).toBe(false);
    expect(isOwnUploadUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });
});
