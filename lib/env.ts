import { z } from 'zod';

/**
 * Environment validation.
 *
 * Runs at import time (pulled in by lib/prisma.ts, so effectively on any
 * server path that touches the database).
 *
 * Design note — why the production/development split:
 * every fail-open defect found in the security audit was caused by an
 * *unvalidated* variable. A missing secret silently disabled the protection
 * that depended on it (WhatsApp OTP verification, Sanity webhook signature
 * checking). Requiring those secrets in production turns "silently insecure"
 * into "refuses to boot", while keeping local development frictionless.
 */

const isProduction = process.env.NODE_ENV === 'production';

/** Required in production, optional elsewhere. */
const prodRequired = (label: string) =>
  isProduction
    ? z.string().min(1, `${label} is required in production`)
    : z.string().min(1).optional();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    // ── Core infrastructure ──────────────────────────────────────────────
    DATABASE_URL: z.string().url(),
    BLOB_READ_WRITE_TOKEN: prodRequired('BLOB_READ_WRITE_TOKEN'),

    // ── Auth ─────────────────────────────────────────────────────────────
    // NextAuth v5 reads AUTH_SECRET; v4 used NEXTAUTH_SECRET. Accept either
    // so an existing deployment isn't broken by the rename, but require at
    // least one (checked in superRefine below).
    AUTH_SECRET: z.string().min(1).optional(),
    NEXTAUTH_SECRET: z.string().min(1).optional(),
    NEXTAUTH_URL: z.string().url().optional(),

    // ── Payments ─────────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: prodRequired('STRIPE_SECRET_KEY'),
    STRIPE_WEBHOOK_SECRET: prodRequired('STRIPE_WEBHOOK_SECRET'),

    // ── CMS ──────────────────────────────────────────────────────────────
    NEXT_PUBLIC_SANITY_PROJECT_ID: prodRequired('NEXT_PUBLIC_SANITY_PROJECT_ID'),
    NEXT_PUBLIC_SANITY_DATASET: prodRequired('NEXT_PUBLIC_SANITY_DATASET'),
    // Guards the webhook that writes prices/stock/orders into Postgres.
    SANITY_WEBHOOK_SECRET: prodRequired('SANITY_WEBHOOK_SECRET'),
    SANITY_API_TOKEN: z.string().min(1).optional(),

    // ── WhatsApp OTP (authentication) ────────────────────────────────────
    WHATSAPP_API_TOKEN: prodRequired('WHATSAPP_API_TOKEN'),
    WHATSAPP_PHONE_ID: prodRequired('WHATSAPP_PHONE_ID'),
    WHATSAPP_MOCK: z.string().optional(),

    // ── Optional integrations ────────────────────────────────────────────
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1).optional(),
    SHAMCASH_API_TOKEN: z.string().min(1).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.AUTH_SECRET && !val.NEXTAUTH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_SECRET'],
        message: 'AUTH_SECRET (or legacy NEXTAUTH_SECRET) is required',
      });
    }
    // Mock OTP must never be reachable on a live deploy.
    if (val.NODE_ENV === 'production' && val.WHATSAPP_MOCK === 'true') {
      ctx.addIssue({
        code: 'custom',
        path: ['WHATSAPP_MOCK'],
        message: 'WHATSAPP_MOCK must not be enabled in production',
      });
    }
  });

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:\n', z.prettifyError(_env.error));
  throw new Error(
    'Invalid environment variables — see the list above. ' +
      'Copy .env.example and fill in the missing values.'
  );
}

export const env = _env.data;
