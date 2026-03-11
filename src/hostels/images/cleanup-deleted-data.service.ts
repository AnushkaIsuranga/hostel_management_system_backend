import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { HostelImagesService } from './hostel-images.service';

@Injectable()
export class CleanupDeletedDataService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CleanupDeletedDataService.name);
  private interval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: AppConfigService,
    private readonly hostelImagesService: HostelImagesService,
  ) {}

  onModuleInit() {
    void this.run();
    const intervalMs = Math.max(1, this.configService.cleanupIntervalHours) * 60 * 60 * 1000;
    this.interval = setInterval(() => {
      void this.run();
    }, intervalMs);
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private async run() {
    try {
      const retentionMs = Math.max(1, this.configService.cleanupRetentionDays) * 24 * 60 * 60 * 1000;
      const cutoff = new Date(Date.now() - retentionMs);

      const hostels = await this.prisma.hostel.findMany({
        where: {
          isDeleted: true,
          deletedAt: {
            lte: cutoff,
          },
        },
        include: {
          images: true,
        },
      });

      if (!hostels.length) {
        return;
      }

      for (const hostel of hostels) {
        for (const image of hostel.images) {
          if (image.imageUrl) {
            await this.hostelImagesService.deleteImageByUrl(image.imageUrl);
          }
        }

        await this.prisma.$transaction([
          this.prisma.interactionEvent.updateMany({
            where: { hostelId: hostel.id },
            data: { hostelId: null },
          }),
          this.prisma.hostelAmenity.deleteMany({
            where: { hostelId: hostel.id },
          }),
          this.prisma.hostelListing.deleteMany({
            where: { hostelId: hostel.id },
          }),
          this.prisma.room.deleteMany({
            where: { hostelId: hostel.id },
          }),
          this.prisma.hostelReview.deleteMany({
            where: { hostelId: hostel.id },
          }),
          this.prisma.hostelVerificationRequest.deleteMany({
            where: { hostelId: hostel.id },
          }),
          this.prisma.hostelSubscription.deleteMany({
            where: { hostelId: hostel.id },
          }),
          this.prisma.hostelImage.deleteMany({
            where: { hostelId: hostel.id },
          }),
          this.prisma.hostel.delete({
            where: { id: hostel.id },
          }),
        ]);
      }

      this.logger.log(`Cleaned up ${hostels.length} deleted hostels older than retention window.`);
    } catch (error) {
      this.logger.error('Cleanup deleted data run failed.', error instanceof Error ? error.stack : undefined);
    }
  }
}
