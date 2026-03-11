export interface AmenityReadDto {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date | null;
}

export class AmenityCreateDto {
  name: string;
}

export class AmenityUpdateDto {
  name: string;
}
