import { client } from './sanity/lib/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const query = `*[_type == "promotion" && defined(couponCode)] { _id, title, couponCode, discountType, discountValue, endDate, isActive }`;
  const promos = await client.fetch(query);
  
  console.log(`Found ${promos.length} promotions with coupon codes in Sanity.`);

  for (const promo of promos) {
    const codeUpper = promo.couponCode.toUpperCase();
    const data = {
      description: promo.title ?? null,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      expiresAt: promo.endDate ? new Date(promo.endDate) : null,
      isActive: promo.isActive ?? true,
    };
    
    await prisma.coupon.upsert({
      where: { code: codeUpper },
      create: { code: codeUpper, ...data },
      update: data,
    });
    console.log(`Upserted coupon: ${codeUpper}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
