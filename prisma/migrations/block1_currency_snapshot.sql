-- ============================================================
-- Block 1.1: Currency conversion snapshot
-- Migration: block1_currency_snapshot
-- Run manually in the Supabase SQL Editor (this project's
-- connection is pooler-only, so `prisma migrate` is blocked).
-- ============================================================
--
-- Context: products are priced once in SYP. Card payments settle in USD
-- using an admin-controlled rate from Sanity (Currency & Exchange Rate).
--
-- These columns record what the customer was ACTUALLY charged, plus the
-- rate in force at that moment. They are a snapshot on purpose: when the
-- admin later updates the rate, the live catalogue re-prices but existing
-- orders must keep their original value, or refunds and accounting drift.
--
-- All columns are nullable, so this is safe on existing rows:
--   * historical orders keep NULL (they predate USD charging)
--   * ShamCash orders stay NULL (charged in SYP, no conversion involved)

-- 1. Order — snapshot of the charge and the rate used
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "chargedAmount"   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "chargedCurrency" TEXT,
  ADD COLUMN IF NOT EXISTS "exchangeRate"    DOUBLE PRECISION;

-- 2. CheckoutDraft — same snapshot, captured before redirecting to Stripe
--    so the order inherits the rate that was quoted to the customer.
ALTER TABLE "CheckoutDraft"
  ADD COLUMN IF NOT EXISTS "chargedAmount"   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "chargedCurrency" TEXT,
  ADD COLUMN IF NOT EXISTS "exchangeRate"    DOUBLE PRECISION;

-- ── Verification ────────────────────────────────────────────
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--  WHERE table_name IN ('Order', 'CheckoutDraft')
--    AND column_name IN ('chargedAmount', 'chargedCurrency', 'exchangeRate')
--  ORDER BY table_name, column_name;
