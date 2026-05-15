import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccommodationType } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { KindeRole } from '../auth/kinde-jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { AccommodationsService } from './accommodations.service';
import { UpdateAccommodationDto } from './dto/update-accommodation.dto';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ACCOMMODATION_ID = 'ac-1111-0000-0000-0000';
const CAMINO_POINT_ID = 'pt-1111-0000-0000-0000';
const USER_ID = 'kinde-user-001';

const baseAccommodation = {
  id: ACCOMMODATION_ID,
  caminoPointId: CAMINO_POINT_ID,
  name: 'Albergue Municipal',
  description: 'Basic pilgrim hostel.',
  imageUrls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
  verified: false,
  type: AccommodationType.hostel,
  email: null,
  website: null,
  addressStreet: null,
  addressZip: null,
  addressCity: null,
  addressCountry: null,
  priceRange: null,
  createdBy: USER_ID,
  createdAt: new Date('2026-02-01'),
  updatedAt: new Date('2026-02-01'),
  caminoPoint: { slug: 'burgos' },
};

const PILGRIM_ROLES: KindeRole[] = [{ id: 'r1', key: 'pilgrim', name: 'Pilgrim' }];
const OWNER_ROLES: KindeRole[] = [{ id: 'r2', key: 'owner', name: 'Owner' }];
const NO_ROLES: KindeRole[] = [];

// ─── Module builder ───────────────────────────────────────────────────────────

function buildModule(prismaMock: object): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      AccommodationsService,
      { provide: PrismaService, useValue: prismaMock },
    ],
  })
    .setLogger(false)
    .compile();
}

// ─── AccommodationsService.findById() ─────────────────────────────────────────

describe('AccommodationsService.findById()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns AccommodationDetailDto when accommodation exists', async () => {
    const prismaMock = {
      accommodation: {
        findUnique: vi.fn().mockResolvedValue(baseAccommodation),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(AccommodationsService);

    const result = await service.findById(ACCOMMODATION_ID);

    expect(result.id).toBe(ACCOMMODATION_ID);
    expect(result.name).toBe('Albergue Municipal');
    expect(result.type).toBe(AccommodationType.hostel);
  });

  it('throws NotFoundException when accommodation does not exist', async () => {
    const prismaMock = {
      accommodation: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(AccommodationsService);

    await expect(service.findById('unknown-id')).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── AccommodationsService.findByCaminoPointId() ─────────────────────────────

describe('AccommodationsService.findByCaminoPointId()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns an array of AccommodationDetailDto for the given waypoint', async () => {
    const prismaMock = {
      accommodation: {
        findMany: vi.fn().mockResolvedValue([baseAccommodation]),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(AccommodationsService);

    const result = await service.findByCaminoPointId(CAMINO_POINT_ID);

    expect(prismaMock.accommodation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { caminoPointId: CAMINO_POINT_ID } }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(ACCOMMODATION_ID);
    expect(result[0].waypointSlug).toBe('burgos');
  });

  it('returns an empty array when the waypoint has no accommodations', async () => {
    const prismaMock = {
      accommodation: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(AccommodationsService);

    const result = await service.findByCaminoPointId(CAMINO_POINT_ID);

    expect(result).toEqual([]);
  });
});

// ─── AccommodationsService.update() ───────────────────────────────────────────

describe('AccommodationsService.update()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('throws ForbiddenException when user has no roles', async () => {
    const prismaMock = {
      accommodation: { findUnique: vi.fn(), update: vi.fn() },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(AccommodationsService);

    const dto = Object.assign(new UpdateAccommodationDto(), { name: 'New Name' });

    await expect(
      service.update(ACCOMMODATION_ID, dto, NO_ROLES),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.accommodation.update).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when user has owner role but not pilgrim', async () => {
    const prismaMock = {
      accommodation: { findUnique: vi.fn(), update: vi.fn() },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(AccommodationsService);

    const dto = Object.assign(new UpdateAccommodationDto(), { name: 'New Name' });

    await expect(
      service.update(ACCOMMODATION_ID, dto, OWNER_ROLES),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.accommodation.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when accommodation does not exist', async () => {
    const prismaMock = {
      accommodation: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(AccommodationsService);

    const dto = Object.assign(new UpdateAccommodationDto(), { name: 'New Name' });

    await expect(
      service.update('unknown-id', dto, PILGRIM_ROLES),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.accommodation.update).not.toHaveBeenCalled();
  });

  it('correctly removes URLs listed in removeImageUrls', async () => {
    const existingWithImages = {
      ...baseAccommodation,
      imageUrls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
    };
    const prismaMock = {
      accommodation: {
        findUnique: vi.fn().mockResolvedValue(existingWithImages),
        update: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...existingWithImages, ...data }),
        ),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(AccommodationsService);

    const dto = Object.assign(new UpdateAccommodationDto(), {
      removeImageUrls: ['https://example.com/img1.jpg'],
    });

    const result = await service.update(ACCOMMODATION_ID, dto, PILGRIM_ROLES);

    expect(prismaMock.accommodation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          imageUrls: ['https://example.com/img2.jpg'],
        }),
      }),
    );
    expect(result.imageUrls).toEqual(['https://example.com/img2.jpg']);
  });

  it('throws BadRequestException when both imageUrls and removeImageUrls are provided', async () => {
    const prismaMock = {
      accommodation: {
        findUnique: vi.fn().mockResolvedValue(baseAccommodation),
        update: vi.fn(),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(AccommodationsService);

    const dto = Object.assign(new UpdateAccommodationDto(), {
      imageUrls: ['https://example.com/new.jpg'],
      removeImageUrls: ['https://example.com/img1.jpg'],
    });

    await expect(
      service.update(ACCOMMODATION_ID, dto, PILGRIM_ROLES),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.accommodation.update).not.toHaveBeenCalled();
  });

  it('allows a pilgrim to update an accommodation and sets updatedAt', async () => {
    const updated = { ...baseAccommodation, name: 'Updated Name', updatedAt: new Date() };
    const prismaMock = {
      accommodation: {
        findUnique: vi.fn().mockResolvedValue(baseAccommodation),
        update: vi.fn().mockResolvedValue(updated),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(AccommodationsService);

    const dto = Object.assign(new UpdateAccommodationDto(), { name: 'Updated Name' });

    const result = await service.update(ACCOMMODATION_ID, dto, PILGRIM_ROLES);

    expect(result.name).toBe('Updated Name');
    expect(prismaMock.accommodation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ updatedAt: expect.any(Date) }),
      }),
    );
  });
});

// ─── AccommodationsService.delete() ───────────────────────────────────────────

describe('AccommodationsService.delete()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('throws ForbiddenException when user has no roles', async () => {
    const prismaMock = {
      accommodation: { findUnique: vi.fn(), delete: vi.fn() },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(AccommodationsService);

    await expect(
      service.delete(ACCOMMODATION_ID, NO_ROLES),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.accommodation.delete).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when user has owner role but not pilgrim', async () => {
    const prismaMock = {
      accommodation: { findUnique: vi.fn(), delete: vi.fn() },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(AccommodationsService);

    await expect(
      service.delete(ACCOMMODATION_ID, OWNER_ROLES),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.accommodation.delete).not.toHaveBeenCalled();
  });

  it('calls prisma.accommodation.delete for pilgrim role', async () => {
    const prismaMock = {
      accommodation: {
        findUnique: vi.fn().mockResolvedValue(baseAccommodation),
        delete: vi.fn().mockResolvedValue(baseAccommodation),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(AccommodationsService);

    await expect(
      service.delete(ACCOMMODATION_ID, PILGRIM_ROLES),
    ).resolves.toBeUndefined();
    expect(prismaMock.accommodation.delete).toHaveBeenCalledWith({
      where: { id: ACCOMMODATION_ID },
    });
  });

  it('throws NotFoundException when accommodation does not exist', async () => {
    const prismaMock = {
      accommodation: {
        findUnique: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(AccommodationsService);

    await expect(
      service.delete(ACCOMMODATION_ID, PILGRIM_ROLES),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.accommodation.delete).not.toHaveBeenCalled();
  });
});
