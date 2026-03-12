import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { InteractionType } from '../../../src/common/enums/app.enums';
import { InteractionEventsController } from '../../../src/interaction-events/interaction-events.controller';
import { InteractionEventsService } from '../../../src/interaction-events/interaction-events.service';
import { createIntegrationHttpApp, IntegrationHttpContext, makeInteractionEvent } from '../../helpers';

describe('InteractionEventsController Integration', () => {
  let ctx: IntegrationHttpContext;
  const interactionEventsService = {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeAll(async () => {
    ctx = await createIntegrationHttpApp({
      controllers: [InteractionEventsController],
      providers: [{ provide: InteractionEventsService, useValue: interactionEventsService }],
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/interactionevents returns event list', async () => {
    interactionEventsService.getAll.mockResolvedValue([makeInteractionEvent()]);

    const response = await ctx.client.get('/api/interactionevents').expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].eventType).toBe(InteractionType.ViewHostel);
  });

  it('POST /api/interactionevents creates event', async () => {
    interactionEventsService.create.mockResolvedValue(makeInteractionEvent({ id: 'event-2' }));

    const response = await ctx.client
      .post('/api/interactionevents')
      .send({ eventType: InteractionType.Search, sessionId: 'session-2', eventData: '{"q":"wifi"}' })
      .expect(201);

    expect(interactionEventsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'session-2' }),
    );
    expect(response.body.id).toBe('event-2');
  });

  it('DELETE /api/interactionevents/:id returns RFC7807 for invalid UUID', async () => {
    const response = await ctx.client.delete('/api/interactionevents/not-a-uuid').expect(400);

    expect(interactionEventsService.delete).not.toHaveBeenCalled();
    expect(response.headers['content-type']).toContain('application/problem+json');
  });
});
