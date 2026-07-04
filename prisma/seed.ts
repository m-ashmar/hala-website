import { PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create an Admin user
  const adminEmail = 'admin@halahello.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await argon2.hash('admin1234'); // Change in production!
    await prisma.user.create({
      data: {
        name: 'Halahello Admin',
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
      },
    });
    console.log('Admin user created: admin@halahello.com / admin1234');
  } else {
    console.log('Admin user already exists.');
  }

  // Create a Customer user
  const customerEmail = 'customer@example.com';
  const existingCustomer = await prisma.user.findUnique({ where: { email: customerEmail } });

  if (!existingCustomer) {
    const passwordHash = await argon2.hash('customer1234');
    await prisma.user.create({
      data: {
        name: 'Jane Doe',
        email: customerEmail,
        passwordHash,
        role: Role.CUSTOMER,
      },
    });
    console.log('Customer user created: customer@example.com / customer1234');
  } else {
    console.log('Customer user already exists.');
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
