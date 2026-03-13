import { HostelStatus, HostelVerificationStatus } from '../../common/enums/app.enums';

export interface HostelReadDto {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhoneNumber: string;
  isVerified: boolean;
  verifiedAt: Date | null;
  verifiedByAdminId: string | null;
  verificationStatus: HostelVerificationStatus;
  description: string;
  city: string;
  address: string;
  minPrice: number;
  maxPrice: number;
  genderPolicy: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  status: HostelStatus;
  images: string[];
  createdAt: Date;
  updatedAt: Date | null;
}

export class HostelCreateDto {
  name: string;
  description: string;
  city: string;
  address: string;
  minPrice: number;
  maxPrice: number;
  genderPolicy: string;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  status: HostelStatus;
  images?: string[] | null;
}

export class HostelUpdateDto {
  name: string;
  ownerId: string;
  description: string;
  city: string;
  address: string;
  minPrice: number;
  maxPrice: number;
  genderPolicy: string;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  status: HostelStatus;
  images?: string[] | null;
}

export class HostelSearchWeightsDto {
  priceWeight: number;
  distanceWeight: number;
  ratingWeight: number;
}

export class HostelSearchRequestDto {
  minBudget?: number | null;
  maxBudget?: number | null;
  genderPolicy?: string | null;
  requiredCapacity?: number | null;
  universityId?: string | null;
  amenityIds?: string[] | null;
  weights?: HostelSearchWeightsDto | null;
}

export interface HostelSearchResultDto {
  hostel: HostelReadDto;
  distanceKm: number;
  averageRating: number;
  score: number;
}
