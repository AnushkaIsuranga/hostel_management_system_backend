import 'dotenv/config';

import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fullName = process.env.AdminCredentials__FullName;
  const email = process.env.AdminCredentials__Email;
  const password = process.env.AdminCredentials__Password;

  if (!fullName || !email || !password) {
    throw new Error('AdminCredentials__FullName, AdminCredentials__Email, and AdminCredentials__Password are required.');
  }

  const passwordHash = await argon2.hash(password);

  await prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      passwordHash,
      role: 2,
      isDeleted: false,
      deletedAt: null,
      updatedAt: new Date(),
    },
    create: {
      fullName,
      email,
      phoneNumber: '',
      passwordHash,
      role: 2,
      lastActivityAt: new Date(),
      createdAt: new Date(),
      isDeleted: false,
    },
  });

  console.log(`Admin user seeded: ${email}`);
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
