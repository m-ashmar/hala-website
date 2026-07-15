/**
 * Simple in-memory rate limiter — no external dependencies.
 *
 * Uses a Map<token, timestamps[]> and a sliding window approach.
 * Designed for Next.js API routes running in Node.js (not Edge runtime).
 *
 * NOTE: This is per-process — in a multi-instance deployment use Redis instead.
 */

import { NextResponse } from 'next/server';

type Options = {
  /** Max number of requests allowed within the window. Default: 10 */
  limit?: number;
  /** Rolling window size in milliseconds. Default: 60_000 (1 min) */
  windowMs?: number;
  /** Max unique tokens to track before evicting oldest. Default: 500 */
  maxTokens?: number;
};

type TokenEntry = { timestamps: number[]; lastSeen: number };

/**
 * Creates a stateful rate-limiter instance.
 * Call `limiter.check(req)` in each API handler.
 */
export function createRateLimiter(options?: Options) {
  const limit     = options?.limit     ?? 10;
  const windowMs  = options?.windowMs  ?? 60_000;
  const maxTokens = options?.maxTokens ?? 500;

  const store = new Map<string, TokenEntry>();

  /** Evict the oldest half of entries when the store is full. */
  const evict = () => {
    const entries = [...store.entries()].sort((a, b) => a[1].lastSeen - b[1].lastSeen);
    for (let i = 0; i < Math.floor(entries.length / 2); i++) {
      store.delete(entries[i][0]);
    }
  };

  return {
    /**
     * Checks whether `token` has exceeded the rate limit.
     * Returns a 429 NextResponse if limited, otherwise null.
     *
     * Usage:
     *   const limited = limiter.check(ip);
     *   if (limited) return limited;
     */
    check(token: string): NextResponse | null {
      const now = Date.now();
      const cutoff = now - windowMs;

      if (!store.has(token)) {
        if (store.size >= maxTokens) evict();
        store.set(token, { timestamps: [], lastSeen: now });
      }

      const entry = store.get(token)!;
      // Purge timestamps outside the current window
      entry.timestamps = entry.timestamps.filter(t => t > cutoff);
      entry.timestamps.push(now);
      entry.lastSeen = now;

      const current = entry.timestamps.length;
      const remaining = Math.max(0, limit - current);
      const isLimited = current > limit;

      if (isLimited) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit':     limit.toString(),
              'X-RateLimit-Remaining': '0',
              'Retry-After':           Math.ceil(windowMs / 1000).toString(),
            },
          }
        );
      }

      return null; // not limited
    },

    /** Returns current request count for a token (useful for testing). */
    count(token: string): number {
      const now = Date.now();
      const entry = store.get(token);
      if (!entry) return 0;
      return entry.timestamps.filter(t => t > now - windowMs).length;
    },

    /** Clears all tracked state — useful for tests. */
    reset() {
      store.clear();
    },
  };
}

// ── Shared default instance (10 req / 60 s) ───────────────────────────────────
export const defaultRateLimiter = createRateLimiter();

// ── Legacy-compat wrapper (used by older route files) ─────────────────────────
type LegacyOptions = {
  uniqueTokenPerInterval?: number;
  interval?: number;
};

/**
 * @deprecated Use `createRateLimiter()` instead.
 * Kept for backward compatibility with existing callers that use
 *   `limiter.check(limit, token)` as a promise.
 */
export default function rateLimit(options?: LegacyOptions) {
  const inner = createRateLimiter({
    limit:     options?.uniqueTokenPerInterval ?? 500,
    windowMs:  options?.interval ?? 60_000,
    maxTokens: options?.uniqueTokenPerInterval ?? 500,
  });

  return {
    check: (limit: number, token: string): Promise<void> =>
      new Promise((resolve, reject) => {
        // Override the instance limit on a per-call basis
        const overrideInner = createRateLimiter({
          limit,
          windowMs:  options?.interval ?? 60_000,
          maxTokens: options?.uniqueTokenPerInterval ?? 500,
        });
        const result = overrideInner.check(token);
        if (result) {
          reject(result);
        } else {
          resolve();
        }
      }),
  };
}
