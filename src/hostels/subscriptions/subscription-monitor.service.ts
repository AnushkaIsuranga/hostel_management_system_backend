import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { HostelSubscriptionsService } from './hostel-subscriptions.service';

@Injectable()
export class SubscriptionMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionMonitorService.name);
  private interval: NodeJS.Timeout | null = null;

  constructor(private readonly hostelSubscriptionsService: HostelSubscriptionsService) {}

  onModuleInit() {
    void this.run();
    this.interval = setInterval(() => {
      void this.run();
    }, 12 * 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private async run() {
    try {
      await this.hostelSubscriptionsService.processExpirationsAndReminders();
    } catch (error) {
      this.logger.error('Subscription monitor run failed.', error instanceof Error ? error.stack : undefined);
    }
  }
}
