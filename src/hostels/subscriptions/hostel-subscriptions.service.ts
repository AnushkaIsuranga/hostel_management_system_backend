import { Injectable, Logger } from '@nestjs/common';

import { HostelVerificationStatus } from '../../common/enums/app.enums';
import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
} from '../../common/exceptions/app-exception';
import { PrismaService } from '../../prisma/prisma.service';
import { HostelSubscriptionReadDto, UpsertHostelSubscriptionDto } from './dto/hostel-subscriptions.dto';

@Injectable()
export class HostelSubscriptionsService {
  private readonly logger = new Logger(HostelSubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    hostelId: string,
    actorUserId: string,
    isAdmin: boolean,
    dto: UpsertHostelSubscriptionDto,
  ): Promise<HostelSubscriptionReadDto> {
    if (new Date(dto.expiryDate) <= new Date(dto.startDate)) {
      throw new AppBadRequestException('ExpiryDate must be greater than StartDate.', 'invalid_subscription_dates');
    }

    const hostel = await this.ensureAuthorizedHostel(hostelId, actorUserId, isAdmin);
    const now = new Date();
    const isActive = new Date(dto.expiryDate) > now;

    const existing = await this.prisma.hostelSubscription.findFirst({
      where: {
        hostelId,
        isDeleted: false,
      },
    });

    const subscription = existing
      ? await this.prisma.hostelSubscription.update({
          where: { id: existing.id },
          data: {
            startDate: new Date(dto.startDate),
            expiryDate: new Date(dto.expiryDate),
            isActive,
            updatedAt: new Date(),
            ...(new Date(dto.expiryDate) > now ? { lastReminderSentAt: null } : {}),
          },
        })
      : await this.prisma.hostelSubscription.create({
          data: {
            hostelId,
            startDate: new Date(dto.startDate),
            expiryDate: new Date(dto.expiryDate),
            isActive,
            createdAt: new Date(),
            isDeleted: false,
          },
        });

    const nextStatus = this.evaluateForSubscription(subscription);
    const hostelUpdate: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (nextStatus === HostelVerificationStatus.Expired) {
      hostelUpdate.isVerified = false;
      hostelUpdate.verifiedAt = null;
      hostelUpdate.verificationStatus = HostelVerificationStatus.Expired;
    } else if (hostel.verificationStatus === HostelVerificationStatus.Expired) {
      hostelUpdate.verificationStatus = HostelVerificationStatus.Pending;
    }

    await this.prisma.hostel.update({
      where: { id: hostelId },
      data: hostelUpdate,
    });

    return this.toReadDto(subscription);
  }

  async get(hostelId: string, actorUserId: string, isAdmin: boolean): Promise<HostelSubscriptionReadDto | null> {
    await this.ensureAuthorizedHostel(hostelId, actorUserId, isAdmin);

    const subscription = await this.prisma.hostelSubscription.findFirst({
      where: {
        hostelId,
        isDeleted: false,
      },
    });

    return subscription ? this.toReadDto(subscription) : null;
  }

  async processExpirationsAndReminders() {
    const utcNow = new Date();
    const reminderThresholdUtc = new Date(utcNow.getTime() + 3 * 24 * 60 * 60 * 1000);

    const expired = await this.prisma.hostelSubscription.findMany({
      where: {
        isDeleted: false,
        isActive: true,
        expiryDate: {
          lt: utcNow,
        },
      },
      include: {
        hostel: true,
      },
    });

    for (const subscription of expired) {
      await this.prisma.$transaction([
        this.prisma.hostelSubscription.update({
          where: { id: subscription.id },
          data: {
            isActive: false,
            updatedAt: utcNow,
          },
        }),
        this.prisma.hostel.update({
          where: { id: subscription.hostelId },
          data: {
            isVerified: false,
            verifiedAt: null,
            verificationStatus: HostelVerificationStatus.Expired,
            updatedAt: utcNow,
          },
        }),
      ]);

      await this.sendSubscriptionExpiredEmail(subscription.hostel.ownerId);
    }

    const upcoming = await this.prisma.hostelSubscription.findMany({
      where: {
        isDeleted: false,
        isActive: true,
        expiryDate: {
          gte: utcNow,
          lte: reminderThresholdUtc,
        },
      },
      include: {
        hostel: true,
      },
    });

    for (const subscription of upcoming) {
      if (!this.shouldSendReminder(subscription, utcNow, reminderThresholdUtc)) {
        continue;
      }

      await this.prisma.hostelSubscription.update({
        where: { id: subscription.id },
        data: {
          lastReminderSentAt: utcNow,
          updatedAt: utcNow,
        },
      });

      await this.sendSubscriptionExpiringSoonEmail(subscription.hostel.ownerId, subscription.expiryDate);
    }
  }

  private async ensureAuthorizedHostel(hostelId: string, actorUserId: string, isAdmin: boolean) {
    const hostel = await this.prisma.hostel.findFirst({
      where: {
        id: hostelId,
        isDeleted: false,
      },
    });

    if (!hostel) {
      throw new AppNotFoundException('Hostel not found.');
    }

    if (!isAdmin && hostel.ownerId !== actorUserId) {
      throw new AppForbiddenException('You can only manage subscription for your own hostel.', 'hostel_owner_required');
    }

    return hostel;
  }

  private evaluateForSubscription(subscription: { isActive: boolean; expiryDate: Date } | null) {
    if (!subscription) {
      return HostelVerificationStatus.None;
    }

    if (!subscription.isActive || subscription.expiryDate <= new Date()) {
      return HostelVerificationStatus.Expired;
    }

    return HostelVerificationStatus.Approved;
  }

  private shouldSendReminder(subscription: { isActive: boolean; expiryDate: Date; lastReminderSentAt: Date | null }, utcNow: Date, threshold: Date) {
    if (!subscription.isActive) {
      return false;
    }

    if (subscription.expiryDate < utcNow || subscription.expiryDate > threshold) {
      return false;
    }

    if (!subscription.lastReminderSentAt) {
      return true;
    }

    return subscription.lastReminderSentAt.toDateString() !== utcNow.toDateString();
  }

  private async sendSubscriptionExpiredEmail(ownerId: string) {
    const owner = await this.prisma.user.findFirst({
      where: {
        id: ownerId,
        isDeleted: false,
      },
      select: { email: true },
    });

    if (!owner?.email) {
      return;
    }

    this.logger.log(
      `Subscription expired email queued to ${owner.email}. Subject: Hostel verification expired. Body: Your hostel subscription expired. Renew to remain verified.`,
    );
  }

  private async sendSubscriptionExpiringSoonEmail(ownerId: string, expiryDate: Date) {
    const owner = await this.prisma.user.findFirst({
      where: {
        id: ownerId,
        isDeleted: false,
      },
      select: { email: true },
    });

    if (!owner?.email) {
      return;
    }

    this.logger.log(
      `Subscription reminder email queued to ${owner.email}. Subject: Hostel subscription expiring soon. Body: Your hostel subscription will expire on ${expiryDate.toISOString().slice(0, 10)}. Renew to remain verified.`,
    );
  }

  private toReadDto(subscription: any): HostelSubscriptionReadDto {
    return {
      id: subscription.id,
      hostelId: subscription.hostelId,
      startDate: subscription.startDate,
      expiryDate: subscription.expiryDate,
      isActive: subscription.isActive,
      lastReminderSentAt: subscription.lastReminderSentAt,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }
}
