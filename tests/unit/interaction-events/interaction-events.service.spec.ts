import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InteractionType } from '../../../src/common/enums/app.enums';
import { AppNotFoundException } from '../../../src/common/exceptions/app-exception';
import { InteractionEventsService } from '../../../src/interaction-events/interaction-events.service';

const makePrisma = () => ({
  interactionEvent: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
});

const makeEvent = (overrides: Partial<any> = {}) => ({
  id: 'event-1',
  userId: 'user-1',
  hostelId: 'hostel-1',
  eventType: InteractionType.ViewHostel,
  eventData: '{"a":1}',
  sessionId: 'session-1',
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: null,
  isDeleted: false,
  ...overrides,
});

describe('InteractionEventsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: InteractionEventsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new InteractionEventsService(prisma as any);
  });

  it('getAll returns mapped DTO list', async () => {
    prisma.interactionEvent.findMany.mockResolvedValue([makeEvent()]);

    const result = await service.getAll();

    expect(result).toHaveLength(1);
    expect(result[0].eventType).toBe(InteractionType.ViewHostel);
  });

  it('getById throws when missing', async () => {
    prisma.interactionEvent.findFirst.mockResolvedValue(null);

    await expect(service.getById('missing')).rejects.toThrow(AppNotFoundException);
  });

  it('getById returns mapped dto when found', async () => {
    prisma.interactionEvent.findFirst.mockResolvedValue(makeEvent());

    const result = await service.getById('event-1');

    expect(result.id).toBe('event-1');
  });

  it('create persists nullable fields as null', async () => {
    prisma.interactionEvent.create.mockResolvedValue(makeEvent({ userId: null, hostelId: null, eventData: null }));

    const result = await service.create({
      eventType: InteractionType.Search,
      sessionId: 'session-x',
    });

    expect(prisma.interactionEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: null,
          hostelId: null,
          eventData: null,
        }),
      }),
    );
    expect(result.sessionId).toBe('session-1');
  });

  it('update throws when missing', async () => {
    prisma.interactionEvent.findFirst.mockResolvedValue(null);

    await expect(
      service.update('missing', {
        eventType: InteractionType.FilterApply,
        sessionId: 's',
      }),
    ).rejects.toThrow(AppNotFoundException);
  });

  it('update persists provided values', async () => {
    prisma.interactionEvent.findFirst.mockResolvedValue(makeEvent());
    prisma.interactionEvent.update.mockResolvedValue(
      makeEvent({
        userId: 'user-2',
        hostelId: 'hostel-2',
        eventData: '{"x":2}',
        eventType: InteractionType.ContactOwner,
      }),
    );

    const result = await service.update('event-1', {
      userId: 'user-2',
      hostelId: 'hostel-2',
      eventType: InteractionType.ContactOwner,
      eventData: '{"x":2}',
      sessionId: 'session-2',
    });

    expect(prisma.interactionEvent.update).toHaveBeenCalled();
    expect(result.eventType).toBe(InteractionType.ContactOwner);
  });

  it('delete soft deletes existing event', async () => {
    prisma.interactionEvent.findFirst.mockResolvedValue(makeEvent());
    prisma.interactionEvent.update.mockResolvedValue({});

    await service.delete('event-1');

    expect(prisma.interactionEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isDeleted: true }) }),
    );
  });

  it('delete throws when event is missing', async () => {
    prisma.interactionEvent.findFirst.mockResolvedValue(null);

    await expect(service.delete('missing')).rejects.toThrow(AppNotFoundException);
  });
});
