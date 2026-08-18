import { Injectable } from '@nestjs/common';

import { InteractionType } from '../common/enums/app.enums';
import { AppNotFoundException } from '../common/exceptions/app-exception';
import { DatabaseService } from '../database/database.service';
import {
  InteractionEventCreateDto,
  InteractionEventReadDto,
  InteractionEventUpdateDto,
} from './dto/interaction-events.dto';

@Injectable()
export class InteractionEventsService {
  constructor(private readonly db: DatabaseService) {}

  async getAll(): Promise<InteractionEventReadDto[]> {
    const events = await this.db.interactionEvent.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });

    return events.map((event) => this.toReadDto(event));
  }

  async getById(id: string): Promise<InteractionEventReadDto> {
    const event = await this.db.interactionEvent.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!event) {
      throw new AppNotFoundException('Interaction event not found.');
    }

    return this.toReadDto(event);
  }

  async create(dto: InteractionEventCreateDto): Promise<InteractionEventReadDto> {
    const eventData = this.toJsonInput(dto.eventData);

    const event = await this.db.interactionEvent.create({
      data: {
        userId: dto.userId ?? null,
        hostelId: dto.hostelId ?? null,
        eventType: dto.eventType,
        eventData: eventData ?? null,
        sessionId: dto.sessionId,
        createdAt: new Date(),
        isDeleted: false,
      },
    });

    return this.toReadDto(event);
  }

  async update(id: string, dto: InteractionEventUpdateDto): Promise<InteractionEventReadDto> {
    const eventData = this.toJsonInput(dto.eventData);

    const event = await this.db.interactionEvent.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!event) {
      throw new AppNotFoundException('Interaction event not found.');
    }

    const updated = await this.db.interactionEvent.update({
      where: { id },
      data: {
        userId: dto.userId ?? null,
        hostelId: dto.hostelId ?? null,
        eventType: dto.eventType,
        ...(eventData === undefined ? {} : { eventData }),
        sessionId: dto.sessionId,
        updatedAt: new Date(),
      },
    });

    return this.toReadDto(updated);
  }

  async delete(id: string) {
    const event = await this.db.interactionEvent.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!event) {
      throw new AppNotFoundException('Interaction event not found.');
    }

    await this.db.interactionEvent.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  private toReadDto(event: {
    id: string;
    userId: string | null;
    hostelId: string | null;
    eventType: number;
    eventData: unknown;
    sessionId: string;
    createdAt: Date;
    updatedAt: Date | null;
  }): InteractionEventReadDto {
    return {
      id: event.id,
      userId: event.userId,
      hostelId: event.hostelId,
      eventType: event.eventType as InteractionType,
      eventData: event.eventData,
      sessionId: event.sessionId,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  private toJsonInput(value: unknown): unknown | undefined {
    if (value === undefined) {
      return undefined;
    }

    return value;
  }
}
