import { PrismaClient } from '@prisma/client';
import { createClient } from 'next-sanity';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

const writeClient = createClient({
  // No hardcoded fallback: a destructive script must never be able to reach a
  // real project when the environment is unconfigured.
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '',
  dataset: 'production',
  apiVersion: '2024-03-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

/**
 * DESTRUCTIVE. Wipes ALL data from both Postgres and Sanity.
 *
 * Guarded because this script previously ran on invocation with a hardcoded
 * production project-ID fallback, so it worked even with no environment
 * configured — one stray `tsx delete_all_data.ts` would have destroyed live
 * customer orders.
 *
 * To run intentionally:
 *   CONFIRM_DELETE_ALL=yes-really-delete-everything npx tsx delete_all_data.ts
 */
const CONFIRMATION = 'yes-really-delete-everything';

function assertSafeToRun() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run: NODE_ENV=production.');
  }
  if (process.env.CONFIRM_DELETE_ALL !== CONFIRMATION) {
    throw new Error(
      'Refusing to run without explicit confirmation.\n' +
        `Set CONFIRM_DELETE_ALL="${CONFIRMATION}" if you really mean it.\n` +
        'This deletes every order, user, coupon and product in BOTH Postgres and Sanity.'
    );
  }
}

async function main() {
  assertSafeToRun();

  console.log('--- Deleting Postgres Data ---');

  try {
    // Delete in order to respect foreign keys
    await prisma.orderItem.deleteMany({});
    console.log('Deleted OrderItems');
    
    await prisma.order.deleteMany({});
    console.log('Deleted Orders');
    
    await prisma.couponUsage.deleteMany({});
    console.log('Deleted CouponUsages');
    
    await prisma.coupon.deleteMany({});
    console.log('Deleted Coupons');
    
    await prisma.wishlist.deleteMany({});
    console.log('Deleted Wishlists');
    
    await prisma.customRequest.deleteMany({});
    console.log('Deleted CustomRequests');
    
    await prisma.productSync.deleteMany({});
    console.log('Deleted ProductSyncs');
  } catch (err) {
    console.error('Failed to delete Postgres data, continuing with Sanity...', err instanceof Error ? err.message : err);
  }

  console.log('--- Deleting Sanity Data ---');
  
  const typesToDelete = [
    'product',
    'promotion',
    'coupon',
    'order',
    'homepageBanner',
    'testimonial',
    'faq',
    'customRequest'
  ];

  for (const type of typesToDelete) {
    const docs = await writeClient.fetch(`*[_type == "${type}"]{_id}`);
    console.log(`Found ${docs.length} documents of type ${type}`);
    
    if (docs.length > 0) {
      const transaction = writeClient.transaction();
      docs.forEach((doc: { _id: string }) => {
        transaction.delete(doc._id);
      });
      await transaction.commit();
      console.log(`Deleted ${docs.length} ${type} documents`);
    }
  }

  console.log('--- Finished Deleting Data ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
