export interface UniversityReadDto {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  updatedAt: Date | null;
}

export class UniversityCreateDto {
  name: string;
  latitude: number;
  longitude: number;
}

export class UniversityUpdateDto {
  name: string;
  latitude: number;
  longitude: number;
}
