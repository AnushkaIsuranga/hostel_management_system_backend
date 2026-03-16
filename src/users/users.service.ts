import { Injectable } from '@nestjs/common';

import { tryParseUserRole, UserRole } from '../common/enums/app.enums';
import {
  AppBadRequestException,
  AppConflictException,
  AppForbiddenException,
  AppNotFoundException,
} from '../common/exceptions/app-exception';
import { PrismaService } from '../prisma/prisma.service';
import { AdminOverviewDto, UserCreateDto, UserReadDto, UserUpdateDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<UserReadDto[]> {
    const users = await this.prisma.user.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.toReadDto(user));
  }

  async getById(id: string): Promise<UserReadDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!user) {
      throw new AppNotFoundException('User not found.');
    }

    return this.toReadDto(user);
  }

  async getByRole(role: string): Promise<UserReadDto[]> {
    const resolvedRole = this.parseRole(role);
    const users = await this.prisma.user.findMany({
      where: {
        isDeleted: false,
        role: resolvedRole,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.toReadDto(user));
  }

  async getStats(): Promise<AdminOverviewDto> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalHostels,
      hostelsLast7Days,
      totalUsers,
      usersLast7Days,
      totalReviews,
      reviewsLast7Days,
    ] = await this.prisma.$transaction([
      this.prisma.hostel.count({
        where: { isDeleted: false },
      }),
      this.prisma.hostel.count({
        where: {
          isDeleted: false,
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.user.count({
        where: {
          isDeleted: false,
          NOT: { role: UserRole.Admin },
        },
      }),
      this.prisma.user.count({
        where: {
          isDeleted: false,
          NOT: { role: UserRole.Admin },
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.hostelReview.count({
        where: {
          isDeleted: false,
          user: {
            isDeleted: false,
            NOT: { role: UserRole.Admin },
          },
        },
      }),
      this.prisma.hostelReview.count({
        where: {
          isDeleted: false,
          createdAt: { gte: sevenDaysAgo },
          user: {
            isDeleted: false,
            NOT: { role: UserRole.Admin },
          },
        },
      }),
    ]);

    return {
      hostels: {
        totalCount: totalHostels,
        last7DaysCount: hostelsLast7Days,
      },
      users: {
        totalCount: totalUsers,
        last7DaysCount: usersLast7Days,
      },
      reviews: {
        totalCount: totalReviews,
        last7DaysCount: reviewsLast7Days,
      },
    };
  }

  async create(dto: UserCreateDto): Promise<UserReadDto> {
    try {
      const user = await this.prisma.user.create({
        data: {
          fullName: dto.fullName,
          email: dto.email,
          phoneNumber: dto.phoneNumber,
          role: dto.role,
          passwordHash: '',
          lastActivityAt: new Date(),
          createdAt: new Date(),
          isDeleted: false,
        },
      });

      return this.toReadDto(user);
    } catch {
      throw new AppConflictException('A user with the same email already exists.', 'user_email_conflict');
    }
  }

  async update(id: string, dto: UserUpdateDto): Promise<UserReadDto> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingUser) {
      throw new AppNotFoundException('User not found.');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        role: dto.role,
        updatedAt: new Date(),
      },
    });

    return this.toReadDto(user);
  }

  async delete(id: string, requestingUserId: string, isAdmin: boolean) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        isDeleted: false,
        NOT: {
          role: UserRole.Admin,
        },
      },
    });

    if (!user) {
      throw new AppNotFoundException('User not found or cannot be deleted.');
    }

    if (!isAdmin && user.id !== requestingUserId) {
      throw new AppForbiddenException('You can only delete your own profile.');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  private parseRole(rawRole: string): UserRole {
    const parsedRole = tryParseUserRole(rawRole);
    if (parsedRole !== null) {
      return parsedRole;
    }

    throw new AppBadRequestException('Invalid role. Use Student, Owner, Admin or 0, 1, 2.', 'invalid_role');
  }

  private toReadDto(user: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    role: number;
    createdAt: Date;
    updatedAt: Date | null;
  }): UserReadDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role as UserRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
