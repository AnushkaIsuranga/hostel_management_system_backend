import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CleanupDeletedDataService } from '../../../src/hostels/images/cleanup-deleted-data.service';

const makePrisma = () => ({
  hostel: {
    findMany: vi.fn(),
    delete: vi.fn().mockResolvedValue({}),
  },
  interactionEvent: { updateMany: vi.fn().mockResolvedValue({}) },
  hostelAmenity: { deleteMany: vi.fn().mockResolvedValue({}) },
  hostelListing: { deleteMany: vi.fn().mockResolvedValue({}) },
  room: { deleteMany: vi.fn().mockResolvedValue({}) },
  hostelReview: { deleteMany: vi.fn().mockResolvedValue({}) },
  hostelVerificationRequest: { deleteMany: vi.fn().mockResolvedValue({}) },
  hostelSubscription: { deleteMany: vi.fn().mockResolvedValue({}) },
  hostelImage: { deleteMany: vi.fn().mockResolvedValue({}) },
  $transaction: vi.fn().mockResolvedValue([]),
});

describe('CleanupDeletedDataService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: CleanupDeletedDataService;
  const configService = { cleanupIntervalHours: 24, cleanupRetentionDays: 60 };
  const hostelImagesService = { deleteImageByUrl: vi.fn().mockResolvedValue(undefined) };

  beforeEach(() => {
    prisma = makePrisma();
    service = new CleanupDeletedDataService(prisma as any, configService as any, hostelImagesService as any);
  });

  it('run exits when no deleted hostels match cutoff', async () => {
    prisma.hostel.findMany.mockResolvedValue([]);

    await (service as any).run();

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('run deletes related data for matching hostels', async () => {
    prisma.hostel.findMany.mockResolvedValue([
      {
        id: 'hostel-1',
        images: [{ imageUrl: '/uploads/hostels/hostel-1/full/a.webp' }],
      },
    ]);

    await (service as any).run();

    expect(hostelImagesService.deleteImageByUrl).toHaveBeenCalledOnce();
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('onModuleDestroy clears active interval', () => {
    const clearSpy = vi.spyOn(global, 'clearInterval');
    (service as any).interval = setInterval(() => undefined, 1000);

    service.onModuleDestroy();

    expect(clearSpy).toHaveBeenCalledOnce();
    clearSpy.mockRestore();
  });
});
