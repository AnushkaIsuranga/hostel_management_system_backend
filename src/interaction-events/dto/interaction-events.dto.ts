import { InteractionType } from '../../common/enums/app.enums';

export interface InteractionEventReadDto {
  id: string;
  userId: string | null;
  hostelId: string | null;
  eventType: InteractionType;
  eventData: unknown | null;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date | null;
}

export class InteractionEventCreateDto {
  userId?: string | null;
  hostelId?: string | null;
  eventType: InteractionType;
  eventData?: unknown | null;
  sessionId: string;
}

export class InteractionEventUpdateDto {
  userId?: string | null;
  hostelId?: string | null;
  eventType: InteractionType;
  eventData?: unknown | null;
  sessionId: string;
}
