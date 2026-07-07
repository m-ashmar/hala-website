/**
 * Migration: Extend Order table with Phase 4 guest checkout + ShamCash fields.
 * Run: node prisma/migrate-order-v2.js
 *
 * Uses the pooler connection (port 6543) — direct port 5432 is blocked.
 * All ALTER TABLE operations are idempotent (IF NOT EXISTS).
 */

const { Client } = require('pg');

const SQL = `
  -- Add currency column
  ALTER TABLE "Order"
    ADD COLUMN IF NOT EXISTS "currency"      TEXT        NOT NULL DEFAULT 'SYP';

  -- Add guest checkout columns
  ALTER TABLE "Order"
    ADD COLUMN IF NOT EXISTS "customerName"  TEXT,
    ADD COLUMN IF NOT EXISTS "customerEmail" TEXT,
    ADD COLUMN IF NOT EXISTS "customerPhone" TEXT,
    ADD COLUMN IF NOT EXISTS "customerNote"  TEXT;

  -- Add payment lifecycle timestamps
  ALTER TABLE "Order"
    ADD COLUMN IF NOT EXISTS "expiresAt"     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "paidAt"        TIMESTAMPTZ;
`;

async function migrate() {
  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://postgres.wqzqcgtxjxrkoqgdnsbh:obadaraw221@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔌 Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('⚙️  Applying Order table migration...');
    await client.query(SQL);
    console.log('✅ Migration applied successfully!\n');

    // Verify columns exist
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'Order'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Order table columns after migration:');
    result.rows.forEach((row) => {
      console.log(
        `  ${row.column_name.padEnd(20)} ${row.data_type.padEnd(15)} nullable:${row.is_nullable}`
      );
    });
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
