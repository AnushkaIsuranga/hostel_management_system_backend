import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoomsController } from '../../../src/rooms/rooms.controller';
import { RoomsService } from '../../../src/rooms/rooms.service';
import { createIntegrationHttpApp, IntegrationHttpContext, makeRoom } from '../../helpers';

describe('RoomsController Integration', () => {
  let ctx: IntegrationHttpContext;
  const roomsService = {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeAll(async () => {
    ctx = await createIntegrationHttpApp({
      controllers: [RoomsController],
      providers: [{ provide: RoomsService, useValue: roomsService }],
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/rooms returns room list', async () => {
    roomsService.getAll.mockResolvedValue([makeRoom()]);

    const response = await ctx.client.get('/api/rooms').expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].roomType).toBe('Single');
  });

  it('GET /api/rooms/:id returns RFC7807 for invalid UUID', async () => {
    const response = await ctx.client.get('/api/rooms/not-a-uuid').expect(400);

    expect(roomsService.getById).not.toHaveBeenCalled();
    expect(response.headers['content-type']).toContain('application/problem+json');
  });

  it('PUT /api/rooms/:id updates room', async () => {
    roomsService.update.mockResolvedValue(makeRoom({ roomType: 'Double', capacity: 2 }));

    const response = await ctx.client
      .put('/api/rooms/550e8400-e29b-41d4-a716-446655440000')
      .send({ roomType: 'Double', price: 7000, capacity: 2, isAvailable: true })
      .expect(200);

    expect(roomsService.update).toHaveBeenCalled();
    expect(response.body.roomType).toBe('Double');
  });
});
