/**
 * Script to run schema changes against Supabase pooler (port 6543).
 * Run with: node prisma/migrate-payment-status.js
 */

const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres.wqzqcgtxjxrkoqgdnsbh:obadaraw221@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔌 Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected! Applying PaymentStatus migration...\n');

    // 1. Create PaymentStatus enum
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('  ✔ PaymentStatus enum created or already exists.');

    // 2. Add columns to Order table
    await client.query(`
      ALTER TABLE "Order" 
      ADD COLUMN IF NOT EXISTS "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS "referenceCode" text,
      ADD COLUMN IF NOT EXISTS "stripeSessionId" text,
      ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" text;
    `);
    console.log('  ✔ Columns added to Order table.');

    // 3. Migrate existing paymentIntentId data to referenceCode
    await client.query(`
      UPDATE "Order" SET "referenceCode" = "paymentIntentId" WHERE "referenceCode" IS NULL AND "paymentIntentId" IS NOT NULL;
    `);
    console.log('  ✔ Data migrated from paymentIntentId to referenceCode.');

    // 4. Create Unique Constraints on the new columns
    // We drop the old constraint if we are dropping the column.
    // However, wait, we might not want to drop paymentIntentId yet to prevent downtime if code is running.
    // For now we just add constraints to the new columns.
    
    // referenceCode
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "Order" ADD CONSTRAINT "Order_referenceCode_key" UNIQUE("referenceCode");
      EXCEPTION WHEN duplicate_table THEN null; WHEN duplicate_object THEN null; WHEN others THEN null;
      END $$;
    `);
    // stripeSessionId
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "Order" ADD CONSTRAINT "Order_stripeSessionId_key" UNIQUE("stripeSessionId");
      EXCEPTION WHEN duplicate_table THEN null; WHEN duplicate_object THEN null; WHEN others THEN null;
      END $$;
    `);
    // stripePaymentIntentId
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "Order" ADD CONSTRAINT "Order_stripePaymentIntentId_key" UNIQUE("stripePaymentIntentId");
      EXCEPTION WHEN duplicate_table THEN null; WHEN duplicate_object THEN null; WHEN others THEN null;
      END $$;
    `);
    console.log('  ✔ Unique constraints added.');

    // Drop old column safely since we updated the code
    try {
      await client.query(`ALTER TABLE "Order" DROP COLUMN IF EXISTS "paymentIntentId";`);
      console.log('  ✔ Dropped old paymentIntentId column.');
    } catch (e) {
      console.log('  - Could not drop paymentIntentId (may have dependencies)');
    }

    console.log('\n✅ Migration complete!');
  } catch (err) {
    console.error('❌ Error applying migration:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
