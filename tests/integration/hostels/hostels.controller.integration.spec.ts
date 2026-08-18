import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { HostelStatus, HostelVerificationStatus, UserRole } from '../../../src/common/enums/app.enums';
import { HostelsController } from '../../../src/hostels/hostels.controller';
import { HostelsService } from '../../../src/hostels/hostels.service';
import { createIntegrationHttpApp, IntegrationHttpContext, makeHostel } from '../../helpers';

describe('HostelsController Integration', () => {
  let ctx: IntegrationHttpContext;
  const hostelsService = {
    getAll: vi.fn(),
    getById: vi.fn(),
    search: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    restore: vi.fn(),
  };

  beforeAll(async () => {
    ctx = await createIntegrationHttpApp({
      controllers: [HostelsController],
      providers: [{ provide: HostelsService, useValue: hostelsService }],
      currentUser: { userId: 'user-1', role: UserRole.Student },
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/hostels returns hostels', async () => {
    hostelsService.getAll.mockResolvedValue([
      {
        ...makeHostel(),
        ownerName: 'Owner',
        ownerEmail: 'owner@test.com',
        ownerPhoneNumber: '0711111111',
        description: 'Desc',
        city: 'Colombo',
        address: 'Address',
        minPrice: 5000,
        maxPrice: 10000,
        genderPolicy: 'Any',
        latitude: 6.9,
        longitude: 79.8,
        googleMapsUrl: '',
        status: HostelStatus.Active,
        images: [],
      },
    ]);

    const response = await ctx.client.get('/api/hostels').expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe('hostel-1');
  });

  it('POST /api/hostels/search forwards optional current user id', async () => {
    hostelsService.search.mockResolvedValue([{ hostel: { id: 'hostel-1' }, distanceKm: 1.2, averageRating: 4.5, score: 0.9 }]);

    await ctx.client.post('/api/hostels/search').send({ minBudget: 5000, maxBudget: 9000 }).expect(200);

    expect(hostelsService.search).toHaveBeenCalledWith(
      expect.objectContaining({ minBudget: 5000 }),
      'user-1',
    );
  });

  it('POST /api/hostels/:id/restore restores hostel', async () => {
    hostelsService.restore.mockResolvedValue({
      ...makeHostel({ verificationStatus: HostelVerificationStatus.None }),
      ownerName: 'Owner',
      ownerEmail: 'owner@test.com',
      ownerPhoneNumber: '0711111111',
      description: 'Desc',
      city: 'Colombo',
      address: 'Address',
      minPrice: 5000,
      maxPrice: 10000,
      genderPolicy: 'Any',
      latitude: 6.9,
      longitude: 79.8,
      googleMapsUrl: '',
      status: HostelStatus.Active,
      images: [],
    });

    const response = await ctx.client.post('/api/hostels/550e8400-e29b-41d4-a716-446655440000/restore').expect(200);

    expect(hostelsService.restore).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    expect(response.body.id).toBe('hostel-1');
  });
});
