import {
  BadRequestException,
  ForbiddenException,
  LoggerService,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccommodationType, PriceRange } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { AccommodationsController } from './accommodations.controller';
import { AccommodationsService } from './accommodations.service';
import { AccommodationDetailDto } from './dto/accommodation-detail.dto';
import { UpdateAccommodationDto } from './dto/update-accommodation.dto';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ACCOMMODATION_ID = 'ac-1111-0000-0000-0000-000000000000';
const CAMINO_POINT_ID = 'pt-1111-0000-0000-0000-000000000000';
const NOW = new Date('2026-02-01T00:00:00.000Z');

const mockDto: AccommodationDetailDto = {
  id: ACCOMMODATION_ID,
  caminoPointId: CAMINO_POINT_ID,
  waypointSlug: 'burgos',
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
  createdBy: 'kinde-user-001',
  createdAt: NOW,
  updatedAt: NOW,
};

const mockRequest = {
  user: {
    sub: 'kinde-user-001',
    iss: 'https://example.kinde.com',
    aud: 'pillyway',
    exp: 9999999999,
    iat: 1000000000,
    roles: [{ id: 'r1', key: 'pilgrim', name: 'Pilgrim' }],
  },
};

function buildModule(
  serviceMock: Partial<AccommodationsService>,
): Promise<TestingModule> {
  return Test.createTestingModule({
    controllers: [AccommodationsController],
    providers: [{ provide: AccommodationsService, useValue: serviceMock }],
  })
    .setLogger(false as unknown as LoggerService)
    .compile();
}

// ─── GET /accommodations?caminoPointId=:id ────────────────────────────────────

describe('AccommodationsController.findByCaminoPointId()', () => {
  it('delegates to service and returns array', async () => {
    const serviceMock = {
      findByCaminoPointId: vi.fn().mockResolvedValue([mockDto]),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(AccommodationsController);

    const result = await controller.findByCaminoPointId(CAMINO_POINT_ID);

    expect(serviceMock.findByCaminoPointId).toHaveBeenCalledWith(CAMINO_POINT_ID);
    expect(result).toEqual([mockDto]);
  });

  it('throws BadRequestException when caminoPointId is undefined', async () => {
    const serviceMock = { findByCaminoPointId: vi.fn() };
    const module = await buildModule(serviceMock);
    const controller = module.get(AccommodationsController);

    await expect(
      controller.findByCaminoPointId(undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(serviceMock.findByCaminoPointId).not.toHaveBeenCalled();
  });

  it('returns an empty array when waypoint has no accommodations', async () => {
    const serviceMock = {
      findByCaminoPointId: vi.fn().mockResolvedValue([]),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(AccommodationsController);

    const result = await controller.findByCaminoPointId(CAMINO_POINT_ID);

    expect(result).toEqual([]);
  });
});

// ─── GET /accommodations/:id ──────────────────────────────────────────────────

describe('AccommodationsController.findById()', () => {
  it('delegates to service and returns AccommodationDetailDto', async () => {
    const serviceMock = {
      findById: vi.fn().mockResolvedValue(mockDto),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(AccommodationsController);

    const result = await controller.findById(ACCOMMODATION_ID);

    expect(serviceMock.findById).toHaveBeenCalledWith(ACCOMMODATION_ID);
    expect(result).toEqual(mockDto);
  });

  it('propagates NotFoundException from service', async () => {
    const serviceMock = {
      findById: vi.fn().mockRejectedValue(new NotFoundException('Accommodation not found.')),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(AccommodationsController);

    await expect(
      controller.findById('unknown-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── PATCH /accommodations/:id ───────────────────────────────────────────────

describe('AccommodationsController.update()', () => {
  it('delegates to service with roles and returns updated dto', async () => {
    const updated = { ...mockDto, name: 'Updated Name' };
    const serviceMock = {
      update: vi.fn().mockResolvedValue(updated),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(AccommodationsController);

    const dto = Object.assign(new UpdateAccommodationDto(), { name: 'Updated Name' });
    const result = await controller.update(
      ACCOMMODATION_ID,
      dto,
      mockRequest as never,
    );

    expect(serviceMock.update).toHaveBeenCalledWith(
      ACCOMMODATION_ID,
      dto,
      mockRequest.user.roles,
      mockRequest.user.sub,
    );
    expect(result.name).toBe('Updated Name');
  });

  it('propagates ForbiddenException when service throws', async () => {
    const serviceMock = {
      update: vi.fn().mockRejectedValue(new ForbiddenException('Requires pilgrim role.')),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(AccommodationsController);

    const dto = Object.assign(new UpdateAccommodationDto(), { name: 'x' });
    await expect(
      controller.update(ACCOMMODATION_ID, dto, mockRequest as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('propagates NotFoundException when service throws', async () => {
    const serviceMock = {
      update: vi.fn().mockRejectedValue(new NotFoundException('Accommodation not found.')),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(AccommodationsController);

    const dto = Object.assign(new UpdateAccommodationDto(), { name: 'x' });
    await expect(
      controller.update(ACCOMMODATION_ID, dto, mockRequest as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── DELETE /accommodations/:id ──────────────────────────────────────────────

describe('AccommodationsController.delete()', () => {
  it('delegates to service and resolves with undefined', async () => {
    const serviceMock = {
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(AccommodationsController);

    await expect(
      controller.delete(ACCOMMODATION_ID, mockRequest as never),
    ).resolves.toBeUndefined();
    expect(serviceMock.delete).toHaveBeenCalledWith(
      ACCOMMODATION_ID,
      mockRequest.user.sub,
      mockRequest.user.roles,
    );
  });

  it('propagates ForbiddenException when service throws', async () => {
    const serviceMock = {
      delete: vi.fn().mockRejectedValue(new ForbiddenException('Requires pilgrim role.')),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(AccommodationsController);

    await expect(
      controller.delete(ACCOMMODATION_ID, mockRequest as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('propagates NotFoundException when service throws', async () => {
    const serviceMock = {
      delete: vi.fn().mockRejectedValue(new NotFoundException('Accommodation not found.')),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(AccommodationsController);

    await expect(
      controller.delete(ACCOMMODATION_ID, mockRequest as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── UpdateAccommodationDto validation ───────────────────────────────────────

describe('UpdateAccommodationDto validation', () => {
  async function validate(value: object): Promise<UpdateAccommodationDto> {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    return pipe.transform(value, {
      type: 'body',
      metatype: UpdateAccommodationDto,
    }) as Promise<UpdateAccommodationDto>;
  }

  it('accepts an empty body {} (service-level check rejects it, not DTO validation)', async () => {
    const result = await validate({});
    expect(result).toBeInstanceOf(UpdateAccommodationDto);
  });

  it('accepts a valid name string', async () => {
    const result = await validate({ name: 'New Hostel' });
    expect(result.name).toBe('New Hostel');
  });

  it('accepts a valid accommodation type', async () => {
    const result = await validate({ type: AccommodationType.hotel });
    expect(result.type).toBe(AccommodationType.hotel);
  });

  it('throws BadRequestException for an unknown accommodation type', async () => {
    await expect(validate({ type: 'tent' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a valid price range', async () => {
    const result = await validate({ priceRange: PriceRange.moderate });
    expect(result.priceRange).toBe(PriceRange.moderate);
  });

  it('throws BadRequestException for an unknown price range', async () => {
    await expect(validate({ priceRange: 'cheap' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('accepts null description (clears the field)', async () => {
    const result = await validate({ description: null });
    expect(result.description).toBeNull();
  });
});
