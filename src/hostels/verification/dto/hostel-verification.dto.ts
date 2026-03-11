import { HostelVerificationStatus } from '../../../common/enums/app.enums';

export interface HostelVerificationRequestReadDto {
  id: string;
  hostelId: string;
  requestedByUserId: string;
  status: HostelVerificationStatus;
  adminNotes: string | null;
  reviewedByAdminId: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

export class ReviewVerificationRequestDto {
  adminNotes?: string | null;
}
