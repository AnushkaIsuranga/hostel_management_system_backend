import { Injectable } from '@nestjs/common';

import { PRIORITY_KEYS } from '../common/enums/app.enums';
import {
  AppBadRequestException,
  AppNotFoundException,
} from '../common/exceptions/app-exception';
import { decimalToNumber, normalizeStringList, parseJsonStringArray } from '../common/utils/database.util';
import { DatabaseService } from '../database/database.service';
import {
  StudentPreferenceReadDto,
  StudentPreferenceUpsertDto,
  StudentPreferenceWeightsDto,
} from './dto/student-preferences.dto';

@Injectable()
export class StudentPreferencesService {
  constructor(private readonly db: DatabaseService) {}

  async getMine(userId: string): Promise<StudentPreferenceReadDto> {
    const preference = await this.db.studentPreference.findFirst({
      where: {
        userId,
        isDeleted: false,
      },
    });

    if (!preference) {
      throw new AppNotFoundException('Student preferences not found.');
    }

    return this.toReadDto(preference);
  }

  async upsertMine(userId: string, dto: StudentPreferenceUpsertDto): Promise<StudentPreferenceReadDto> {
    await this.validateInput(dto);

    const selectedAmenities = normalizeStringList(dto.selectedAmenities);
    const priorityOrder = this.normalizePriorityOrder(dto.priorityOrder);
    const weights = this.resolveWeights(dto.weights, priorityOrder);

    const existing = await this.db.studentPreference.findFirst({
      where: {
        userId,
      },
    });

    const preference = existing
      ? await this.db.studentPreference.update({
          where: { id: existing.id },
          data: {
            universityId: dto.universityId,
            minBudget: dto.minBudget ?? null,
            maxBudget: dto.maxBudget ?? null,
            requiredCapacity: dto.requiredCapacity ?? null,
            selectedAmenitiesJson: JSON.stringify(selectedAmenities),
            priorityOrderJson: JSON.stringify(priorityOrder),
            priceWeight: weights.price,
            distanceWeight: weights.distance,
            ratingWeight: weights.rating,
            updatedAt: new Date(),
            isDeleted: false,
            deletedAt: null,
          },
        })
      : await this.db.studentPreference.create({
          data: {
            userId,
            universityId: dto.universityId,
            minBudget: dto.minBudget ?? null,
            maxBudget: dto.maxBudget ?? null,
            requiredCapacity: dto.requiredCapacity ?? null,
            selectedAmenitiesJson: JSON.stringify(selectedAmenities),
            priorityOrderJson: JSON.stringify(priorityOrder),
            priceWeight: weights.price,
            distanceWeight: weights.distance,
            ratingWeight: weights.rating,
            createdAt: new Date(),
            updatedAt: new Date(),
            isDeleted: false,
          },
        });

    return this.toReadDto(preference);
  }

  private async validateInput(dto: StudentPreferenceUpsertDto) {
    if (!dto.universityId) {
      throw new AppBadRequestException('UniversityId is required.');
    }

    if (dto.minBudget !== undefined && dto.minBudget !== null && dto.minBudget < 0) {
      throw new AppBadRequestException('MinBudget cannot be negative.');
    }

    if (dto.maxBudget !== undefined && dto.maxBudget !== null && dto.maxBudget < 0) {
      throw new AppBadRequestException('MaxBudget cannot be negative.');
    }

    if (
      dto.minBudget !== undefined &&
      dto.minBudget !== null &&
      dto.maxBudget !== undefined &&
      dto.maxBudget !== null &&
      dto.minBudget > dto.maxBudget
    ) {
      throw new AppBadRequestException('MinBudget cannot be greater than MaxBudget.');
    }

    if (dto.requiredCapacity !== undefined && dto.requiredCapacity !== null && dto.requiredCapacity <= 0) {
      throw new AppBadRequestException('RequiredCapacity must be greater than zero.');
    }

    const universityExists = await this.db.university.findFirst({
      where: {
        id: dto.universityId,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!universityExists) {
      throw new AppNotFoundException('University not found.');
    }

    const selectedAmenities = normalizeStringList(dto.selectedAmenities);
    if (selectedAmenities.length > 0) {
      const existingAmenities = await this.db.amenity.findMany({
        where: {
          isDeleted: false,
          name: { in: selectedAmenities },
        },
        select: { id: true },
      });

      if (existingAmenities.length !== selectedAmenities.length) {
        throw new AppBadRequestException('One or more selected amenities are invalid.');
      }
    }
  }

  private normalizePriorityOrder(priorityOrder?: string[] | null) {
    if (!priorityOrder?.length) {
      return [...PRIORITY_KEYS];
    }

    const normalized = [...new Set(priorityOrder.map((value) => value.trim().toLowerCase()).filter(Boolean))];
    if (normalized.length !== PRIORITY_KEYS.length || normalized.some((value) => !PRIORITY_KEYS.includes(value as never))) {
      throw new AppBadRequestException('PriorityOrder must contain exactly: price, distance, rating.');
    }

    return normalized;
  }

  private resolveWeights(weights: StudentPreferenceWeightsDto | null | undefined, priorityOrder: string[]) {
    if (!weights) {
      const generated: StudentPreferenceWeightsDto = {
        price: 0,
        distance: 0,
        rating: 0,
      };
      generated[priorityOrder[0]] = 0.5;
      generated[priorityOrder[1]] = 0.3;
      generated[priorityOrder[2]] = 0.2;
      return generated;
    }

    if (weights.price < 0 || weights.distance < 0 || weights.rating < 0) {
      throw new AppBadRequestException('Weights cannot be negative.');
    }

    const sum = weights.price + weights.distance + weights.rating;
    if (sum <= 0) {
      throw new AppBadRequestException('At least one weight must be greater than zero.');
    }

    return {
      price: weights.price / sum,
      distance: weights.distance / sum,
      rating: weights.rating / sum,
    };
  }

  private toReadDto(preference: any): StudentPreferenceReadDto {
    const selectedAmenities = parseJsonStringArray(preference.selectedAmenitiesJson);
    const priorityOrder = parseJsonStringArray(preference.priorityOrderJson);

    return {
      userId: preference.userId,
      universityId: preference.universityId,
      minBudget: decimalToNumber(preference.minBudget),
      maxBudget: decimalToNumber(preference.maxBudget),
      requiredCapacity: preference.requiredCapacity,
      selectedAmenities,
      priorityOrder: priorityOrder.length ? priorityOrder : [...PRIORITY_KEYS],
      weights: {
        price: preference.priceWeight,
        distance: preference.distanceWeight,
        rating: preference.ratingWeight,
      },
      createdAt: preference.createdAt,
      updatedAt: preference.updatedAt,
    };
  }
}
