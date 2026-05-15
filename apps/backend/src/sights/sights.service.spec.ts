import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { KindeRole } from '../auth/kinde-jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { SightsService } from './sights.service';
import { UpdateSightDto } from './dto/update-sight.dto';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SIGHT_ID = 'si-1111-0000-0000-0000';
const CAMINO_POINT_ID = 'pt-1111-0000-0000-0000';
const USER_ID = 'kinde-user-001';

const baseSight = {
  id: SIGHT_ID,
  caminoPointId: CAMINO_POINT_ID,
  name: 'Porte Saint-Jacques',
  description: 'Historic gateway.',
  imageUrls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
  verified: false,
  address: null,
  latitude: null,
  longitude: null,
  createdBy: USER_ID,
  createdAt: new Date('2026-02-01'),
  updatedAt: new Date('2026-02-01'),
};

const PILGRIM_ROLES: KindeRole[] = [{ id: 'r1', key: 'pilgrim', name: 'Pilgrim' }];
const OWNER_ROLES: KindeRole[] = [{ id: 'r2', key: 'owner', name: 'Owner' }];
const NO_ROLES: KindeRole[] = [];

// ─── Module builder ───────────────────────────────────────────────────────────

function buildModule(prismaMock: object): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      SightsService,
      { provide: PrismaService, useValue: prismaMock },
    ],
  })
    .setLogger(false)
    .compile();
}

// ─── SightsService.findById() ─────────────────────────────────────────────────

describe('SightsService.findById()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns SightDetailDto when sight exists', async () => {
    const prismaMock = {
      sight: { findUnique: vi.fn().mockResolvedValue(baseSight) },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(SightsService);

    const result = await service.findById(SIGHT_ID);

    expect(result.id).toBe(SIGHT_ID);
    expect(result.name).toBe('Porte Saint-Jacques');
  });

  it('throws NotFoundException when sight does not exist', async () => {
    const prismaMock = {
      sight: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(SightsService);

    await expect(service.findById('unknown-id')).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── SightsService.update() ───────────────────────────────────────────────────

describe('SightsService.update()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('throws ForbiddenException when user has no roles', async () => {
    const prismaMock = {
      sight: { findUnique: vi.fn(), update: vi.fn() },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(SightsService);

    const dto = Object.assign(new UpdateSightDto(), { name: 'New Name' });

    await expect(
      service.update(SIGHT_ID, dto, NO_ROLES),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.sight.update).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when user has owner role but not pilgrim', async () => {
    const prismaMock = {
      sight: { findUnique: vi.fn(), update: vi.fn() },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(SightsService);

    const dto = Object.assign(new UpdateSightDto(), { name: 'New Name' });

    await expect(
      service.update(SIGHT_ID, dto, OWNER_ROLES),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.sight.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when sight does not exist', async () => {
    const prismaMock = {
      sight: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(SightsService);

    const dto = Object.assign(new UpdateSightDto(), { name: 'New Name' });

    await expect(
      service.update('unknown-id', dto, PILGRIM_ROLES),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.sight.update).not.toHaveBeenCalled();
  });

  it('correctly removes URLs listed in removeImageUrls', async () => {
    const existingWithImages = {
      ...baseSight,
      imageUrls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
    };
    const prismaMock = {
      sight: {
        findUnique: vi.fn().mockResolvedValue(existingWithImages),
        update: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...existingWithImages, ...data }),
        ),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(SightsService);

    const dto = Object.assign(new UpdateSightDto(), {
      removeImageUrls: ['https://example.com/img1.jpg'],
    });

    const result = await service.update(SIGHT_ID, dto, PILGRIM_ROLES);

    expect(prismaMock.sight.update).toHaveBeenCalledWith(
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
      sight: {
        findUnique: vi.fn().mockResolvedValue(baseSight),
        update: vi.fn(),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(SightsService);

    const dto = Object.assign(new UpdateSightDto(), {
      imageUrls: ['https://example.com/new.jpg'],
      removeImageUrls: ['https://example.com/img1.jpg'],
    });

    await expect(
      service.update(SIGHT_ID, dto, PILGRIM_ROLES),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.sight.update).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when only latitude is provided without longitude', async () => {
    const prismaMock = {
      sight: {
        findUnique: vi.fn().mockResolvedValue(baseSight),
        update: vi.fn(),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(SightsService);

    const dto = Object.assign(new UpdateSightDto(), { latitude: 43.163 });

    await expect(
      service.update(SIGHT_ID, dto, PILGRIM_ROLES),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.sight.update).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when only longitude is provided without latitude', async () => {
    const prismaMock = {
      sight: {
        findUnique: vi.fn().mockResolvedValue(baseSight),
        update: vi.fn(),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(SightsService);

    const dto = Object.assign(new UpdateSightDto(), { longitude: -1.238 });

    await expect(
      service.update(SIGHT_ID, dto, PILGRIM_ROLES),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.sight.update).not.toHaveBeenCalled();
  });

  it('allows a pilgrim to update a sight and sets updatedAt', async () => {
    const updated = { ...baseSight, name: 'Updated Sight', updatedAt: new Date() };
    const prismaMock = {
      sight: {
        findUnique: vi.fn().mockResolvedValue(baseSight),
        update: vi.fn().mockResolvedValue(updated),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(SightsService);

    const dto = Object.assign(new UpdateSightDto(), { name: 'Updated Sight' });

    const result = await service.update(SIGHT_ID, dto, PILGRIM_ROLES);

    expect(result.name).toBe('Updated Sight');
    expect(prismaMock.sight.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ updatedAt: expect.any(Date) }),
      }),
    );
  });
});

// ─── SightsService.delete() ───────────────────────────────────────────────────

describe('SightsService.delete()', () => {
  afterEach(() => vi.restoreAllMocks());

  it('throws ForbiddenException when user has no roles', async () => {
    const prismaMock = {
      sight: { findUnique: vi.fn(), delete: vi.fn() },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(SightsService);

    await expect(
      service.delete(SIGHT_ID, NO_ROLES),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.sight.delete).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when user has owner role but not pilgrim', async () => {
    const prismaMock = {
      sight: { findUnique: vi.fn(), delete: vi.fn() },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(SightsService);

    await expect(
      service.delete(SIGHT_ID, OWNER_ROLES),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.sight.delete).not.toHaveBeenCalled();
  });

  it('calls prisma.sight.delete for pilgrim role', async () => {
    const prismaMock = {
      sight: {
        findUnique: vi.fn().mockResolvedValue(baseSight),
        delete: vi.fn().mockResolvedValue(baseSight),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(SightsService);

    await expect(
      service.delete(SIGHT_ID, PILGRIM_ROLES),
    ).resolves.toBeUndefined();
    expect(prismaMock.sight.delete).toHaveBeenCalledWith({
      where: { id: SIGHT_ID },
    });
  });

  it('throws NotFoundException when sight does not exist', async () => {
    const prismaMock = {
      sight: {
        findUnique: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(SightsService);

    await expect(
      service.delete(SIGHT_ID, PILGRIM_ROLES),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.sight.delete).not.toHaveBeenCalled();
  });
});
