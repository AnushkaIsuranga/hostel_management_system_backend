export interface RoomReadDto {
  id: string;
  hostelId: string;
  roomType: string;
  price: number;
  capacity: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}

export class RoomCreateDto {
  hostelId: string;
  roomType: string;
  price: number;
  capacity: number;
  isAvailable: boolean;
}

export class RoomUpdateDto {
  roomType: string;
  price: number;
  capacity: number;
  isAvailable: boolean;
}
