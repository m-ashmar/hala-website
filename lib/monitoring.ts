/**
 * Error reporting.
 *
 * Production failures were previously invisible: everything went to
 * `console.error` / pino and disappeared into the platform log stream, where
 * nobody sees a failed payment webhook at 2am.
 *
 * This is a deliberately thin, provider-agnostic seam:
 *
 *   - it ALWAYS logs structurally via pino, so behaviour never depends on an
 *     external service being configured;
 *   - if MONITORING_WEBHOOK_URL is set it additionally POSTs a compact JSON
 *     payload, which works with Sentry, Slack, Discord or any HTTP collector;
 *   - reporting is fire-and-forget and fully guarded — a monitoring outage
 *     must never surface as a customer-facing failure.
 *
 * Centralising it here means adopting a full SDK later (e.g. @sentry/nextjs)
 * is a one-file change rather than an edit to every call site.
 */

import { logger } from './logger';

const WEBHOOK_URL = process.env.MONITORING_WEBHOOK_URL;
const ENVIRONMENT = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development';

/** Where the failure happened, plus anything useful for triage. */
export interface ErrorContext {
  /** Stable identifier for the failing operation, e.g. 'stripe.webhook'. */
  scope: string;
  /** Additional structured detail. Must not contain secrets or card data. */
  [key: string]: unknown;
}

/** Keys whose values are never forwarded off-box, even if a caller passes them. */
const REDACTED_KEYS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'apiKey',
  'card',
  'cvc',
]);

function sanitise(context: ErrorContext): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(context)) {
    out[k] = REDACTED_KEYS.has(k) ? '[redacted]' : v;
  }
  return out;
}

/**
 * Reports an error. Never throws, never rejects — safe to call from a catch
 * block on any critical path.
 */
export function reportError(error: unknown, context: ErrorContext): void {
  const err =
    error instanceof Error ? error : new Error(String(error));
  const safeContext = sanitise(context);

  // 1. Always log locally.
  logger.error({ err, ...safeContext }, `[${context.scope}] ${err.message}`);

  // 2. Best-effort forward.
  if (!WEBHOOK_URL) return;

  void (async () => {
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'error',
          environment: ENVIRONMENT,
          scope: context.scope,
          message: err.message,
          stack: err.stack?.slice(0, 4000),
          context: safeContext,
          timestamp: new Date().toISOString(),
        }),
        cache: 'no-store',
      });
    } catch (forwardErr) {
      // Deliberately swallowed: a monitoring outage must not cascade.
      logger.warn({ forwardErr }, '[monitoring] Failed to forward error');
    }
  })();
}

/**
 * Reports a non-error condition that still needs a human — e.g. a coupon
 * redeemed past its limit, or a payment confirmed for an unknown order.
 */
export function reportWarning(message: string, context: ErrorContext): void {
  const safeContext = sanitise(context);
  logger.warn(safeContext, `[${context.scope}] ${message}`);

  if (!WEBHOOK_URL) return;

  void (async () => {
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'warning',
          environment: ENVIRONMENT,
          scope: context.scope,
          message,
          context: safeContext,
          timestamp: new Date().toISOString(),
        }),
        cache: 'no-store',
      });
    } catch {
      /* swallowed by design */
    }
  })();
}
