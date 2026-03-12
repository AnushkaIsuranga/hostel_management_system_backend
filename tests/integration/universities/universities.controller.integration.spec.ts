import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { UniversitiesController } from '../../../src/universities/universities.controller';
import { UniversitiesService } from '../../../src/universities/universities.service';
import { createIntegrationHttpApp, IntegrationHttpContext, makeUniversity } from '../../helpers';

describe('UniversitiesController Integration', () => {
  let ctx: IntegrationHttpContext;
  const universitiesService = {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeAll(async () => {
    ctx = await createIntegrationHttpApp({
      controllers: [UniversitiesController],
      providers: [{ provide: UniversitiesService, useValue: universitiesService }],
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/universities returns list', async () => {
    universitiesService.getAll.mockResolvedValue([makeUniversity()]);

    const response = await ctx.client.get('/api/universities').expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe('Test University');
  });

  it('GET /api/universities/:id returns RFC7807 for invalid UUID', async () => {
    const response = await ctx.client.get('/api/universities/not-a-uuid').expect(400);

    expect(universitiesService.getById).not.toHaveBeenCalled();
    expect(response.headers['content-type']).toContain('application/problem+json');
  });

  it('POST /api/universities creates a university', async () => {
    universitiesService.create.mockResolvedValue(makeUniversity({ id: 'university-2', name: 'U2' }));

    const response = await ctx.client
      .post('/api/universities')
      .send({ name: 'U2', latitude: 7.1, longitude: 80.1 })
      .expect(201);

    expect(universitiesService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'U2' }),
    );
    expect(response.body.id).toBe('university-2');
  });
});
