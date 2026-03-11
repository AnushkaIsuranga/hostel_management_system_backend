import 'dotenv/config';

import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const usersCount = await prisma.user.count({
    where: { isDeleted: false },
  });

  if (usersCount > 0) {
    return;
  }

  const fullName = process.env.AdminCredentials__FullName;
  const email = process.env.AdminCredentials__Email;
  const password = process.env.AdminCredentials__Password;

  if (!fullName || !email || !password) {
    throw new Error('AdminCredentials__FullName, AdminCredentials__Email, and AdminCredentials__Password are required.');
  }

  await prisma.user.create({
    data: {
      fullName,
      email,
      phoneNumber: '',
      passwordHash: await argon2.hash(password),
      role: 2,
      lastActivityAt: new Date(),
      createdAt: new Date(),
      isDeleted: false,
    },
  });
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
