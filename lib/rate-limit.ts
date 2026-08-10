/**
 * Rate limiting.
 *
 * Backed by Upstash Redis when UPSTASH_REDIS_REST_URL / _TOKEN are set,
 * falling back to a per-process in-memory store otherwise.
 *
 * Why this matters: the previous implementation was in-memory only. On
 * serverless every concurrent instance gets its own empty Map, so the
 * "5 OTP per minute" and "3 checkouts per minute" limits effectively did not
 * exist in production — an attacker simply landed on a fresh instance. The
 * limiter looked present in code review and did nothing in practice.
 *
 * The Redis path uses a fixed-window counter (INCR + EXPIRE), which is atomic
 * server-side and needs no locking. A fixed window can allow up to 2x the
 * limit across a boundary; that is an acceptable trade for abuse control and
 * is still vastly better than no shared state at all.
 *
 * Uses the REST API over fetch rather than a client library, so this adds no
 * dependency and works on both the Node and Edge runtimes.
 */

import { NextResponse } from 'next/server';

type Options = {
  /** Max number of requests allowed within the window. Default: 10 */
  limit?: number;
  /** Rolling window size in milliseconds. Default: 60_000 (1 min) */
  windowMs?: number;
  /** Max unique tokens to track in the in-memory fallback. Default: 500 */
  maxTokens?: number;
};

type TokenEntry = { timestamps: number[]; lastSeen: number };

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export function isDistributedRateLimitEnabled(): boolean {
  return !!REDIS_URL && !!REDIS_TOKEN;
}

/** Warn once at startup if we're relying on the non-distributed fallback. */
if (process.env.NODE_ENV === 'production' && !isDistributedRateLimitEnabled()) {
  console.warn(
    '[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN are not set. Falling back to ' +
      'in-memory rate limiting, which is per-process and therefore ineffective ' +
      'on serverless. Configure Upstash to enforce limits across instances.'
  );
}

/**
 * Atomically increments a fixed-window counter in Redis.
 * Returns the post-increment count, or null if Redis is unavailable.
 */
async function redisIncr(key: string, windowSeconds: number): Promise<number | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;

  try {
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      // INCR then EXPIRE (NX) — EXPIRE only applies when no TTL is set, so the
      // window start is pinned to the first request in it.
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(windowSeconds), 'NX'],
      ]),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('[rate-limit] Redis responded', res.status);
      return null;
    }

    const data = (await res.json()) as { result?: unknown }[];
    const count = Number(data?.[0]?.result);
    return Number.isFinite(count) ? count : null;
  } catch (err) {
    // Never let a limiter outage take down the route it protects.
    console.error('[rate-limit] Redis unreachable:', err);
    return null;
  }
}

function limitedResponse(limit: number, windowMs: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': '0',
        'Retry-After': Math.ceil(windowMs / 1000).toString(),
      },
    }
  );
}

/**
 * Creates a rate-limiter instance.
 *
 *   const limited = await limiter.check(ip);
 *   if (limited) return limited;
 */
export function createRateLimiter(options?: Options) {
  const limit = options?.limit ?? 10;
  const windowMs = options?.windowMs ?? 60_000;
  const maxTokens = options?.maxTokens ?? 500;
  const windowSeconds = Math.ceil(windowMs / 1000);

  // Fallback store, used only when Redis is not configured or is unreachable.
  const store = new Map<string, TokenEntry>();

  const evict = () => {
    const entries = [...store.entries()].sort((a, b) => a[1].lastSeen - b[1].lastSeen);
    for (let i = 0; i < Math.floor(entries.length / 2); i++) {
      store.delete(entries[i][0]);
    }
  };

  /** Sliding-window check against the in-memory store. */
  const checkInMemory = (token: string): boolean => {
    const now = Date.now();
    const cutoff = now - windowMs;

    if (!store.has(token)) {
      if (store.size >= maxTokens) evict();
      store.set(token, { timestamps: [], lastSeen: now });
    }

    const entry = store.get(token)!;
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    entry.timestamps.push(now);
    entry.lastSeen = now;

    return entry.timestamps.length > limit;
  };

  return {
    /**
     * Returns a 429 response if the token has exceeded its limit, else null.
     * Falls back to the in-memory store if Redis is down, so a limiter outage
     * degrades rather than failing the request.
     */
    async check(token: string): Promise<NextResponse | null> {
      const windowStart = Math.floor(Date.now() / windowMs);
      const key = `rl:${token}:${windowStart}`;

      const count = await redisIncr(key, windowSeconds);
      if (count !== null) {
        return count > limit ? limitedResponse(limit, windowMs) : null;
      }

      return checkInMemory(token) ? limitedResponse(limit, windowMs) : null;
    },

    /** Current in-memory count for a token — test helper only. */
    count(token: string): number {
      const now = Date.now();
      const entry = store.get(token);
      if (!entry) return 0;
      return entry.timestamps.filter((t) => t > now - windowMs).length;
    },

    /** Clears in-memory state — test helper only. */
    reset() {
      store.clear();
    },
  };
}

// ── Shared default instance (10 req / 60 s) ───────────────────────────────────
export const defaultRateLimiter = createRateLimiter();
