import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  HostelVerificationStatus,
} from '../common/enums/app.enums';
import {
  AppBadRequestException,
  AppConflictException,
  AppNotFoundException,
} from '../common/exceptions/app-exception';
import { decimalToNumber, parseJsonStringArray } from '../common/utils/prisma.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  HostelCreateDto,
  HostelReadDto,
  HostelSearchRequestDto,
  HostelSearchResultDto,
  HostelSearchWeightsDto,
  HostelUpdateDto,
} from './dto/hostels.dto';

const MAX_IMAGES_PER_HOSTEL = 8;
const DELETED_HOSTEL_RESTORE_RETENTION_DAYS = 60;
const COORDINATES_PLACE_DATA_REGEX = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i;
const COORDINATES_AT_REGEX = /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i;
const COORDINATES_QUERY_REGEX = /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i;

@Injectable()
export class HostelsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<HostelReadDto[]> {
    const hostels = await this.prisma.hostel.findMany({
      where: { isDeleted: false },
      include: this.hostelInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return hostels.map((hostel) => {
      const dto = this.toReadDto(hostel);
      return dto.images.length > 0 ? dto : { ...dto, images: this.getFallbackImageUrls(dto.id) };
    });
  }

  async getById(id: string): Promise<HostelReadDto> {
    const hostel = await this.prisma.hostel.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: this.hostelInclude(),
    });

    if (!hostel) {
      throw new AppNotFoundException('Hostel not found.');
    }

    const dto = this.toReadDto(hostel);
    return dto.images.length > 0 ? dto : { ...dto, images: this.getFallbackImageUrls(id) };
  }

  async search(request: HostelSearchRequestDto, currentUserId?: string): Promise<HostelSearchResultDto[]> {
    const preferenceContext = await this.buildPreferenceContext(request, currentUserId);
    const effectiveRequest = preferenceContext.request;

    if (!effectiveRequest.universityId) {
      throw new AppBadRequestException('UniversityId is required.');
    }

    const university = await this.prisma.university.findFirst({
      where: {
        id: effectiveRequest.universityId,
        isDeleted: false,
      },
    });

    if (!university) {
      throw new AppNotFoundException('University not found.');
    }

    const where: Prisma.HostelWhereInput = {
      isDeleted: false,
      ...(effectiveRequest.minBudget !== undefined && effectiveRequest.minBudget !== null
        ? { maxPrice: { gte: effectiveRequest.minBudget } }
        : {}),
      ...(effectiveRequest.maxBudget !== undefined && effectiveRequest.maxBudget !== null
        ? { minPrice: { lte: effectiveRequest.maxBudget } }
        : {}),
      ...(effectiveRequest.genderPolicy ? { genderPolicy: effectiveRequest.genderPolicy } : {}),
      ...(effectiveRequest.requiredCapacity
        ? {
            rooms: {
              some: {
                isDeleted: false,
                isAvailable: true,
                capacity: {
                  gte: effectiveRequest.requiredCapacity,
                },
              },
            },
          }
        : {}),
      ...(effectiveRequest.amenityIds?.length
        ? {
            AND: effectiveRequest.amenityIds.map((amenityId) => ({
              hostelAmenities: {
                some: {
                  amenityId,
                },
              },
            })),
          }
        : {}),
    };

    const hostels = await this.prisma.hostel.findMany({
      where,
      include: this.hostelInclude({
        includeRooms: true,
        includeReviews: true,
        includeAmenities: true,
      }),
    });

    if (!hostels.length) {
      return [];
    }

    const weights = this.normalizeWeights(effectiveRequest.weights);
    const shaped = hostels.map((hostel) => {
      const minPrice = decimalToNumber(hostel.minPrice) ?? 0;
      const averageRating = hostel.reviews.length
        ? hostel.reviews.reduce((sum, review) => sum + review.rating, 0) / hostel.reviews.length
        : 0;

      return {
        hostel,
        minPrice,
        distanceKm: this.calculateDistanceKm(university.latitude, university.longitude, hostel.latitude, hostel.longitude),
        averageRating,
      };
    });

    const minPrice = Math.min(...shaped.map((item) => item.minPrice));
    const maxPrice = Math.max(...shaped.map((item) => item.minPrice));
    const minDistance = Math.min(...shaped.map((item) => item.distanceKm));
    const maxDistance = Math.max(...shaped.map((item) => item.distanceKm));
    const minRating = Math.min(...shaped.map((item) => item.averageRating));
    const maxRating = Math.max(...shaped.map((item) => item.averageRating));

    return shaped
      .map((item) => {
        const normalizedPrice = this.normalizeLowerBetter(item.minPrice, minPrice, maxPrice);
        const normalizedDistance = this.normalizeLowerBetter(item.distanceKm, minDistance, maxDistance);
        const normalizedRating = this.normalizeHigherBetter(item.averageRating, minRating, maxRating);
        const baseScore =
          normalizedPrice * weights.priceWeight +
          normalizedDistance * weights.distanceWeight +
          normalizedRating * weights.ratingWeight;

        const preferenceScore = this.calculatePreferenceBoost(
          item.hostel,
          preferenceContext.preferredMinBudget,
          preferenceContext.preferredMaxBudget,
          preferenceContext.preferredCapacity,
          preferenceContext.preferredAmenityIds,
        );

        const score = preferenceContext.hasRankingPreferences
          ? baseScore * 0.85 + preferenceScore * 0.15
          : baseScore;

        return {
          hostel: this.toReadDto(item.hostel),
          distanceKm: Math.round(item.distanceKm * 100) / 100,
          averageRating: Math.round(item.averageRating * 100) / 100,
          score: Math.round(score * 10000) / 10000,
        };
      })
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.distanceKm - right.distanceKm;
      });
  }

  async create(ownerId: string, dto: HostelCreateDto): Promise<HostelReadDto> {
    const coordinates = await this.resolveCoordinates(dto.latitude, dto.longitude, dto.googleMapsUrl);
    const images = this.normalizeImages(dto.images);

    try {
      const hostel = await this.prisma.hostel.create({
        data: {
          name: dto.name,
          ownerId,
          description: dto.description,
          city: dto.city,
          address: dto.address,
          minPrice: dto.minPrice,
          maxPrice: dto.maxPrice,
          genderPolicy: dto.genderPolicy,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          googleMapsUrl: coordinates.googleMapsUrl,
          status: dto.status,
          isVerified: false,
          verificationStatus: HostelVerificationStatus.None,
          createdAt: new Date(),
          isDeleted: false,
          images: images.length
            ? {
                create: images.map((imageUrl, index) => ({
                  imageUrl,
                  fileName: this.getImageFileName(imageUrl),
                  contentType: 'application/octet-stream',
                  fileSize: BigInt(0),
                  displayOrder: index,
                  createdAt: new Date(),
                  isDeleted: false,
                })),
              }
            : undefined,
        },
        include: this.hostelInclude(),
      });

      return this.toReadDto(hostel);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new AppConflictException('A hostel with the same unique fields already exists.', 'hostel_conflict');
        }

        if (error.code === 'P2003') {
          throw new AppNotFoundException('The hostel owner account was not found.', 'hostel_owner_not_found');
        }
      }

      throw error;
    }
  }

  async update(id: string, dto: HostelUpdateDto): Promise<HostelReadDto> {
    const existing = await this.prisma.hostel.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        images: {
          where: { isDeleted: false },
        },
      },
    });

    if (!existing) {
      throw new AppNotFoundException('Hostel not found.');
    }

    const coordinates = await this.resolveCoordinates(dto.latitude, dto.longitude, dto.googleMapsUrl);
    const images = this.normalizeImages(dto.images);

    await this.prisma.$transaction(async (prisma) => {
      await prisma.hostel.update({
        where: { id },
        data: {
          name: dto.name,
          ownerId: dto.ownerId,
          description: dto.description,
          city: dto.city,
          address: dto.address,
          minPrice: dto.minPrice,
          maxPrice: dto.maxPrice,
          genderPolicy: dto.genderPolicy,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          googleMapsUrl: coordinates.googleMapsUrl,
          status: dto.status,
          updatedAt: new Date(),
        },
      });

      if (images.length > 0) {
        await prisma.hostelImage.updateMany({
          where: {
            hostelId: id,
            isDeleted: false,
          },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            updatedAt: new Date(),
          },
        });

        await prisma.hostelImage.createMany({
          data: images.map((imageUrl, index) => ({
            hostelId: id,
            imageUrl,
            fileName: this.getImageFileName(imageUrl),
            contentType: 'application/octet-stream',
            fileSize: BigInt(0),
            displayOrder: index,
            createdAt: new Date(),
            isDeleted: false,
          })),
        });
      }
    });

    return this.getById(id);
  }

  async delete(id: string) {
    const existing = await this.prisma.hostel.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existing) {
      throw new AppNotFoundException('Hostel not found.');
    }

    const deletedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.hostelImage.updateMany({
        where: {
          hostelId: id,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
          deletedAt,
          updatedAt: deletedAt,
        },
      }),
      this.prisma.hostel.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt,
          updatedAt: deletedAt,
        },
      }),
    ]);
  }

  async restore(id: string): Promise<HostelReadDto> {
    const hostel = await this.prisma.hostel.findFirst({
      where: { id },
      include: {
        owner: true,
        images: true,
      },
    });

    if (!hostel) {
      throw new AppNotFoundException('Hostel not found.');
    }

    if (!hostel.isDeleted) {
      throw new AppBadRequestException('Hostel is already active.');
    }

    if (
      hostel.deletedAt &&
      hostel.deletedAt.getTime() < Date.now() - DELETED_HOSTEL_RESTORE_RETENTION_DAYS * 24 * 60 * 60 * 1000
    ) {
      throw new AppBadRequestException('Hostel cannot be restored after the retention window.');
    }

    await this.prisma.$transaction([
      this.prisma.hostel.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          updatedAt: new Date(),
        },
      }),
      this.prisma.hostelImage.updateMany({
        where: {
          hostelId: id,
          isDeleted: true,
        },
        data: {
          isDeleted: false,
          deletedAt: null,
          updatedAt: new Date(),
        },
      }),
    ]);

    return this.getById(id);
  }

  private hostelInclude(options?: { includeRooms?: boolean; includeReviews?: boolean; includeAmenities?: boolean }) {
    return {
      owner: true,
      images: {
        where: { isDeleted: false },
        orderBy: [{ displayOrder: 'asc' as const }, { createdAt: 'asc' as const }],
      },
      ...(options?.includeRooms
        ? {
            rooms: {
              where: { isDeleted: false },
            },
          }
        : {}),
      ...(options?.includeReviews
        ? {
            reviews: {
              where: { isDeleted: false },
            },
          }
        : {}),
      ...(options?.includeAmenities
        ? {
            hostelAmenities: true,
          }
        : {}),
    };
  }

  private toReadDto(hostel: any): HostelReadDto {
    return {
      id: hostel.id,
      name: hostel.name,
      ownerId: hostel.ownerId,
      ownerName: hostel.owner.fullName,
      ownerEmail: hostel.owner.email,
      ownerPhoneNumber: hostel.owner.phoneNumber,
      isVerified: hostel.isVerified,
      verifiedAt: hostel.verifiedAt,
      verifiedByAdminId: hostel.verifiedByAdminId,
      verificationStatus: hostel.verificationStatus,
      description: hostel.description,
      city: hostel.city,
      address: hostel.address,
      minPrice: decimalToNumber(hostel.minPrice) ?? 0,
      maxPrice: decimalToNumber(hostel.maxPrice) ?? 0,
      genderPolicy: hostel.genderPolicy,
      latitude: hostel.latitude,
      longitude: hostel.longitude,
      googleMapsUrl: hostel.googleMapsUrl,
      status: hostel.status,
      images: hostel.images?.map((image) => image.imageUrl) ?? [],
      createdAt: hostel.createdAt,
      updatedAt: hostel.updatedAt,
    };
  }

  private async buildPreferenceContext(request: HostelSearchRequestDto, currentUserId?: string) {
    if (!currentUserId) {
      return {
        request,
        preferredMinBudget: null as number | null,
        preferredMaxBudget: null as number | null,
        preferredCapacity: null as number | null,
        preferredAmenityIds: [] as string[],
        hasRankingPreferences: false,
      };
    }

    const preference = await this.prisma.studentPreference.findFirst({
      where: {
        userId: currentUserId,
        isDeleted: false,
      },
    });

    if (!preference) {
      return {
        request,
        preferredMinBudget: null as number | null,
        preferredMaxBudget: null as number | null,
        preferredCapacity: null as number | null,
        preferredAmenityIds: [] as string[],
        hasRankingPreferences: false,
      };
    }

    const selectedAmenityNames = parseJsonStringArray(preference.selectedAmenitiesJson);
    const preferredAmenities = selectedAmenityNames.length
      ? await this.prisma.amenity.findMany({
          where: {
            isDeleted: false,
            name: { in: selectedAmenityNames },
          },
          select: { id: true },
        })
      : [];

    const effectiveRequest: HostelSearchRequestDto = {
      ...request,
      universityId: request.universityId || preference.universityId,
      weights:
        request.weights ??
        ({
          priceWeight: preference.priceWeight,
          distanceWeight: preference.distanceWeight,
          ratingWeight: preference.ratingWeight,
        } satisfies HostelSearchWeightsDto),
    };

    return {
      request: effectiveRequest,
      preferredMinBudget: decimalToNumber(preference.minBudget),
      preferredMaxBudget: decimalToNumber(preference.maxBudget),
      preferredCapacity: preference.requiredCapacity ?? null,
      preferredAmenityIds: preferredAmenities.map((amenity) => amenity.id),
      hasRankingPreferences:
        preference.minBudget !== null ||
        preference.maxBudget !== null ||
        preference.requiredCapacity !== null ||
        preferredAmenities.length > 0,
    };
  }

  private calculatePreferenceBoost(
    hostel: any,
    preferredMinBudget: number | null,
    preferredMaxBudget: number | null,
    preferredCapacity: number | null,
    preferredAmenityIds: string[],
  ) {
    const budgetScore = this.calculateBudgetScore(decimalToNumber(hostel.minPrice) ?? 0, preferredMinBudget, preferredMaxBudget);
    const capacityScore = this.calculateCapacityScore(hostel.rooms ?? [], preferredCapacity);
    const amenityScore = this.calculateAmenityScore(hostel.hostelAmenities ?? [], preferredAmenityIds);

    return budgetScore * 0.35 + capacityScore * 0.25 + amenityScore * 0.4;
  }

  private calculateBudgetScore(hostelPrice: number, preferredMinBudget: number | null, preferredMaxBudget: number | null) {
    if (preferredMinBudget === null && preferredMaxBudget === null) {
      return 1;
    }

    if (preferredMinBudget !== null && hostelPrice < preferredMinBudget) {
      const gap = preferredMinBudget - hostelPrice;
      return 1 / (1 + gap / Math.max(1, preferredMinBudget));
    }

    if (preferredMaxBudget !== null && hostelPrice > preferredMaxBudget) {
      const gap = hostelPrice - preferredMaxBudget;
      return 1 / (1 + gap / Math.max(1, preferredMaxBudget));
    }

    return 1;
  }

  private calculateCapacityScore(rooms: Array<{ isAvailable: boolean; capacity: number }>, preferredCapacity: number | null) {
    if (!preferredCapacity) {
      return 1;
    }

    const bestAvailable = rooms.filter((room) => room.isAvailable).reduce((max, room) => Math.max(max, room.capacity), 0);
    if (bestAvailable <= 0) {
      return 0;
    }

    if (bestAvailable >= preferredCapacity) {
      return 1;
    }

    return bestAvailable / preferredCapacity;
  }

  private calculateAmenityScore(hostelAmenities: Array<{ amenityId: string }>, preferredAmenityIds: string[]) {
    if (!preferredAmenityIds.length) {
      return 1;
    }

    const hostelAmenityIds = new Set(hostelAmenities.map((item) => item.amenityId));
    const matches = preferredAmenityIds.filter((id) => hostelAmenityIds.has(id)).length;
    return matches / preferredAmenityIds.length;
  }

  private normalizeWeights(weights?: HostelSearchWeightsDto | null): HostelSearchWeightsDto {
    const priceWeight = weights?.priceWeight ?? 0.4;
    const distanceWeight = weights?.distanceWeight ?? 0.4;
    const ratingWeight = weights?.ratingWeight ?? 0.2;

    if (priceWeight < 0 || distanceWeight < 0 || ratingWeight < 0) {
      throw new AppBadRequestException('Weights cannot be negative.');
    }

    const sum = priceWeight + distanceWeight + ratingWeight;
    if (sum <= 0) {
      throw new AppBadRequestException('At least one weight must be greater than zero.');
    }

    return {
      priceWeight: priceWeight / sum,
      distanceWeight: distanceWeight / sum,
      ratingWeight: ratingWeight / sum,
    };
  }

  private normalizeLowerBetter(value: number, min: number, max: number) {
    if (max === min) {
      return 1;
    }

    return 1 - (value - min) / (max - min);
  }

  private normalizeHigherBetter(value: number, min: number, max: number) {
    if (max === min) {
      return 1;
    }

    return (value - min) / (max - min);
  }

  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const earthRadiusKm = 6371;
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) *
        Math.cos(this.degreesToRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }

  private degreesToRadians(degrees: number) {
    return degrees * (Math.PI / 180);
  }

  private normalizeImages(images?: string[] | null) {
    const normalized = (images ?? []).map((image) => image?.trim()).filter((image): image is string => Boolean(image));
    if (normalized.length > MAX_IMAGES_PER_HOSTEL) {
      throw new AppBadRequestException(`Maximum ${MAX_IMAGES_PER_HOSTEL} images are allowed per hostel.`);
    }

    return normalized;
  }

  private async resolveCoordinates(latitude?: number | null, longitude?: number | null, googleMapsUrl?: string | null) {
    if (latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined) {
      this.validateCoordinates(latitude, longitude);
      return {
        latitude,
        longitude,
        googleMapsUrl: this.buildCanonicalGoogleMapsUrl(latitude, longitude),
      };
    }

    if (!googleMapsUrl?.trim()) {
      throw new AppBadRequestException('Provide latitude/longitude or a valid Google Maps URL.');
    }

    const extracted = await this.extractCoordinatesFromUrl(googleMapsUrl);
    return {
      latitude: extracted.latitude,
      longitude: extracted.longitude,
      googleMapsUrl: this.buildCanonicalGoogleMapsUrl(extracted.latitude, extracted.longitude),
    };
  }

  private async extractCoordinatesFromUrl(url: string) {
    const direct = this.tryExtractCoordinates(url);
    if (direct) {
      return direct;
    }

    const resolvedUrl = await this.resolveGoogleMapsUrl(url);
    const resolved = this.tryExtractCoordinates(resolvedUrl);
    if (resolved) {
      return resolved;
    }

    throw new AppBadRequestException('Coordinates were not found in the provided Google Maps URL.');
  }

  private async resolveGoogleMapsUrl(inputUrl: string) {
    let currentUrl = inputUrl;

    for (let hop = 0; hop < 5; hop += 1) {
      let response: Response;
      try {
        response = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          headers: {
            'User-Agent': 'HostelManagementSystem/1.0',
          },
        });
      } catch {
        return currentUrl;
      }

      if (![301, 302, 303, 307, 308].includes(response.status)) {
        return currentUrl;
      }

      const location = response.headers.get('location');
      if (!location) {
        return currentUrl;
      }

      currentUrl = new URL(location, currentUrl).toString();
    }

    return currentUrl;
  }

  private tryExtractCoordinates(url: string) {
    const match =
      COORDINATES_PLACE_DATA_REGEX.exec(url) ||
      COORDINATES_AT_REGEX.exec(url) ||
      COORDINATES_QUERY_REGEX.exec(url);

    if (!match) {
      return null;
    }

    const latitude = Number.parseFloat(match[1]);
    const longitude = Number.parseFloat(match[2]);
    this.validateCoordinates(latitude, longitude);

    return { latitude, longitude };
  }

  private validateCoordinates(latitude: number, longitude: number) {
    if (latitude < -90 || latitude > 90) {
      throw new AppBadRequestException('Latitude must be between -90 and 90.');
    }

    if (longitude < -180 || longitude > 180) {
      throw new AppBadRequestException('Longitude must be between -180 and 180.');
    }
  }

  private buildCanonicalGoogleMapsUrl(latitude: number, longitude: number) {
    const format = (value: number) => value.toFixed(7).replace(/0+$/, '').replace(/\.$/, '');
    return `https://www.google.com/maps?q=${format(latitude)},${format(longitude)}`;
  }

  private getImageFileName(imageUrl: string) {
    try {
      const parsed = new URL(imageUrl);
      return parsed.pathname.split('/').pop() || imageUrl;
    } catch {
      return imageUrl.split('/').pop() || imageUrl;
    }
  }

  private getFallbackImageUrls(hostelId: string) {
    const urls: string[] = [];
    const webRoot = join(process.cwd(), 'wwwroot');

    const modernFullDirectory = join(webRoot, 'uploads', 'hostels', hostelId, 'full');
    if (existsSync(modernFullDirectory)) {
      urls.push(
        ...readdirSync(modernFullDirectory)
          .sort()
          .map((fileName) => `/uploads/hostels/${hostelId}/full/${fileName}`),
      );
    }

    const legacyDirectory = join(webRoot, 'uploads', hostelId);
    if (existsSync(legacyDirectory)) {
      urls.push(
        ...readdirSync(legacyDirectory)
          .sort()
          .map((fileName) => `/uploads/${hostelId}/${fileName}`),
      );
    }

    return [...new Set(urls)];
  }
}
