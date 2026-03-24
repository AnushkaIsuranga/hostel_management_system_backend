import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import argon2 from 'argon2';

import { UserRole } from '../common/enums/app.enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const fullName = process.env.AdminCredentials__FullName?.trim();
    const email = process.env.AdminCredentials__Email?.trim().toLowerCase();
    const password = process.env.AdminCredentials__Password;

    if (!fullName || !email || !password) {
      this.logger.warn('Admin bootstrap skipped because AdminCredentials env values are missing.');
      return;
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser) {
      const passwordHash = await argon2.hash(password);
      await this.prisma.user.create({
        data: {
          fullName,
          email,
          phoneNumber: '',
          passwordHash,
          role: UserRole.Admin,
          lastActivityAt: new Date(),
          createdAt: new Date(),
          isDeleted: false,
        },
      });

      this.logger.log(`Bootstrap admin user created for ${email}.`);
      return;
    }

    const data: {
      fullName?: string;
      role?: number;
      isDeleted?: boolean;
      deletedAt?: Date | null;
      updatedAt?: Date;
      passwordHash?: string;
    } = {};

    if (existingUser.fullName !== fullName) {
      data.fullName = fullName;
    }

    if (existingUser.role !== UserRole.Admin) {
      data.role = UserRole.Admin;
    }

    if (existingUser.isDeleted) {
      data.isDeleted = false;
      data.deletedAt = null;
    }

    const passwordMatches = await argon2.verify(existingUser.passwordHash, password).catch(() => false);
    if (!passwordMatches) {
      data.passwordHash = await argon2.hash(password);
    }

    if (Object.keys(data).length > 0) {
      data.updatedAt = new Date();
      await this.prisma.user.update({
        where: { id: existingUser.id },
        data,
      });
      this.logger.log(`Bootstrap admin user synchronized for ${email}.`);
    }
  }
}
