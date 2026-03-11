export interface HostelSubscriptionReadDto {
  id: string;
  hostelId: string;
  startDate: Date;
  expiryDate: Date;
  isActive: boolean;
  lastReminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export class UpsertHostelSubscriptionDto {
  startDate: Date;
  expiryDate: Date;
}
