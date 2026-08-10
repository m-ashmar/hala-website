-- ============================================================
-- Block 3: Notification outbox
-- Migration: block3_notification_outbox
-- Run manually in the Supabase SQL Editor (pooler-only connection).
-- ============================================================
--
-- Transactional emails are sent without blocking the payment, which is
-- correct — an email outage must never fail a checkout. But logging a failure
-- and moving on meant a lost confirmation was gone permanently and the
-- customer silently received nothing.
--
-- Every attempt is now recorded here instead:
--   * unique (orderId, type) makes replays idempotent — a redelivered Stripe
--     webhook cannot double-send;
--   * failures persist as FAILED with the error and an attempt count, and are
--     drained by /api/cron/retry-notifications.
--
-- Purely additive: no existing table or row is modified.

-- 1. Status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationStatus') THEN
    CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
  END IF;
END
$$;

-- 2. Outbox table
CREATE TABLE IF NOT EXISTS "NotificationLog" (
  "id"        TEXT NOT NULL,
  "orderId"   TEXT,
  "type"      TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "status"    "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "attempts"  INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "sentAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- 3. Idempotency key: one notification of a given type per order
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationLog_orderId_type_key"
  ON "NotificationLog" ("orderId", "type");

-- 4. Supporting indexes for the retry job
CREATE INDEX IF NOT EXISTS "NotificationLog_status_idx"
  ON "NotificationLog" ("status");
CREATE INDEX IF NOT EXISTS "NotificationLog_createdAt_idx"
  ON "NotificationLog" ("createdAt");

-- 5. Cascade deletes with the order
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'NotificationLog_orderId_fkey'
  ) THEN
    ALTER TABLE "NotificationLog"
      ADD CONSTRAINT "NotificationLog_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- ── Verification ────────────────────────────────────────────
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--  WHERE table_name = 'NotificationLog'
--  ORDER BY ordinal_position;
