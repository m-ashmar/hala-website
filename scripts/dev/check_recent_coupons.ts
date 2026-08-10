import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Recent Coupons:", JSON.stringify(coupons, null, 2));
}
main().finally(() => prisma.$disconnect());
