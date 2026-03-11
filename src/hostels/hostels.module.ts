import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { HostelAmenitiesController } from './amenities/hostel-amenities.controller';
import { HostelAmenitiesService } from './amenities/hostel-amenities.service';
import { CleanupDeletedDataService } from './images/cleanup-deleted-data.service';
import { HostelImagesController } from './images/hostel-images.controller';
import { HostelImagesService } from './images/hostel-images.service';
import { LocalImageStorageService } from './images/local-image-storage.service';
import { HostelReviewsController } from './reviews/hostel-reviews.controller';
import { HostelReviewsService } from './reviews/hostel-reviews.service';
import { HostelSubscriptionsController } from './subscriptions/hostel-subscriptions.controller';
import { HostelSubscriptionsService } from './subscriptions/hostel-subscriptions.service';
import { SubscriptionMonitorService } from './subscriptions/subscription-monitor.service';
import { HostelVerificationController } from './verification/hostel-verification.controller';
import { HostelVerificationService } from './verification/hostel-verification.service';
import { HostelsController } from './hostels.controller';
import { HostelsService } from './hostels.service';
import { HostelListingsController } from './listings/hostel-listings.controller';
import { HostelListingsService } from './listings/hostel-listings.service';

@Module({
  imports: [AuthModule],
  controllers: [
    HostelsController,
    HostelListingsController,
    HostelAmenitiesController,
    HostelReviewsController,
    HostelImagesController,
    HostelVerificationController,
    HostelSubscriptionsController,
  ],
  providers: [
    HostelsService,
    HostelListingsService,
    HostelAmenitiesService,
    HostelReviewsService,
    LocalImageStorageService,
    HostelImagesService,
    CleanupDeletedDataService,
    HostelVerificationService,
    HostelSubscriptionsService,
    SubscriptionMonitorService,
  ],
  exports: [HostelsService],
})
export class HostelsModule {}
