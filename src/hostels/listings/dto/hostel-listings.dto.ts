import { ListingStatus } from '../../../common/enums/app.enums';

export interface HostelListingReadDto {
  id: string;
  hostelId: string;
  ownerUserId: string;
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date | null;
}

export class HostelListingCreateDto {
  hostelId: string;
  ownerUserId: string;
  status: ListingStatus;
}

export class HostelListingUpdateDto {
  status: ListingStatus;
}
