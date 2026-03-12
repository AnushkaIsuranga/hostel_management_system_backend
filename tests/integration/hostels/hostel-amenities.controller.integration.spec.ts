import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { HostelAmenitiesController } from '../../../src/hostels/amenities/hostel-amenities.controller';
import { HostelAmenitiesService } from '../../../src/hostels/amenities/hostel-amenities.service';
import { createIntegrationHttpApp, IntegrationHttpContext, makeHostelAmenityLink } from '../../helpers';

describe('HostelAmenitiesController Integration', () => {
  let ctx: IntegrationHttpContext;
  const hostelAmenitiesService = {
    getAll: vi.fn(),
    getByKey: vi.fn(),
    create: vi.fn(),
    createByNames: vi.fn(),
    delete: vi.fn(),
  };

  beforeAll(async () => {
    ctx = await createIntegrationHttpApp({
      controllers: [HostelAmenitiesController],
      providers: [{ provide: HostelAmenitiesService, useValue: hostelAmenitiesService }],
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/hostel-amenities returns all links', async () => {
    hostelAmenitiesService.getAll.mockResolvedValue([makeHostelAmenityLink()]);

    const response = await ctx.client.get('/api/hostel-amenities').expect(200);

    expect(response.body).toHaveLength(1);
  });

  it('POST /api/hostel-amenities/by-names creates links', async () => {
    hostelAmenitiesService.createByNames.mockResolvedValue([makeHostelAmenityLink()]);

    const response = await ctx.client
      .post('/api/hostel-amenities/by-names')
      .send({ hostelId: 'hostel-1', amenityNames: 'WiFi,Pool' })
      .expect(200);

    expect(hostelAmenitiesService.createByNames).toHaveBeenCalledWith(
      expect.objectContaining({ hostelId: 'hostel-1' }),
    );
    expect(response.body).toHaveLength(1);
  });

  it('DELETE /api/hostel-amenities/:hostelId/:amenityId validates UUID and returns RFC7807 on invalid values', async () => {
    const response = await ctx.client.delete('/api/hostel-amenities/not-a-uuid/also-bad').expect(400);

    expect(hostelAmenitiesService.delete).not.toHaveBeenCalled();
    expect(response.headers['content-type']).toContain('application/problem+json');
  });
});
