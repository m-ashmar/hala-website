import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Recent Coupons:", coupons);

  // Test the validation API
  const res = await fetch('http://localhost:3000/api/promotions/validate-coupon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: "1231", orderAmount: 100 })
  });
  const data = await res.json();
  console.log("API Response for 50%:", data);
}

main().finally(() => prisma.$disconnect());
