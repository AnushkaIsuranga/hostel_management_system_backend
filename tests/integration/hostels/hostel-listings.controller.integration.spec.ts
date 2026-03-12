import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ListingStatus } from '../../../src/common/enums/app.enums';
import { AppNotFoundException } from '../../../src/common/exceptions/app-exception';
import { HostelListingsController } from '../../../src/hostels/listings/hostel-listings.controller';
import { HostelListingsService } from '../../../src/hostels/listings/hostel-listings.service';
import {
  createIntegrationHttpApp,
  IntegrationHttpContext,
  makeHostelListing,
} from '../../helpers';

const makeHostelListingsServiceMock = () => ({
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('HostelListingsController Integration', () => {
  let ctx: IntegrationHttpContext;
  const hostelListingsService = makeHostelListingsServiceMock();

  beforeAll(async () => {
    ctx = await createIntegrationHttpApp({
      controllers: [HostelListingsController],
      providers: [{ provide: HostelListingsService, useValue: hostelListingsService }],
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/hostellistings returns listing collection', async () => {
    hostelListingsService.getAll.mockResolvedValue([makeHostelListing()]);

    const response = await ctx.client.get('/api/hostellistings').expect(200);

    expect(hostelListingsService.getAll).toHaveBeenCalledOnce();
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toEqual(expect.objectContaining({ hostelId: 'hostel-1' }));
  });

  it('GET /api/hostellistings/:id returns RFC7807 for invalid UUID', async () => {
    const response = await ctx.client.get('/api/hostellistings/not-a-uuid').expect(400);

    expect(hostelListingsService.getById).not.toHaveBeenCalled();
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 400,
        title: 'Bad Request',
      }),
    );
    expect(String(response.body.detail)).toContain('uuid');
  });

  it('GET /api/hostellistings/:id returns RFC7807 when listing is missing', async () => {
    hostelListingsService.getById.mockRejectedValue(new AppNotFoundException('Listing not found.'));

    const response = await ctx.client
      .get('/api/hostellistings/550e8400-e29b-41d4-a716-446655440000')
      .expect(404);

    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 404,
        title: 'Not Found',
        detail: 'Listing not found.',
      }),
    );
  });

  it('POST /api/hostellistings creates listing and returns payload', async () => {
    hostelListingsService.create.mockResolvedValue(makeHostelListing({ id: 'listing-2' }));

    const response = await ctx.client
      .post('/api/hostellistings')
      .send({ hostelId: 'hostel-1', ownerUserId: 'user-1', status: ListingStatus.Pending })
      .expect(201);

    expect(hostelListingsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        hostelId: 'hostel-1',
        ownerUserId: 'user-1',
        status: ListingStatus.Pending,
      }),
    );
    expect(response.body.id).toBe('listing-2');
  });

  it('PUT /api/hostellistings/:id updates listing status', async () => {
    hostelListingsService.update.mockResolvedValue(makeHostelListing({ status: ListingStatus.Approved }));

    const response = await ctx.client
      .put('/api/hostellistings/550e8400-e29b-41d4-a716-446655440000')
      .send({ status: ListingStatus.Approved })
      .expect(200);

    expect(hostelListingsService.update).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      expect.objectContaining({ status: ListingStatus.Approved }),
    );
    expect(response.body.status).toBe(ListingStatus.Approved);
  });

  it('DELETE /api/hostellistings/:id delegates delete and returns 204', async () => {
    hostelListingsService.delete.mockResolvedValue(undefined);

    await ctx.client.delete('/api/hostellistings/550e8400-e29b-41d4-a716-446655440000').expect(204);

    expect(hostelListingsService.delete).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
  });
});
