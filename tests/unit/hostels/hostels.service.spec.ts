import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
}));

import { existsSync, readdirSync } from 'node:fs';

import { HostelStatus, HostelVerificationStatus } from '../../../src/common/enums/app.enums';
import { AppBadRequestException, AppNotFoundException } from '../../../src/common/exceptions/app-exception';
import { HostelsService } from '../../../src/hostels/hostels.service';

const makePrisma = () => ({
  hostel: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  university: {
    findFirst: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
  },
  studentPreference: {
    findFirst: vi.fn(),
  },
  amenity: {
    findMany: vi.fn(),
  },
  hostelImage: {
    updateMany: vi.fn(),
    createMany: vi.fn(),
  },
  $transaction: vi.fn(),
});

const makeHostelEntity = (overrides: Partial<any> = {}) => ({
  id: 'hostel-1',
  name: 'Sample Hostel',
  ownerId: 'owner-1',
  owner: { fullName: 'Owner', email: 'owner@test.com', phoneNumber: '0711111111' },
  isVerified: false,
  verifiedAt: null,
  verifiedByAdminId: null,
  verificationStatus: HostelVerificationStatus.None,
  description: 'Desc',
  city: 'Colombo',
  address: 'Addr',
  minPrice: 5000,
  maxPrice: 10000,
  genderPolicy: 'Any',
  latitude: 6.9,
  longitude: 79.8,
  googleMapsUrl: 'https://www.google.com/maps?q=6.9,79.8',
  status: HostelStatus.Active,
  images: [],
  rooms: [],
  reviews: [],
  hostelAmenities: [],
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: null,
  ...overrides,
});

describe('HostelsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: HostelsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new HostelsService(prisma as any);
    vi.mocked(existsSync).mockReset();
    vi.mocked(readdirSync).mockReset();
  });

  it('getAll uses fallback image paths when db images are empty', async () => {
    prisma.hostel.findMany.mockResolvedValue([makeHostelEntity()]);
    vi.mocked(existsSync)
      .mockReturnValueOnce(true)
      .mockReturnValue(false);
    vi.mocked(readdirSync).mockReturnValue(['a.webp'] as any);

    const result = await service.getAll();

    expect(result).toHaveLength(1);
    expect(result[0].images).toEqual(['/uploads/hostels/hostel-1/full/a.webp']);
  });

  it('getById throws when hostel is missing', async () => {
    prisma.hostel.findFirst.mockResolvedValue(null);

    await expect(service.getById('missing')).rejects.toThrow(AppNotFoundException);
  });

  it('getById returns fallback images when db image list is empty', async () => {
    prisma.hostel.findFirst.mockResolvedValue(makeHostelEntity());
    vi.mocked(existsSync)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    vi.mocked(readdirSync).mockReturnValue(['legacy.webp'] as any);

    const result = await service.getById('hostel-1');

    expect(result.images).toEqual(['/uploads/hostel-1/legacy.webp']);
  });

  it('search requires universityId when no preference context', async () => {
    await expect(service.search({})).rejects.toThrow(AppBadRequestException);
  });

  it('search throws when university is not found', async () => {
    prisma.university.findFirst.mockResolvedValue(null);

    await expect(service.search({ universityId: 'uni-1' })).rejects.toThrow(AppNotFoundException);
  });

  it('search rejects negative weights', async () => {
    prisma.university.findFirst.mockResolvedValue({ id: 'uni-1', latitude: 6.9, longitude: 79.8 });
    prisma.hostel.findMany.mockResolvedValue([makeHostelEntity({ reviews: [{ rating: 4 }], rooms: [{ isAvailable: true, capacity: 1 }] })]);

    await expect(
      service.search({ universityId: 'uni-1', weights: { priceWeight: -1, distanceWeight: 1, ratingWeight: 1 } }),
    ).rejects.toThrow(AppBadRequestException);
  });

  it('search rejects when all weights are zero', async () => {
    prisma.university.findFirst.mockResolvedValue({ id: 'uni-1', latitude: 6.9, longitude: 79.8 });
    prisma.hostel.findMany.mockResolvedValue([makeHostelEntity({ reviews: [{ rating: 4 }] })]);

    await expect(
      service.search({ universityId: 'uni-1', weights: { priceWeight: 0, distanceWeight: 0, ratingWeight: 0 } }),
    ).rejects.toThrow(AppBadRequestException);
  });

  it('search returns empty array when no hostels match', async () => {
    prisma.university.findFirst.mockResolvedValue({ id: 'uni-1', latitude: 6.9, longitude: 79.8 });
    prisma.hostel.findMany.mockResolvedValue([]);

    const result = await service.search({ universityId: 'uni-1' });

    expect(result).toEqual([]);
  });

  it('search applies preference context from current user profile', async () => {
    prisma.studentPreference.findFirst.mockResolvedValue({
      selectedAmenitiesJson: JSON.stringify(['Wifi']),
      universityId: 'uni-1',
      priceWeight: 1,
      distanceWeight: 1,
      ratingWeight: 1,
      minBudget: 3000,
      maxBudget: 15000,
      requiredCapacity: 2,
      isDeleted: false,
    });
    prisma.amenity.findMany.mockResolvedValue([{ id: 'amenity-1' }]);
    prisma.university.findFirst.mockResolvedValue({ id: 'uni-1', latitude: 6.9271, longitude: 79.8612, isDeleted: false });
    prisma.hostel.findMany.mockResolvedValue([
      makeHostelEntity({
        minPrice: 5000,
        latitude: 6.93,
        longitude: 79.86,
        rooms: [{ isAvailable: true, capacity: 2 }],
        reviews: [{ rating: 4 }, { rating: 5 }],
        hostelAmenities: [{ amenityId: 'amenity-1' }],
      }),
    ]);

    const result = await service.search({}, 'user-1');

    expect(result).toHaveLength(1);
    expect(result[0].hostel.id).toBe('hostel-1');
  });

  it('create validates max image limit', async () => {
    await expect(
      service.create('owner-1', {
        name: 'H',
        description: 'D',
        city: 'C',
        address: 'A',
        minPrice: 1,
        maxPrice: 2,
        genderPolicy: 'Any',
        latitude: 6.9,
        longitude: 79.8,
        status: HostelStatus.Active,
        images: new Array(9).fill('/x.jpg'),
      }),
    ).rejects.toThrow(AppBadRequestException);
  });

  it('create rejects invalid coordinates', async () => {
    await expect(
      service.create('owner-1', {
        name: 'H',
        description: 'D',
        city: 'C',
        address: 'A',
        minPrice: 1,
        maxPrice: 2,
        genderPolicy: 'Any',
        latitude: 100,
        longitude: 79.8,
        status: HostelStatus.Active,
        images: [],
      }),
    ).rejects.toThrow(AppBadRequestException);
  });

  it('create extracts coordinates from Google Maps URL query params', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'owner-1' });
    prisma.hostel.create.mockResolvedValue(makeHostelEntity({ latitude: 6.9, longitude: 79.8 }));
    prisma.hostel.findFirst.mockResolvedValue(makeHostelEntity({ latitude: 6.9, longitude: 79.8 }));

    const result = await service.create('owner-1', {
      name: 'H',
      description: 'D',
      city: 'C',
      address: 'A',
      minPrice: 1,
      maxPrice: 2,
      genderPolicy: 'Any',
      status: HostelStatus.Active,
      googleMapsUrl: 'https://www.google.com/maps?q=6.9,79.8',
      images: [],
    } as any);

    expect(prisma.hostel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          latitude: 6.9,
          longitude: 79.8,
          googleMapsUrl: 'https://www.google.com/maps?q=6.9,79.8',
        }),
      }),
    );
    expect(result.id).toBe('hostel-1');
  });

  it('create persists hostel with canonical map URL from coordinates', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'owner-1' });
    prisma.hostel.create.mockResolvedValue(makeHostelEntity());
    prisma.hostelImage.createMany.mockResolvedValue({ count: 1 });
    prisma.hostel.findFirst.mockResolvedValue(makeHostelEntity());

    const result = await service.create('owner-1', {
      name: 'H',
      description: 'D',
      city: 'C',
      address: 'A',
      minPrice: 1,
      maxPrice: 2,
      genderPolicy: 'Any',
      latitude: 6.9271,
      longitude: 79.8612,
      status: HostelStatus.Active,
      images: ['/uploads/x.jpg'],
    });

    expect(prisma.hostel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          googleMapsUrl: 'https://www.google.com/maps?q=6.9271,79.8612',
        }),
      }),
    );
    expect(result.id).toBe('hostel-1');
  });

  it('update throws when hostel not found', async () => {
    prisma.hostel.findFirst.mockResolvedValue(null);

    await expect(
      service.update('missing', {
        name: 'H',
        ownerId: 'owner-1',
        description: 'D',
        city: 'C',
        address: 'A',
        minPrice: 1,
        maxPrice: 2,
        genderPolicy: 'Any',
        latitude: 6.9,
        longitude: 79.8,
        status: HostelStatus.Active,
      }),
    ).rejects.toThrow(AppNotFoundException);
  });

  it('update replaces images inside a transaction when images are provided', async () => {
    prisma.hostel.findFirst.mockResolvedValue({ ...makeHostelEntity(), images: [makeHostelEntity().images] });
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
    prisma.hostel.update.mockResolvedValue({});
    prisma.hostelImage.updateMany.mockResolvedValue({ count: 1 });
    prisma.hostelImage.createMany.mockResolvedValue({ count: 1 });
    prisma.hostel.findFirst.mockResolvedValueOnce({ ...makeHostelEntity(), images: [] }).mockResolvedValueOnce(makeHostelEntity());

    const result = await service.update('hostel-1', {
      name: 'H2',
      ownerId: 'owner-1',
      description: 'D2',
      city: 'C2',
      address: 'A2',
      minPrice: 2,
      maxPrice: 3,
      genderPolicy: 'Any',
      latitude: 6.91,
      longitude: 79.85,
      status: HostelStatus.Active,
      images: ['/uploads/new.webp'],
    });

    expect(prisma.hostelImage.updateMany).toHaveBeenCalled();
    expect(prisma.hostelImage.createMany).toHaveBeenCalled();
    expect(result.id).toBe('hostel-1');
  });

  it('delete throws when hostel does not exist', async () => {
    prisma.hostel.findFirst.mockResolvedValue(null);

    await expect(service.delete('missing')).rejects.toThrow(AppNotFoundException);
  });

  it('delete soft deletes hostel and images in a transaction', async () => {
    prisma.hostel.findFirst.mockResolvedValue(makeHostelEntity());
    prisma.$transaction.mockResolvedValue([]);

    await service.delete('hostel-1');

    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('restore throws when hostel is already active', async () => {
    prisma.hostel.findFirst.mockResolvedValue(makeHostelEntity({ isDeleted: false }));

    await expect(service.restore('hostel-1')).rejects.toThrow(AppBadRequestException);
  });

  it('restore throws when retention window has expired', async () => {
    prisma.hostel.findFirst.mockResolvedValue(
      makeHostelEntity({
        isDeleted: true,
        deletedAt: new Date(Date.now() - 61 * 24 * 60 * 60 * 1000),
      }),
    );

    await expect(service.restore('hostel-1')).rejects.toThrow(AppBadRequestException);
  });

  it('restore reactivates hostel and deleted images', async () => {
    prisma.hostel.findFirst
      .mockResolvedValueOnce(makeHostelEntity({ isDeleted: true, deletedAt: new Date(Date.now() - 1000) }))
      .mockResolvedValueOnce(makeHostelEntity({ isDeleted: false }));
    prisma.$transaction.mockResolvedValue([]);

    const result = await service.restore('hostel-1');

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(result.id).toBe('hostel-1');
  });
});
