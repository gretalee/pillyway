import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';

import { SightsController } from './sights.controller';
import { SightsService } from './sights.service';
import { SightDetailDto } from './dto/sight-detail.dto';
import { UpdateSightDto } from './dto/update-sight.dto';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SIGHT_ID = 'si-1111-0000-0000-0000-000000000000';
const CAMINO_POINT_ID = 'pt-1111-0000-0000-0000-000000000000';
const NOW = new Date('2026-02-01T00:00:00.000Z');

const mockDto: SightDetailDto = {
  id: SIGHT_ID,
  caminoPointId: CAMINO_POINT_ID,
  name: 'Porte Saint-Jacques',
  description: 'Historic gateway.',
  imageUrls: [],
  verified: false,
  address: null,
  latitude: null,
  longitude: null,
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

function buildModule(serviceMock: Partial<SightsService>): Promise<TestingModule> {
  return Test.createTestingModule({
    controllers: [SightsController],
    providers: [{ provide: SightsService, useValue: serviceMock }],
  })
    .setLogger(false)
    .compile();
}

// ─── GET /sights?caminoPointId=:id ───────────────────────────────────────────

describe('SightsController.findByCaminoPointId()', () => {
  it('delegates to service and returns array', async () => {
    const serviceMock = {
      findByCaminoPointId: vi.fn().mockResolvedValue([mockDto]),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(SightsController);

    const result = await controller.findByCaminoPointId(CAMINO_POINT_ID);

    expect(serviceMock.findByCaminoPointId).toHaveBeenCalledWith(CAMINO_POINT_ID);
    expect(result).toEqual([mockDto]);
  });

  it('throws BadRequestException when caminoPointId is undefined', async () => {
    const serviceMock = { findByCaminoPointId: vi.fn() };
    const module = await buildModule(serviceMock);
    const controller = module.get(SightsController);

    await expect(
      controller.findByCaminoPointId(undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(serviceMock.findByCaminoPointId).not.toHaveBeenCalled();
  });

  it('returns an empty array when waypoint has no sights', async () => {
    const serviceMock = {
      findByCaminoPointId: vi.fn().mockResolvedValue([]),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(SightsController);

    const result = await controller.findByCaminoPointId(CAMINO_POINT_ID);

    expect(result).toEqual([]);
  });
});

// ─── GET /sights/:id ──────────────────────────────────────────────────────────

describe('SightsController.findById()', () => {
  it('delegates to service and returns SightDetailDto', async () => {
    const serviceMock = {
      findById: vi.fn().mockResolvedValue(mockDto),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(SightsController);

    const result = await controller.findById(SIGHT_ID);

    expect(serviceMock.findById).toHaveBeenCalledWith(SIGHT_ID);
    expect(result).toEqual(mockDto);
  });

  it('propagates NotFoundException from service', async () => {
    const serviceMock = {
      findById: vi.fn().mockRejectedValue(new NotFoundException('Sight not found.')),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(SightsController);

    await expect(controller.findById('unknown-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

// ─── PATCH /sights/:id ────────────────────────────────────────────────────────

describe('SightsController.update()', () => {
  it('delegates to service with roles and returns updated dto', async () => {
    const updated = { ...mockDto, name: 'Updated Sight' };
    const serviceMock = {
      update: vi.fn().mockResolvedValue(updated),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(SightsController);

    const dto = Object.assign(new UpdateSightDto(), { name: 'Updated Sight' });
    const result = await controller.update(SIGHT_ID, dto, mockRequest as never);

    expect(serviceMock.update).toHaveBeenCalledWith(
      SIGHT_ID,
      dto,
      mockRequest.user.roles,
    );
    expect(result.name).toBe('Updated Sight');
  });

  it('propagates ForbiddenException when service throws', async () => {
    const serviceMock = {
      update: vi.fn().mockRejectedValue(new ForbiddenException('Requires pilgrim role.')),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(SightsController);

    const dto = Object.assign(new UpdateSightDto(), { name: 'x' });
    await expect(
      controller.update(SIGHT_ID, dto, mockRequest as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('propagates NotFoundException when service throws', async () => {
    const serviceMock = {
      update: vi.fn().mockRejectedValue(new NotFoundException('Sight not found.')),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(SightsController);

    const dto = Object.assign(new UpdateSightDto(), { name: 'x' });
    await expect(
      controller.update(SIGHT_ID, dto, mockRequest as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── DELETE /sights/:id ───────────────────────────────────────────────────────

describe('SightsController.delete()', () => {
  it('delegates to service and resolves with undefined', async () => {
    const serviceMock = {
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(SightsController);

    await expect(
      controller.delete(SIGHT_ID, mockRequest as never),
    ).resolves.toBeUndefined();
    expect(serviceMock.delete).toHaveBeenCalledWith(
      SIGHT_ID,
      mockRequest.user.roles,
    );
  });

  it('propagates ForbiddenException when service throws', async () => {
    const serviceMock = {
      delete: vi.fn().mockRejectedValue(new ForbiddenException('Requires pilgrim role.')),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(SightsController);

    await expect(
      controller.delete(SIGHT_ID, mockRequest as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('propagates NotFoundException when service throws', async () => {
    const serviceMock = {
      delete: vi.fn().mockRejectedValue(new NotFoundException('Sight not found.')),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(SightsController);

    await expect(
      controller.delete(SIGHT_ID, mockRequest as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── UpdateSightDto validation ────────────────────────────────────────────────

describe('UpdateSightDto validation', () => {
  async function validate(value: object): Promise<UpdateSightDto> {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    return pipe.transform(value, {
      type: 'body',
      metatype: UpdateSightDto,
    }) as Promise<UpdateSightDto>;
  }

  it('accepts an empty body {} (service-level check rejects it, not DTO validation)', async () => {
    const result = await validate({});
    expect(result).toBeInstanceOf(UpdateSightDto);
  });

  it('accepts a valid name string', async () => {
    const result = await validate({ name: 'Cathedral' });
    expect(result.name).toBe('Cathedral');
  });

  it('accepts a valid address string', async () => {
    const result = await validate({ address: 'Calle Mayor 1' });
    expect(result.address).toBe('Calle Mayor 1');
  });

  it('accepts valid latitude and longitude together', async () => {
    const result = await validate({ latitude: 42.8, longitude: -1.64 });
    expect(result.latitude).toBe(42.8);
    expect(result.longitude).toBe(-1.64);
  });

  it('throws BadRequestException for non-numeric latitude', async () => {
    await expect(validate({ latitude: 'north', longitude: 0 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('accepts null description (clears the field)', async () => {
    const result = await validate({ description: null });
    expect(result.description).toBeNull();
  });
});
