import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppBadRequestException, AppNotFoundException } from '../../../src/common/exceptions/app-exception';
import { StudentPreferencesService } from '../../../src/student-preferences/student-preferences.service';

const makePrisma = () => ({
  studentPreference: {
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  university: {
    findFirst: vi.fn(),
  },
  amenity: {
    findMany: vi.fn(),
  },
});

const makePreference = (overrides: Partial<any> = {}) => ({
  id: 'pref-1',
  userId: 'user-1',
  universityId: 'university-1',
  minBudget: 10000,
  maxBudget: 30000,
  requiredCapacity: 1,
  selectedAmenitiesJson: '["WiFi"]',
  priorityOrderJson: '["price","distance","rating"]',
  priceWeight: 0.5,
  distanceWeight: 0.3,
  ratingWeight: 0.2,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  isDeleted: false,
  ...overrides,
});

describe('StudentPreferencesService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: StudentPreferencesService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new StudentPreferencesService(prisma as any);
  });

  it('getMine throws when preferences do not exist', async () => {
    prisma.studentPreference.findFirst.mockResolvedValue(null);

    await expect(service.getMine('user-1')).rejects.toThrow(AppNotFoundException);
  });

  it('getMine returns mapped DTO', async () => {
    prisma.studentPreference.findFirst.mockResolvedValue(makePreference());

    const result = await service.getMine('user-1');

    expect(result.userId).toBe('user-1');
    expect(result.selectedAmenities).toEqual(['WiFi']);
    expect(result.weights.price).toBe(0.5);
  });

  it('upsertMine validates university presence', async () => {
    await expect(service.upsertMine('user-1', { universityId: '' } as any)).rejects.toThrow(AppBadRequestException);
  });

  it('upsertMine rejects invalid budgets', async () => {
    await expect(
      service.upsertMine('user-1', { universityId: 'u', minBudget: 5000, maxBudget: 1000 } as any),
    ).rejects.toThrow(AppBadRequestException);
  });

  it('upsertMine rejects invalid amenities', async () => {
    prisma.university.findFirst.mockResolvedValue({ id: 'university-1' });
    prisma.amenity.findMany.mockResolvedValue([]);

    await expect(
      service.upsertMine('user-1', { universityId: 'university-1', selectedAmenities: ['WiFi'] }),
    ).rejects.toThrow(AppBadRequestException);
  });

  it('upsertMine creates when preference is missing', async () => {
    prisma.university.findFirst.mockResolvedValue({ id: 'university-1' });
    prisma.amenity.findMany.mockResolvedValue([{ id: 'amenity-1' }]);
    prisma.studentPreference.findFirst.mockResolvedValue(null);
    prisma.studentPreference.create.mockResolvedValue(makePreference());

    const result = await service.upsertMine('user-1', {
      universityId: 'university-1',
      selectedAmenities: ['WiFi'],
      priorityOrder: ['price', 'distance', 'rating'],
      weights: { price: 5, distance: 3, rating: 2 },
    });

    expect(prisma.studentPreference.create).toHaveBeenCalledOnce();
    expect(result.userId).toBe('user-1');
    expect(result.weights.price).toBeCloseTo(0.5);
  });

  it('upsertMine updates existing preference', async () => {
    prisma.university.findFirst.mockResolvedValue({ id: 'university-1' });
    prisma.amenity.findMany.mockResolvedValue([{ id: 'amenity-1' }]);
    prisma.studentPreference.findFirst.mockResolvedValue(makePreference());
    prisma.studentPreference.update.mockResolvedValue(makePreference({ minBudget: 12000 }));

    const result = await service.upsertMine('user-1', {
      universityId: 'university-1',
      minBudget: 12000,
      selectedAmenities: ['WiFi'],
    });

    expect(prisma.studentPreference.update).toHaveBeenCalledOnce();
    expect(result.minBudget).toBe(12000);
  });
});
