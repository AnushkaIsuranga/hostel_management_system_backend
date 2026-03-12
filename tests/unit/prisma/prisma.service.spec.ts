import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../../src/prisma/prisma.service';

describe('PrismaService', () => {
  it('connects on module init', async () => {
    const service = Object.create(PrismaService.prototype) as PrismaService;
    (service as any).$connect = vi.fn().mockResolvedValue(undefined);

    await service.onModuleInit();

    expect((service as any).$connect).toHaveBeenCalledOnce();
  });

  it('disconnects on module destroy', async () => {
    const service = Object.create(PrismaService.prototype) as PrismaService;
    (service as any).$disconnect = vi.fn().mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect((service as any).$disconnect).toHaveBeenCalledOnce();
  });
});
