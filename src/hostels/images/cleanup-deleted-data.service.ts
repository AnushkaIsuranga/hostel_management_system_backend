import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { AppConfigService } from '../../config/app-config.service';
import { DatabaseService } from '../../database/database.service';
import { HostelImagesService } from './hostel-images.service';

@Injectable()
export class CleanupDeletedDataService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CleanupDeletedDataService.name);
  private interval: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: DatabaseService,
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

      const hostels = await this.db.hostel.findMany({
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

        await this.db.$transaction([
          this.db.interactionEvent.updateMany({
            where: { hostelId: hostel.id },
            data: { hostelId: null },
          }),
          this.db.hostelAmenity.deleteMany({
            where: { hostelId: hostel.id },
          }),
          this.db.hostelListing.deleteMany({
            where: { hostelId: hostel.id },
          }),
          this.db.room.deleteMany({
            where: { hostelId: hostel.id },
          }),
          this.db.hostelReview.deleteMany({
            where: { hostelId: hostel.id },
          }),
          this.db.hostelVerificationRequest.deleteMany({
            where: { hostelId: hostel.id },
          }),
          this.db.hostelSubscription.deleteMany({
            where: { hostelId: hostel.id },
          }),
          this.db.hostelImage.deleteMany({
            where: { hostelId: hostel.id },
          }),
          this.db.hostel.delete({
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
