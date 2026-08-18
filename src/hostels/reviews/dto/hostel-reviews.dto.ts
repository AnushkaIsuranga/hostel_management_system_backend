export interface HostelReviewReadDto {
  id: string;
  hostelId: string;
  userId: string;
  userFullName: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export class HostelReviewCreateDto {
  rating: number;
  comment?: string | null;
}

export class HostelReviewUpdateDto {
  rating: number;
  comment?: string | null;
}

export interface HostelRatingSummaryDto {
  hostelId: string;
  averageRating: number;
  reviewCount: number;
}
