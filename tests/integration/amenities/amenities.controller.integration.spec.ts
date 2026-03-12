import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AmenitiesController } from '../../../src/amenities/amenities.controller';
import { AmenitiesService } from '../../../src/amenities/amenities.service';
import { createIntegrationHttpApp, IntegrationHttpContext, makeAmenity } from '../../helpers';

const makeAmenitiesServiceMock = () => ({
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('AmenitiesController Integration', () => {
  let ctx: IntegrationHttpContext;
  const amenitiesService = makeAmenitiesServiceMock();

  beforeAll(async () => {
    ctx = await createIntegrationHttpApp({
      controllers: [AmenitiesController],
      providers: [{ provide: AmenitiesService, useValue: amenitiesService }],
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/amenities returns amenity list', async () => {
    amenitiesService.getAll.mockResolvedValue([makeAmenity()]);

    const response = await ctx.client.get('/api/amenities').expect(200);

    expect(amenitiesService.getAll).toHaveBeenCalledOnce();
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('WiFi');
  });

  it('GET /api/amenities/:id returns RFC7807 for invalid UUID', async () => {
    const response = await ctx.client.get('/api/amenities/not-a-uuid').expect(400);

    expect(amenitiesService.getById).not.toHaveBeenCalled();
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body.status).toBe(400);
    expect(response.body.title).toBe('Bad Request');
    expect(String(response.body.detail)).toContain('uuid');
  });

  it('POST /api/amenities creates amenity and returns payload', async () => {
    amenitiesService.create.mockResolvedValue(makeAmenity({ id: 'amenity-2', name: 'Pool' }));

    const response = await ctx.client
      .post('/api/amenities')
      .send({ name: 'Pool' })
      .expect(201);

    expect(amenitiesService.create).toHaveBeenCalledWith({ name: 'Pool' });
    expect(response.body).toEqual(expect.objectContaining({ id: 'amenity-2', name: 'Pool' }));
  });

  it('DELETE /api/amenities/:id calls service and returns 204', async () => {
    amenitiesService.delete.mockResolvedValue(undefined);

    await ctx.client.delete('/api/amenities/550e8400-e29b-41d4-a716-446655440000').expect(204);

    expect(amenitiesService.delete).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
  });
});
