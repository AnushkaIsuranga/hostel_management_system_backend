export interface HostelImageReadDto {
  id: string;
  hostelId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  imageUrl: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date | null;
}

export class UpdateHostelImageOrderDto {
  displayOrder: number;
}
