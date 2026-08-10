-- ============================================================
-- Block 1.2: Shipping address on orders
-- Migration: block1_shipping_address
-- Run manually in the Supabase SQL Editor (pooler-only connection).
-- ============================================================
--
-- Orders previously stored no address at all: the Address model existed with
-- a full account UI but had no relation to Order, so a paid order could not
-- be fulfilled — there was no record of where to ship it.
--
-- Stored as a SNAPSHOT rather than only a foreign key: the customer may later
-- edit or delete their saved address, and a fulfilled order must always retain
-- the address it was actually shipped to. `shippingAddressId` is kept only as
-- a convenience link back to the account record.
--
-- All columns are nullable, so this is safe on existing rows — historical
-- orders keep NULL and the admin UI shows an explicit "no address on file".

-- 1. Order — shipping destination snapshot
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "shippingAddressId"    TEXT,
  ADD COLUMN IF NOT EXISTS "shippingFullName"     TEXT,
  ADD COLUMN IF NOT EXISTS "shippingPhone"        TEXT,
  ADD COLUMN IF NOT EXISTS "shippingAddressLine1" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingAddressLine2" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingCity"         TEXT,
  ADD COLUMN IF NOT EXISTS "shippingCountry"      TEXT;

-- 2. CheckoutDraft — same snapshot, captured before the Stripe redirect so the
--    resulting order inherits exactly what the customer entered.
ALTER TABLE "CheckoutDraft"
  ADD COLUMN IF NOT EXISTS "shippingAddressId"    TEXT,
  ADD COLUMN IF NOT EXISTS "shippingFullName"     TEXT,
  ADD COLUMN IF NOT EXISTS "shippingPhone"        TEXT,
  ADD COLUMN IF NOT EXISTS "shippingAddressLine1" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingAddressLine2" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingCity"         TEXT,
  ADD COLUMN IF NOT EXISTS "shippingCountry"      TEXT;

-- ── Verification (expect 14 rows, all is_nullable = YES) ────
-- SELECT table_name, column_name, data_type, is_nullable
--   FROM information_schema.columns
--  WHERE table_name IN ('Order', 'CheckoutDraft')
--    AND column_name LIKE 'shipping%'
--  ORDER BY table_name, column_name;
