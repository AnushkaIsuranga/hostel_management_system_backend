import { describe, expect, it, vi } from 'vitest';

import { SubscriptionMonitorService } from '../../../src/hostels/subscriptions/subscription-monitor.service';

describe('SubscriptionMonitorService', () => {
  it('run delegates to subscriptions service', async () => {
    const hostelSubscriptionsService = {
      processExpirationsAndReminders: vi.fn().mockResolvedValue(undefined),
    };
    const service = new SubscriptionMonitorService(hostelSubscriptionsService as any);

    await (service as any).run();

    expect(hostelSubscriptionsService.processExpirationsAndReminders).toHaveBeenCalledOnce();
  });

  it('onModuleDestroy clears interval when set', () => {
    const hostelSubscriptionsService = {
      processExpirationsAndReminders: vi.fn().mockResolvedValue(undefined),
    };
    const service = new SubscriptionMonitorService(hostelSubscriptionsService as any);
    const clearSpy = vi.spyOn(global, 'clearInterval');
    (service as any).interval = setInterval(() => undefined, 1000);

    service.onModuleDestroy();

    expect(clearSpy).toHaveBeenCalledOnce();
    clearSpy.mockRestore();
  });

  it('onModuleInit starts interval and triggers run immediately', () => {
    const hostelSubscriptionsService = {
      processExpirationsAndReminders: vi.fn().mockResolvedValue(undefined),
    };
    const service = new SubscriptionMonitorService(hostelSubscriptionsService as any);
    const setIntervalSpy = vi.spyOn(global, 'setInterval').mockReturnValue(1 as any);

    service.onModuleInit();

    expect(setIntervalSpy).toHaveBeenCalledOnce();
    expect(hostelSubscriptionsService.processExpirationsAndReminders).toHaveBeenCalled();

    setIntervalSpy.mockRestore();
  });

  it('run catches service errors and logs them', async () => {
    const err = new Error('boom');
    const hostelSubscriptionsService = {
      processExpirationsAndReminders: vi.fn().mockRejectedValue(err),
    };
    const service = new SubscriptionMonitorService(hostelSubscriptionsService as any);
    const loggerSpy = vi.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

    await (service as any).run();

    expect(loggerSpy).toHaveBeenCalledOnce();
    loggerSpy.mockRestore();
  });
});
