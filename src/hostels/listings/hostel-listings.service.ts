import { Injectable } from '@nestjs/common';

import { ListingStatus } from '../../common/enums/app.enums';
import {
  AppConflictException,
  AppNotFoundException,
} from '../../common/exceptions/app-exception';
import { PrismaService } from '../../prisma/prisma.service';
import {
  HostelListingCreateDto,
  HostelListingReadDto,
  HostelListingUpdateDto,
} from './dto/hostel-listings.dto';

@Injectable()
export class HostelListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<HostelListingReadDto[]> {
    const listings = await this.prisma.hostelListing.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });

    return listings.map((listing) => this.toReadDto(listing));
  }

  async getById(id: string): Promise<HostelListingReadDto> {
    const listing = await this.prisma.hostelListing.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!listing) {
      throw new AppNotFoundException('Listing not found.');
    }

    return this.toReadDto(listing);
  }

  async create(dto: HostelListingCreateDto): Promise<HostelListingReadDto> {
    try {
      const listing = await this.prisma.hostelListing.create({
        data: {
          hostelId: dto.hostelId,
          ownerUserId: dto.ownerUserId,
          status: dto.status ?? ListingStatus.Pending,
          createdAt: new Date(),
          isDeleted: false,
        },
      });

      return this.toReadDto(listing);
    } catch {
      throw new AppConflictException('A listing already exists for this hostel and owner.', 'listing_conflict');
    }
  }

  async update(id: string, dto: HostelListingUpdateDto): Promise<HostelListingReadDto> {
    const listing = await this.prisma.hostelListing.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!listing) {
      throw new AppNotFoundException('Listing not found.');
    }

    const updated = await this.prisma.hostelListing.update({
      where: { id },
      data: {
        status: dto.status,
        updatedAt: new Date(),
      },
    });

    return this.toReadDto(updated);
  }

  async delete(id: string) {
    const listing = await this.prisma.hostelListing.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!listing) {
      throw new AppNotFoundException('Listing not found.');
    }

    await this.prisma.hostelListing.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  private toReadDto(listing: {
    id: string;
    hostelId: string;
    ownerUserId: string;
    status: number;
    createdAt: Date;
    updatedAt: Date | null;
  }): HostelListingReadDto {
    return {
      id: listing.id,
      hostelId: listing.hostelId,
      ownerUserId: listing.ownerUserId,
      status: listing.status as ListingStatus,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
    };
  }
}
