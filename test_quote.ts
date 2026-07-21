import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const req = await prisma.customRequest.update({
    where: { id: 'cmruocxxl0001six8sdo5xhnj' },
    data: {
      status: 'QUOTED',
      quotePrice: 150000,
      currency: 'SYP',
      adminNotes: 'This is a beautiful request! We can do it in rose gold. The price is final.',
      estimatedDays: 5
    }
  });
  console.log('Updated Custom Request successfully:', req);
}

main().catch(console.error).finally(() => prisma.$disconnect());
