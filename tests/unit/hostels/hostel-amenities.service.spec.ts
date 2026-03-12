import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HostelAmenitiesService } from '../../../src/hostels/amenities/hostel-amenities.service';
import {
  AppBadRequestException,
  AppConflictException,
  AppNotFoundException,
} from '../../../src/common/exceptions/app-exception';
import { makeHostelAmenityLink, makeAmenity } from '../../helpers';

const makePrisma = () => ({
  hostelAmenity: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  hostel: {
    findFirst: vi.fn(),
  },
  amenity: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
});

describe('HostelAmenitiesService', () => {
  let service: HostelAmenitiesService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new HostelAmenitiesService(prisma as any);
  });

  // ── getAll ────────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns all hostel amenities', async () => {
      prisma.hostelAmenity.findMany.mockResolvedValue([makeHostelAmenityLink(), makeHostelAmenityLink({ amenityId: 'amenity-2' })]);
      const result = await service.getAll();
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no amenities exist', async () => {
      prisma.hostelAmenity.findMany.mockResolvedValue([]);
      const result = await service.getAll();
      expect(result).toHaveLength(0);
    });
  });

  // ── getByKey ──────────────────────────────────────────────────────────────

  describe('getByKey', () => {
    it('returns the link when found', async () => {
      prisma.hostelAmenity.findUnique.mockResolvedValue(makeHostelAmenityLink());
      const result = await service.getByKey('hostel-1', 'amenity-1');
      expect(result).not.toBeNull();
    });

    it('returns null when not found', async () => {
      prisma.hostelAmenity.findUnique.mockResolvedValue(null);
      const result = await service.getByKey('hostel-1', 'missing');
      expect(result).toBeNull();
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a new hostel-amenity link', async () => {
      prisma.hostelAmenity.findUnique.mockResolvedValue(null);
      prisma.hostelAmenity.create.mockResolvedValue(makeHostelAmenityLink());

      const result = await service.create({ hostelId: 'hostel-1', amenityId: 'amenity-1' });
      expect(result.hostelId).toBe('hostel-1');
    });

    it('throws AppConflictException when the link already exists', async () => {
      prisma.hostelAmenity.findUnique.mockResolvedValue(makeHostelAmenityLink());
      await expect(service.create({ hostelId: 'hostel-1', amenityId: 'amenity-1' })).rejects.toThrow(
        AppConflictException,
      );
    });
  });

  // ── createByNames ─────────────────────────────────────────────────────────

  describe('createByNames', () => {
    it('throws AppBadRequestException when hostelId is missing', async () => {
      await expect(service.createByNames({ hostelId: '', amenityNames: 'WiFi' })).rejects.toThrow(
        AppBadRequestException,
      );
    });

    it('throws AppBadRequestException when amenityNames is empty', async () => {
      await expect(service.createByNames({ hostelId: 'hostel-1', amenityNames: '   ' })).rejects.toThrow(
        AppBadRequestException,
      );
    });

    it('throws AppNotFoundException when hostel does not exist', async () => {
      prisma.hostel.findFirst.mockResolvedValue(null);
      await expect(service.createByNames({ hostelId: 'hostel-1', amenityNames: 'WiFi' })).rejects.toThrow(
        AppNotFoundException,
      );
    });

    it('creates missing amenities and links them to the hostel', async () => {
      prisma.hostel.findFirst.mockResolvedValue({ id: 'hostel-1', isDeleted: false });
      prisma.amenity.findMany.mockResolvedValue([]);
      const newAmenity = makeAmenity();
      prisma.amenity.create.mockResolvedValue(newAmenity);
      prisma.hostelAmenity.findUnique.mockResolvedValue(null);
      const newLink = makeHostelAmenityLink();
      prisma.hostelAmenity.create.mockResolvedValue(newLink);

      const result = await service.createByNames({ hostelId: 'hostel-1', amenityNames: 'WiFi' });
      expect(result).toHaveLength(1);
      expect(prisma.amenity.create).toHaveBeenCalledOnce();
    });

    it('returns existing links without duplicating them', async () => {
      prisma.hostel.findFirst.mockResolvedValue({ id: 'hostel-1', isDeleted: false });
      prisma.amenity.findMany.mockResolvedValue([makeAmenity({ name: 'WiFi' })]);
      const existingLink = makeHostelAmenityLink();
      prisma.hostelAmenity.findUnique.mockResolvedValue(existingLink);

      const result = await service.createByNames({ hostelId: 'hostel-1', amenityNames: 'WiFi' });
      expect(result).toHaveLength(1);
      expect(prisma.hostelAmenity.create).not.toHaveBeenCalled();
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes an existing hostel-amenity link', async () => {
      prisma.hostelAmenity.findUnique.mockResolvedValue(makeHostelAmenityLink());
      prisma.hostelAmenity.delete.mockResolvedValue({});

      await service.delete('hostel-1', 'amenity-1');
      expect(prisma.hostelAmenity.delete).toHaveBeenCalledOnce();
    });

    it('throws AppNotFoundException when the link does not exist', async () => {
      prisma.hostelAmenity.findUnique.mockResolvedValue(null);
      await expect(service.delete('hostel-1', 'missing')).rejects.toThrow(AppNotFoundException);
    });
  });
});
