import {
  ConflictException,
  InternalServerErrorException,
  Logger,
  LoggerService,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../prisma/prisma.service';
import { CaminoPointsService } from './camino-points.service';

// Suppress NestJS Logger output for error-path tests — the errors are expected.
beforeEach(() => {
  vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Helper ───────────────────────────────────────────────────────────────────

async function buildModule(
  findManyMock: ReturnType<typeof vi.fn>,
): Promise<CaminoPointsService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CaminoPointsService,
      {
        provide: PrismaService,
        useValue: { caminoPoint: { findMany: findManyMock } },
      },
    ],
  })
    .setLogger(false as unknown as LoggerService)
    .compile();
  return module.get(CaminoPointsService);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CaminoPointsService.search()', () => {
  // CAM-BE-18/19: short-circuit — must not hit DB when both params absent
  it('CAM-BE-18: returns [] immediately when both name and country are absent', async () => {
    const findManyMock = vi.fn();
    const service = await buildModule(findManyMock);

    const result = await service.search(undefined, undefined);

    expect(result).toEqual([]);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('CAM-BE-19: returns [] immediately when name is empty string and country absent', async () => {
    const findManyMock = vi.fn();
    const service = await buildModule(findManyMock);

    const result = await service.search('', undefined);

    expect(result).toEqual([]);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  // CAM-BE-17: no matches → empty array (not null, not undefined)
  it('CAM-BE-17: returns empty array when search finds no results', async () => {
    const findManyMock = vi.fn().mockResolvedValue([]);
    const service = await buildModule(findManyMock);

    const result = await service.search('xyz', 'spain');

    expect(result).toEqual([]);
  });

  // CAM-BE-16: returns matching records
  it('CAM-BE-16: returns matching records for name + country search', async () => {
    const records = [
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Santiago',
        country: 'spain',
        description: null,
      },
      {
        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        name: 'Santillana',
        country: 'spain',
        description: null,
      },
      {
        id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
        name: 'Santoña',
        country: 'spain',
        description: null,
      },
    ];
    const findManyMock = vi.fn().mockResolvedValue(records);
    const service = await buildModule(findManyMock);

    const result = await service.search('santi', 'spain');

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Santiago');
  });

  // CAM-BE-20: limit enforced at DB query level — service returns what DB returns
  it('CAM-BE-20: returns exactly 5 records when DB returns 5 (limit enforced in query)', async () => {
    const fiveRecords = Array.from({ length: 5 }, (_, i) => ({
      id: `id-${i}`,
      name: `Point ${i}`,
      country: 'spain',
      description: null,
    }));
    const findManyMock = vi.fn().mockResolvedValue(fiveRecords);
    const service = await buildModule(findManyMock);

    const result = await service.search('point', 'spain');

    expect(result).toHaveLength(5);
  });

  // name-only search (no country)
  it('returns results when only name is provided', async () => {
    const records = [
      { id: 'id-1', name: 'Saint-Jean', country: 'france', description: null },
    ];
    const findManyMock = vi.fn().mockResolvedValue(records);
    const service = await buildModule(findManyMock);

    const result = await service.search('saint', undefined);

    expect(result).toHaveLength(1);
  });

  // country-only search
  it('returns results when only country is provided', async () => {
    const records = [
      { id: 'id-1', name: 'Pamplona', country: 'spain', description: null },
    ];
    const findManyMock = vi.fn().mockResolvedValue(records);
    const service = await buildModule(findManyMock);

    const result = await service.search(undefined, 'spain');

    expect(result).toHaveLength(1);
  });

  // DB error → InternalServerErrorException
  it('throws InternalServerErrorException when DB query fails', async () => {
    const findManyMock = vi
      .fn()
      .mockRejectedValue(new Error('connection timeout'));
    const service = await buildModule(findManyMock);

    await expect(service.search('saint', 'france')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});

// ─── deleteIfUnused() ───────────────────────────────────────────────────────

interface DeleteTxMocks {
  findUnique: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  stageDeleteMany: ReturnType<typeof vi.fn>;
  pointDelete: ReturnType<typeof vi.fn>;
}

function buildDeleteTxMocks(
  overrides: Partial<DeleteTxMocks> = {},
): DeleteTxMocks {
  return {
    findUnique: vi.fn().mockResolvedValue({ id: 'point-1' }),
    count: vi.fn().mockResolvedValue(0),
    stageDeleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    pointDelete: vi.fn().mockResolvedValue({ id: 'point-1' }),
    ...overrides,
  };
}

async function buildDeleteModule(
  mocks: DeleteTxMocks,
): Promise<CaminoPointsService> {
  const tx = {
    caminoPoint: { findUnique: mocks.findUnique, delete: mocks.pointDelete },
    caminoPointOrder: { count: mocks.count },
    stage: { deleteMany: mocks.stageDeleteMany },
  };
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CaminoPointsService,
      {
        provide: PrismaService,
        useValue: {
          $transaction: vi
            .fn()
            .mockImplementation((cb: (tx: unknown) => unknown) => cb(tx)),
        },
      },
    ],
  })
    .setLogger(false as unknown as LoggerService)
    .compile();
  return module.get(CaminoPointsService);
}

describe('CaminoPointsService.deleteIfUnused()', () => {
  it('throws NotFoundException when the point does not exist, without touching stages or the point itself', async () => {
    const mocks = buildDeleteTxMocks({
      findUnique: vi.fn().mockResolvedValue(null),
    });
    const service = await buildDeleteModule(mocks);

    await expect(service.deleteIfUnused('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mocks.count).not.toHaveBeenCalled();
    expect(mocks.stageDeleteMany).not.toHaveBeenCalled();
    expect(mocks.pointDelete).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the point is still used by a camino, without deleting anything', async () => {
    const mocks = buildDeleteTxMocks({ count: vi.fn().mockResolvedValue(2) });
    const service = await buildDeleteModule(mocks);

    await expect(service.deleteIfUnused('point-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(mocks.stageDeleteMany).not.toHaveBeenCalled();
    expect(mocks.pointDelete).not.toHaveBeenCalled();
  });

  it('deletes orphaned stages then the point itself when the point is unused', async () => {
    const mocks = buildDeleteTxMocks();
    const service = await buildDeleteModule(mocks);

    await service.deleteIfUnused('point-1');

    expect(mocks.stageDeleteMany).toHaveBeenCalledWith({
      where: { OR: [{ startPointId: 'point-1' }, { endPointId: 'point-1' }] },
    });
    expect(mocks.pointDelete).toHaveBeenCalledWith({
      where: { id: 'point-1' },
    });
  });

  it('deletes the point before checking stages is irrelevant — stages must be removed first to satisfy the FK', async () => {
    const mocks = buildDeleteTxMocks();
    const service = await buildDeleteModule(mocks);

    await service.deleteIfUnused('point-1');

    const stageCallOrder = mocks.stageDeleteMany.mock.invocationCallOrder[0];
    const pointCallOrder = mocks.pointDelete.mock.invocationCallOrder[0];
    expect(stageCallOrder).toBeLessThan(pointCallOrder);
  });
});
