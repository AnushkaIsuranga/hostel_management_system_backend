export interface StudentPreferenceWeightsDto {
  price: number;
  distance: number;
  rating: number;
}

export interface StudentPreferenceReadDto {
  userId: string;
  universityId: string;
  minBudget: number | null;
  maxBudget: number | null;
  requiredCapacity: number | null;
  selectedAmenities: string[];
  priorityOrder: string[];
  weights: StudentPreferenceWeightsDto;
  createdAt: Date;
  updatedAt: Date | null;
}

export class StudentPreferenceUpsertDto {
  universityId: string;
  minBudget?: number | null;
  maxBudget?: number | null;
  requiredCapacity?: number | null;
  selectedAmenities?: string[] | null;
  priorityOrder?: string[] | null;
  weights?: StudentPreferenceWeightsDto | null;
}
