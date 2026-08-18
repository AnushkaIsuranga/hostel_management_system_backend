export interface HostelAmenityReadDto {
  hostelId: string;
  amenityId: string;
}

export class HostelAmenityCreateDto {
  hostelId: string;
  amenityId: string;
}

export class HostelAmenityBulkCreateDto {
  hostelId: string;
  amenityNames: string;
}
