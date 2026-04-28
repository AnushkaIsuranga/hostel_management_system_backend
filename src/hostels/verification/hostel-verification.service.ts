import { Injectable } from '@nestjs/common';

import { HostelVerificationStatus } from '../../common/enums/app.enums';
import {
  AppBadRequestException,
  AppConflictException,
  AppForbiddenException,
  AppNotFoundException,
} from '../../common/exceptions/app-exception';
import { DatabaseService } from '../../database/database.service';
import { HostelVerificationRequestReadDto } from './dto/hostel-verification.dto';

@Injectable()
export class HostelVerificationService {
  constructor(private readonly db: DatabaseService) {}

  async requestVerification(hostelId: string, ownerId: string): Promise<HostelVerificationRequestReadDto> {
    const hostel = await this.db.hostel.findFirst({
      where: {
        id: hostelId,
        ownerId,
        isDeleted: false,
      },
    });

    if (!hostel) {
      throw new AppForbiddenException('You can only request verification for your own hostel.', 'hostel_owner_required');
    }

    const pending = await this.db.hostelVerificationRequest.findFirst({
      where: {
        hostelId,
        status: HostelVerificationStatus.Pending,
        isDeleted: false,
      },
    });

    if (pending) {
      throw new AppConflictException('A pending verification request already exists.', 'verification_pending_exists');
    }

    const request = await this.db.$transaction(async (database) => {
      const created = await database.hostelVerificationRequest.create({
        data: {
          hostelId,
          requestedByUserId: ownerId,
          status: HostelVerificationStatus.Pending,
          createdAt: new Date(),
          isDeleted: false,
        },
      });

      await database.hostel.update({
        where: { id: hostelId },
        data: {
          verificationStatus: HostelVerificationStatus.Pending,
          updatedAt: new Date(),
        },
      });

      return created;
    });

    return this.toReadDto(request);
  }

  async approveVerification(
    requestId: string,
    adminId: string,
    adminNotes?: string | null,
  ): Promise<HostelVerificationRequestReadDto> {
    const request = await this.db.hostelVerificationRequest.findFirst({
      where: {
        id: requestId,
        isDeleted: false,
      },
    });

    if (!request) {
      throw new AppNotFoundException('Verification request not found.');
    }

    if (request.status !== HostelVerificationStatus.Pending) {
      throw new AppBadRequestException('Only pending requests can be approved.', 'verification_request_not_pending');
    }

    const updatedRequest = await this.db.$transaction(async (database) => {
      const approved = await database.hostelVerificationRequest.update({
        where: { id: requestId },
        data: {
          status: HostelVerificationStatus.Approved,
          adminNotes: adminNotes?.trim() || null,
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await database.hostel.update({
        where: { id: request.hostelId },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          verifiedByAdminId: adminId,
          verificationStatus: HostelVerificationStatus.Approved,
          updatedAt: new Date(),
        },
      });

      return approved;
    });

    return this.toReadDto(updatedRequest);
  }

  async rejectVerification(
    requestId: string,
    adminId: string,
    adminNotes?: string | null,
  ): Promise<HostelVerificationRequestReadDto> {
    const request = await this.db.hostelVerificationRequest.findFirst({
      where: {
        id: requestId,
        isDeleted: false,
      },
    });

    if (!request) {
      throw new AppNotFoundException('Verification request not found.');
    }

    if (request.status !== HostelVerificationStatus.Pending) {
      throw new AppBadRequestException('Only pending requests can be rejected.', 'verification_request_not_pending');
    }

    const updatedRequest = await this.db.$transaction(async (database) => {
      const rejected = await database.hostelVerificationRequest.update({
        where: { id: requestId },
        data: {
          status: HostelVerificationStatus.Rejected,
          adminNotes: adminNotes?.trim() || null,
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await database.hostel.update({
        where: { id: request.hostelId },
        data: {
          isVerified: false,
          verifiedAt: null,
          verifiedByAdminId: adminId,
          verificationStatus: HostelVerificationStatus.Rejected,
          updatedAt: new Date(),
        },
      });

      return rejected;
    });

    return this.toReadDto(updatedRequest);
  }

  async getForHostel(hostelId: string, requesterId: string, isAdmin: boolean): Promise<HostelVerificationRequestReadDto[]> {
    if (!isAdmin) {
      const hostel = await this.db.hostel.findFirst({
        where: {
          id: hostelId,
          ownerId: requesterId,
          isDeleted: false,
        },
      });

      if (!hostel) {
        throw new AppForbiddenException(
          'You can only view verification requests for your own hostel.',
          'hostel_owner_required',
        );
      }
    }

    const requests = await this.db.hostelVerificationRequest.findMany({
      where: {
        hostelId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((request) => this.toReadDto(request));
  }

  private toReadDto(request: any): HostelVerificationRequestReadDto {
    return {
      id: request.id,
      hostelId: request.hostelId,
      requestedByUserId: request.requestedByUserId,
      status: request.status,
      adminNotes: request.adminNotes,
      reviewedByAdminId: request.reviewedByAdminId,
      reviewedAt: request.reviewedAt,
      createdAt: request.createdAt,
    };
  }
}
