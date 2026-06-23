import {
  BadRequestException,
  ForbiddenException,
  LoggerService,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccommodationType } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { KindeRole } from '../auth/kinde-jwt.strategy';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../event-log/event-type.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccommodationDto } from './dto/create-accommodation.dto';
import { CreateSightDto } from './dto/create-sight.dto';
import { WaypointsService } from './waypoints.service';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const WAYPOINT_SLUG = 'saint-jean-pied-de-port';
const USER_ID = 'kinde-user-001';

const basePoint = {
  id: 'pt-1111-0000-0000-0000',
  name: 'Saint-Jean-Pied-de-Port',
  country: 'france',
  slug: WAYPOINT_SLUG,
  description: 'Starting point of the Camino Francés.',
  createdAt: new Date('2026-01-01'),
};

const baseAccommodation = {
  id: 'ac-1111-0000-0000-0000',
  caminoPointId: basePoint.id,
  name: 'Albergue Municipal',
  description: 'Basic pilgrim hostel.',
  imageUrls: [],
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
};

const baseSight = {
  id: 'si-1111-0000-0000-0000',
  caminoPointId: basePoint.id,
  name: 'Porte Saint-Jacques',
  description: 'Historic gateway.',
  imageUrls: [],
  verified: false,
  address: null,
  latitude: null,
  longitude: null,
  createdBy: USER_ID,
  createdAt: new Date('2026-02-01'),
  updatedAt: new Date('2026-02-01'),
};

// ─── Module builder ───────────────────────────────────────────────────────────

function buildModule(prismaMock: object): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      WaypointsService,
      { provide: PrismaService, useValue: prismaMock },
      { provide: EventLogService, useValue: { logEvent: vi.fn() } },
    ],
  })
    .setLogger(false as unknown as LoggerService)
    .compile();
}

// ─── WaypointsService.findBySlug() ───────────────────────────────────────────

describe('WaypointsService.findBySlug()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns WaypointDetailDto (without accommodations/sights) when the slug matches', async () => {
    const prismaMock = {
      caminoPoint: {
        findUnique: vi.fn().mockResolvedValue(basePoint),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(WaypointsService);

    const result = await service.findBySlug(WAYPOINT_SLUG);

    expect(result.id).toBe(basePoint.id);
    expect(result.slug).toBe(WAYPOINT_SLUG);
    expect(result).not.toHaveProperty('accommodations');
    expect(result).not.toHaveProperty('sights');
    expect(prismaMock.caminoPoint.findUnique).toHaveBeenCalledWith({
      where: { slug: WAYPOINT_SLUG },
    });
  });

  it('throws NotFoundException when slug does not match any CaminoPoint', async () => {
    const prismaMock = {
      caminoPoint: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(WaypointsService);

    await expect(service.findBySlug('unknown-slug')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

// ─── WaypointsService.update() ───────────────────────────────────────────────

describe('WaypointsService.update()', () => {
  afterEach(() => vi.restoreAllMocks());

  const pilgrimRoles: KindeRole[] = [{ id: 'r1', key: 'pilgrim', name: 'Pilgrim' }];
  const noRoles: KindeRole[] = [];

  const basePointWithCoords = { ...basePoint, lat: 43.163, lng: -1.238, description: null };

  function buildUpdateMock(returnValue = basePointWithCoords) {
    return {
      caminoPoint: {
        findUnique: vi.fn().mockResolvedValue(basePointWithCoords),
        update: vi.fn().mockResolvedValue(returnValue),
      },
    };
  }

  function buildValidationMock() {
    return {
      caminoPoint: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
  }

  it('throws ForbiddenException when caller lacks the pilgrim role', async () => {
    const module = await buildModule(buildValidationMock());
    const service = module.get(WaypointsService);

    await expect(
      service.update(WAYPOINT_SLUG, { name: 'Rome' }, USER_ID, noRoles),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws BadRequestException when the body has no fields', async () => {
    const module = await buildModule(buildValidationMock());
    const service = module.get(WaypointsService);

    await expect(
      service.update(WAYPOINT_SLUG, {}, USER_ID, pilgrimRoles),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when name is a blank string', async () => {
    const module = await buildModule(buildValidationMock());
    const service = module.get(WaypointsService);

    await expect(
      service.update(WAYPOINT_SLUG, { name: '   ' }, USER_ID, pilgrimRoles),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when only lat is provided', async () => {
    const module = await buildModule(buildValidationMock());
    const service = module.get(WaypointsService);

    await expect(
      service.update(WAYPOINT_SLUG, { lat: 43.163 }, USER_ID, pilgrimRoles),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when only lng is provided', async () => {
    const module = await buildModule(buildValidationMock());
    const service = module.get(WaypointsService);

    await expect(
      service.update(WAYPOINT_SLUG, { lng: -1.238 }, USER_ID, pilgrimRoles),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when lat is null but lng is a value (mixed pair)', async () => {
    const module = await buildModule(buildValidationMock());
    const service = module.get(WaypointsService);

    await expect(
      service.update(WAYPOINT_SLUG, { lat: null, lng: -1.238 }, USER_ID, pilgrimRoles),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException when no CaminoPoint matches the slug', async () => {
    const prismaMock = {
      caminoPoint: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(WaypointsService);

    await expect(
      service.update(WAYPOINT_SLUG, { name: 'Rome' }, USER_ID, pilgrimRoles),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prismaMock.caminoPoint.update).not.toHaveBeenCalled();
  });

  it('sets both coordinates and returns the updated waypoint', async () => {
    const prismaMock = buildUpdateMock({ ...basePoint, lat: 43.163, lng: -1.238, description: null });
    const module = await buildModule(prismaMock);
    const service = module.get(WaypointsService);

    const result = await service.update(
      WAYPOINT_SLUG,
      { lat: 43.163, lng: -1.238 },
      USER_ID,
      pilgrimRoles,
    );

    expect(result.lat).toBe(43.163);
    expect(result.lng).toBe(-1.238);
    expect(prismaMock.caminoPoint.update).toHaveBeenCalledWith({
      where: { slug: WAYPOINT_SLUG },
      data: expect.objectContaining({ lat: 43.163, lng: -1.238 }),
    });
  });

  it('clears coordinates when both lat and lng are sent as null', async () => {
    const prismaMock = buildUpdateMock({ ...basePoint, lat: null, lng: null, description: null });
    const module = await buildModule(prismaMock);
    const service = module.get(WaypointsService);

    const result = await service.update(
      WAYPOINT_SLUG,
      { lat: null, lng: null },
      USER_ID,
      pilgrimRoles,
    );

    expect(result.lat).toBeNull();
    expect(result.lng).toBeNull();
    expect(prismaMock.caminoPoint.update).toHaveBeenCalledWith({
      where: { slug: WAYPOINT_SLUG },
      data: expect.objectContaining({ lat: null, lng: null }),
    });
  });

  it('does not include lat/lng in the update data when both are omitted', async () => {
    const prismaMock = buildUpdateMock({ ...basePoint, lat: null, lng: null, description: null });
    const module = await buildModule(prismaMock);
    const service = module.get(WaypointsService);

    await service.update(WAYPOINT_SLUG, { name: 'Rome' }, USER_ID, pilgrimRoles);

    const updateData = prismaMock.caminoPoint.update.mock.calls[0][0].data as Record<string, unknown>;
    expect(updateData).not.toHaveProperty('lat');
    expect(updateData).not.toHaveProperty('lng');
  });

  it('trims whitespace from the name before saving', async () => {
    const prismaMock = buildUpdateMock({ ...basePoint, name: 'Rome', lat: null, lng: null, description: null });
    const module = await buildModule(prismaMock);
    const service = module.get(WaypointsService);

    await service.update(WAYPOINT_SLUG, { name: '  Rome  ' }, USER_ID, pilgrimRoles);

    expect(prismaMock.caminoPoint.update).toHaveBeenCalledWith({
      where: { slug: WAYPOINT_SLUG },
      data: expect.objectContaining({ name: 'Rome' }),
    });
  });

  it('logs a WAYPOINT_UPDATED event on success', async () => {
    const prismaMock = buildUpdateMock();
    const module = await buildModule(prismaMock);
    const service = module.get(WaypointsService);
    const eventLog = module.get(EventLogService);

    await service.update(WAYPOINT_SLUG, { lat: 43.163, lng: -1.238 }, USER_ID, pilgrimRoles);

    expect(eventLog.logEvent).toHaveBeenCalledWith(
      EventType.WAYPOINT_UPDATED,
      USER_ID,
      expect.objectContaining({ waypoint_slug: WAYPOINT_SLUG }),
    );
  });
});

// ─── WaypointsService.createAccommodation() ──────────────────────────────────

describe('WaypointsService.createAccommodation()', () => {
  afterEach(() => vi.restoreAllMocks());

  const dto: CreateAccommodationDto = {
    name: 'Albergue Municipal',
    description: 'Basic pilgrim hostel.',
    imageUrls: ['https://example.com/image.jpg'],
    type: AccommodationType.hostel,
  };

  it('creates an accommodation and returns AccommodationResponseDto', async () => {
    const prismaMock = {
      caminoPoint: {
        findUnique: vi.fn().mockResolvedValue(basePoint),
      },
      accommodation: {
        create: vi.fn().mockResolvedValue(baseAccommodation),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(WaypointsService);

    const result = await service.createAccommodation(
      WAYPOINT_SLUG,
      dto,
      USER_ID,
    );

    expect(result.id).toBe(baseAccommodation.id);
    expect(result.caminoPointId).toBe(basePoint.id);
    expect(result.createdBy).toBe(USER_ID);
    expect(prismaMock.accommodation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        caminoPointId: basePoint.id,
        name: dto.name,
        description: dto.description,
        imageUrls: dto.imageUrls,
        type: dto.type,
        createdBy: USER_ID,
      }),
    });
  });

  it('defaults imageUrls to empty array when not provided in DTO', async () => {
    const dtoWithoutUrls: CreateAccommodationDto = {
      name: 'Hostel Simple',
      type: AccommodationType.hostel,
    };
    const prismaMock = {
      caminoPoint: {
        findUnique: vi.fn().mockResolvedValue(basePoint),
      },
      accommodation: {
        create: vi
          .fn()
          .mockResolvedValue({ ...baseAccommodation, imageUrls: [] }),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(WaypointsService);

    await service.createAccommodation(WAYPOINT_SLUG, dtoWithoutUrls, USER_ID);

    expect(prismaMock.accommodation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrls: [] }),
      }),
    );
  });

  it('throws NotFoundException when slug does not match any CaminoPoint', async () => {
    const prismaMock = {
      caminoPoint: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      accommodation: {
        create: vi.fn(),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(WaypointsService);

    await expect(
      service.createAccommodation('unknown-slug', dto, USER_ID),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prismaMock.accommodation.create).not.toHaveBeenCalled();
  });
});

// ─── WaypointsService.createSight() ──────────────────────────────────────────

describe('WaypointsService.createSight()', () => {
  afterEach(() => vi.restoreAllMocks());

  const dto: CreateSightDto = {
    name: 'Porte Saint-Jacques',
    description: 'Historic gateway.',
    imageUrls: ['https://example.com/gateway.jpg'],
  };

  it('creates a sight and returns SightResponseDto', async () => {
    const prismaMock = {
      caminoPoint: {
        findUnique: vi.fn().mockResolvedValue(basePoint),
      },
      sight: {
        create: vi.fn().mockResolvedValue(baseSight),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(WaypointsService);

    const result = await service.createSight(WAYPOINT_SLUG, dto, USER_ID);

    expect(result.id).toBe(baseSight.id);
    expect(result.caminoPointId).toBe(basePoint.id);
    expect(result.createdBy).toBe(USER_ID);
    expect(prismaMock.sight.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        caminoPointId: basePoint.id,
        name: dto.name,
        description: dto.description,
        imageUrls: dto.imageUrls,
        createdBy: USER_ID,
      }),
    });
  });

  it('defaults imageUrls to empty array when not provided in DTO', async () => {
    const dtoWithoutUrls: CreateSightDto = { name: 'Old Bridge' };
    const prismaMock = {
      caminoPoint: {
        findUnique: vi.fn().mockResolvedValue(basePoint),
      },
      sight: {
        create: vi.fn().mockResolvedValue({ ...baseSight, imageUrls: [] }),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(WaypointsService);

    await service.createSight(WAYPOINT_SLUG, dtoWithoutUrls, USER_ID);

    expect(prismaMock.sight.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ imageUrls: [] }),
      }),
    );
  });

  it('throws NotFoundException when slug does not match any CaminoPoint', async () => {
    const prismaMock = {
      caminoPoint: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      sight: {
        create: vi.fn(),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(WaypointsService);

    await expect(
      service.createSight('unknown-slug', dto, USER_ID),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prismaMock.sight.create).not.toHaveBeenCalled();
  });
});
