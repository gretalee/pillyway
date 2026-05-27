import {
  ForbiddenException,
  Logger,
  LoggerService,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../prisma/prisma.service';
import { StagesService } from './stages.service';
import { UpdateStageDto } from './dto/update-stage.dto';

// Suppress NestJS Logger output for error-path tests — the errors are expected.
beforeEach(() => {
  vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const CAMINO_ID_A = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const CAMINO_ID_B = '4fa85f64-5717-4562-b3fc-2c963f66afb7';
const STAGE_ID_1 = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const STAGE_ID_2 = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';

const PT_A = {
  id: 'pt-a',
  name: 'Start Town',
  country: 'france',
  description: null,
};
const PT_B = {
  id: 'pt-b',
  name: 'Middle Town',
  country: 'spain',
  description: null,
};
const PT_C = {
  id: 'pt-c',
  name: 'End Town',
  country: 'spain',
  description: null,
};

const NOW = new Date('2026-05-11T10:00:00.000Z');
const LATER = new Date('2026-05-11T14:00:00.000Z');

const stageRow1 = {
  id: STAGE_ID_1,
  startPointId: PT_A.id,
  endPointId: PT_B.id,
  distance: 24.7,
  description: 'First leg',
  createdAt: NOW,
  updatedAt: NOW,
};

const stageRow2 = {
  id: STAGE_ID_2,
  startPointId: PT_B.id,
  endPointId: PT_C.id,
  distance: null,
  description: null,
  createdAt: NOW,
  updatedAt: NOW,
};

/**
 * Builds a CaminoPointOrder rows array for use in mocks.
 * Each element mirrors what Prisma returns from findMany with include: { caminoPoint: true }.
 */
function makeOrderRows(points: (typeof PT_A)[]) {
  return points.map((pt, i) => ({
    caminoId: CAMINO_ID_A,
    caminoPointId: pt.id,
    position: i + 1,
    caminoPoint: pt,
  }));
}

function buildModule(prismaMock: object): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      StagesService,
      { provide: PrismaService, useValue: prismaMock },
    ],
  })
    .setLogger(false as unknown as LoggerService)
    .compile();
}

// ─── StagesService.findByCamino() ─────────────────────────────────────────────

describe('StagesService.findByCamino()', () => {
  it('returns ordered StageListItem[] for a Camino with 3 points (2 stages)', async () => {
    const prismaMock = {
      caminoPointOrder: {
        findMany: vi.fn().mockResolvedValue(makeOrderRows([PT_A, PT_B, PT_C])),
      },
      stage: {
        findMany: vi.fn().mockResolvedValue([stageRow1, stageRow2]),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    const result = await service.findByCamino(CAMINO_ID_A);

    expect(result).toHaveLength(2);
    expect(result[0].stageNumber).toBe(1);
    expect(result[0].startPoint.name).toBe('Start Town');
    expect(result[0].endPoint.name).toBe('Middle Town');
    expect(result[0].distance).toBe(24.7);
    expect(result[1].stageNumber).toBe(2);
    expect(result[1].startPoint.name).toBe('Middle Town');
    expect(result[1].endPoint.name).toBe('End Town');
    expect(result[1].distance).toBeNull();
  });

  it('returns [] for a Camino with 1 point (fewer than 2)', async () => {
    const prismaMock = {
      caminoPointOrder: {
        findMany: vi.fn().mockResolvedValue(makeOrderRows([PT_A])),
      },
      stage: {
        findMany: vi.fn(),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    const result = await service.findByCamino(CAMINO_ID_A);

    expect(result).toEqual([]);
    expect(prismaMock.stage.findMany).not.toHaveBeenCalled();
  });

  it('all returned items have a non-null id (eager creation guarantees this)', async () => {
    const prismaMock = {
      caminoPointOrder: {
        findMany: vi.fn().mockResolvedValue(makeOrderRows([PT_A, PT_B, PT_C])),
      },
      stage: {
        findMany: vi.fn().mockResolvedValue([stageRow1, stageRow2]),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    const result = await service.findByCamino(CAMINO_ID_A);

    for (const item of result) {
      expect(item.id).toBeTruthy();
    }
  });

  it('throws NotFoundException when Camino does not exist', async () => {
    const prismaMock = {
      caminoPointOrder: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      camino: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    await expect(service.findByCamino(CAMINO_ID_A)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns [] when Camino exists but has 0 points', async () => {
    const prismaMock = {
      caminoPointOrder: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      camino: {
        findUnique: vi.fn().mockResolvedValue({ id: CAMINO_ID_A }),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    const result = await service.findByCamino(CAMINO_ID_A);

    expect(result).toEqual([]);
  });
});

// ─── StagesService.findOne() ──────────────────────────────────────────────────

describe('StagesService.findOne()', () => {
  function makeOrderRowsForCamino(caminoId: string, points: (typeof PT_A)[]) {
    return points.map((pt, i) => ({
      caminoId,
      caminoPointId: pt.id,
      position: i + 1,
      caminoPoint: pt,
    }));
  }

  it('returns previousStage: null for stage 1', async () => {
    const prismaMock = {
      caminoPointOrder: {
        findMany: vi
          .fn()
          .mockResolvedValue(
            makeOrderRowsForCamino(CAMINO_ID_A, [PT_A, PT_B, PT_C]),
          ),
      },
      stage: {
        findUnique: vi.fn().mockResolvedValue(stageRow1),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    const result = await service.findOne(CAMINO_ID_A, 1);

    expect(result.stageNumber).toBe(1);
    expect(result.previousStage).toBeNull();
    expect(result.nextStage).not.toBeNull();
    expect(result.nextStage!.stageNumber).toBe(2);
    expect(result.nextStage!.startPointName).toBe('Middle Town');
    expect(result.nextStage!.endPointName).toBe('End Town');
  });

  it('returns nextStage: null for the last stage', async () => {
    const prismaMock = {
      caminoPointOrder: {
        findMany: vi
          .fn()
          .mockResolvedValue(
            makeOrderRowsForCamino(CAMINO_ID_A, [PT_A, PT_B, PT_C]),
          ),
      },
      stage: {
        findUnique: vi.fn().mockResolvedValue(stageRow2),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    const result = await service.findOne(CAMINO_ID_A, 2);

    expect(result.stageNumber).toBe(2);
    expect(result.nextStage).toBeNull();
    expect(result.previousStage).not.toBeNull();
    expect(result.previousStage!.stageNumber).toBe(1);
    expect(result.previousStage!.startPointName).toBe('Start Town');
    expect(result.previousStage!.endPointName).toBe('Middle Town');
  });

  it('returns both adjacent summaries for a middle stage (4 points, stage 2)', async () => {
    const PT_D = {
      id: 'pt-d',
      name: 'Far Town',
      country: 'Portugal',
      description: null,
    };
    const stageRow3 = {
      id: 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
      startPointId: PT_B.id,
      endPointId: PT_C.id,
      distance: 15.0,
      description: null,
      createdAt: NOW,
      updatedAt: NOW,
    };

    const prismaMock = {
      caminoPointOrder: {
        findMany: vi
          .fn()
          .mockResolvedValue(
            makeOrderRowsForCamino(CAMINO_ID_A, [PT_A, PT_B, PT_C, PT_D]),
          ),
      },
      stage: {
        findUnique: vi.fn().mockResolvedValue(stageRow3),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    const result = await service.findOne(CAMINO_ID_A, 2);

    expect(result.stageNumber).toBe(2);
    expect(result.previousStage).not.toBeNull();
    expect(result.previousStage!.stageNumber).toBe(1);
    expect(result.nextStage).not.toBeNull();
    expect(result.nextStage!.stageNumber).toBe(3);
  });

  it('throws NotFoundException for stageNumber = 0', async () => {
    const prismaMock = {
      caminoPointOrder: {
        findMany: vi
          .fn()
          .mockResolvedValue(makeOrderRowsForCamino(CAMINO_ID_A, [PT_A, PT_B])),
      },
      stage: { findUnique: vi.fn() },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    await expect(service.findOne(CAMINO_ID_A, 0)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws NotFoundException for stageNumber exceeding total stages', async () => {
    const prismaMock = {
      caminoPointOrder: {
        findMany: vi
          .fn()
          .mockResolvedValue(makeOrderRowsForCamino(CAMINO_ID_A, [PT_A, PT_B])),
      },
      stage: { findUnique: vi.fn() },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    // 2 points → 1 stage; requesting stage 2 is out of range
    await expect(service.findOne(CAMINO_ID_A, 2)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws NotFoundException for negative stageNumber', async () => {
    const prismaMock = {
      caminoPointOrder: {
        findMany: vi
          .fn()
          .mockResolvedValue(
            makeOrderRowsForCamino(CAMINO_ID_A, [PT_A, PT_B, PT_C]),
          ),
      },
      stage: { findUnique: vi.fn() },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    await expect(service.findOne(CAMINO_ID_A, -1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws NotFoundException when Camino does not exist', async () => {
    const prismaMock = {
      caminoPointOrder: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      camino: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    await expect(service.findOne(CAMINO_ID_A, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

// ─── StagesService.update() ───────────────────────────────────────────────────

describe('StagesService.update()', () => {
  function makeUpdatePrismaMock(stageForFindUnique = stageRow1) {
    return {
      caminoPointOrder: {
        findMany: vi.fn().mockResolvedValue(makeOrderRows([PT_A, PT_B, PT_C])),
      },
      camino: {
        findUnique: vi.fn().mockResolvedValue({ id: CAMINO_ID_A }),
      },
      stage: {
        findUnique: vi.fn().mockResolvedValue(stageForFindUnique),
        upsert: vi.fn().mockResolvedValue(stageForFindUnique),
      },
    };
  }

  const distanceDto: UpdateStageDto = { distance: 30.5 } as UpdateStageDto;

  it('updates distance and returns StageDetail when user has pilgrim role', async () => {
    const updatedRow = { ...stageRow1, distance: 30.5, updatedAt: LATER };
    const prismaMock = {
      caminoPointOrder: {
        findMany: vi.fn().mockResolvedValue(makeOrderRows([PT_A, PT_B, PT_C])),
      },
      stage: {
        findUnique: vi.fn().mockResolvedValue(updatedRow),
        upsert: vi.fn().mockResolvedValue(updatedRow),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    const result = await service.update(CAMINO_ID_A, 1, distanceDto, [
      'pilgrim',
    ]);

    expect(prismaMock.stage.upsert).toHaveBeenCalledOnce();
    expect(result.distance).toBe(30.5);
    expect(result.stageNumber).toBe(1);
  });

  it('creates the stage row when it does not exist yet (legacy camino, no prior GET)', async () => {
    const createdRow = { ...stageRow1, distance: 30.5, updatedAt: LATER };
    const prismaMock = {
      caminoPointOrder: {
        findMany: vi.fn().mockResolvedValue(makeOrderRows([PT_A, PT_B, PT_C])),
      },
      stage: {
        // findOne (called by update → findOne internally) returns the row after upsert
        findUnique: vi.fn().mockResolvedValue(createdRow),
        upsert: vi.fn().mockResolvedValue(createdRow),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    const result = await service.update(CAMINO_ID_A, 1, distanceDto, [
      'pilgrim',
    ]);

    expect(prismaMock.stage.upsert).toHaveBeenCalledOnce();
    const call = prismaMock.stage.upsert.mock.calls[0][0];
    expect(call.create).toMatchObject({
      startPointId: PT_A.id,
      endPointId: PT_B.id,
      distance: 30.5,
    });
    expect(result.distance).toBe(30.5);
  });

  it('clears distance to null and returns StageDetail', async () => {
    const clearedRow = { ...stageRow1, distance: null, updatedAt: LATER };
    const prismaMock = {
      caminoPointOrder: {
        findMany: vi.fn().mockResolvedValue(makeOrderRows([PT_A, PT_B, PT_C])),
      },
      stage: {
        findUnique: vi.fn().mockResolvedValue(clearedRow),
        upsert: vi.fn().mockResolvedValue(clearedRow),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    const dto: UpdateStageDto = { distance: null } as UpdateStageDto;
    const result = await service.update(CAMINO_ID_A, 1, dto, ['pilgrim']);

    expect(result.distance).toBeNull();
  });

  it('clears description to null and returns StageDetail', async () => {
    const clearedRow = { ...stageRow1, description: null, updatedAt: LATER };
    const prismaMock = {
      caminoPointOrder: {
        findMany: vi.fn().mockResolvedValue(makeOrderRows([PT_A, PT_B, PT_C])),
      },
      stage: {
        findUnique: vi.fn().mockResolvedValue(clearedRow),
        upsert: vi.fn().mockResolvedValue(clearedRow),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    const dto: UpdateStageDto = { description: null } as UpdateStageDto;
    const result = await service.update(CAMINO_ID_A, 1, dto, ['pilgrim']);

    expect(result.description).toBeNull();
  });

  it('cross-Camino visibility: PATCH via Camino A is reflected when read via Camino B', async () => {
    // Both caminos share the same PT_A → PT_B pair.
    const updatedRow = { ...stageRow1, distance: 42.0, updatedAt: LATER };
    const orderRowsForA = makeOrderRows([PT_A, PT_B, PT_C]);
    const orderRowsForB = [PT_A, PT_B].map((pt, i) => ({
      caminoId: CAMINO_ID_B,
      caminoPointId: pt.id,
      position: i + 1,
      caminoPoint: pt,
    }));

    let findManyCalls = 0;
    const prismaMock = {
      caminoPointOrder: {
        // First call is from update (Camino A), subsequent calls from findOne (both caminos)
        findMany: vi.fn().mockImplementation(() => {
          findManyCalls++;
          if (findManyCalls === 1) return Promise.resolve(orderRowsForA);
          if (findManyCalls === 2) return Promise.resolve(orderRowsForA);
          return Promise.resolve(orderRowsForB);
        }),
      },
      stage: {
        findUnique: vi.fn().mockResolvedValue(updatedRow),
        upsert: vi.fn().mockResolvedValue(updatedRow),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    const dto: UpdateStageDto = { distance: 42.0 } as UpdateStageDto;
    await service.update(CAMINO_ID_A, 1, dto, ['pilgrim']);

    // Reading the same stage via Camino B's context uses the same underlying Stage row
    const resultFromB = await service.findOne(CAMINO_ID_B, 1);

    // The mocked stage row (updatedRow) is returned regardless of which camino context is used,
    // which represents the shared-row reuse: both Caminos reference the same Stage record.
    expect(resultFromB.distance).toBe(42.0);
    expect(resultFromB.startPoint.id).toBe(PT_A.id);
    expect(resultFromB.endPoint.id).toBe(PT_B.id);
  });

  it('throws ForbiddenException when user has no pilgrim role', async () => {
    const prismaMock = makeUpdatePrismaMock();
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    await expect(
      service.update(CAMINO_ID_A, 1, distanceDto, []),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.stage.upsert).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when user only has an unrelated role', async () => {
    const prismaMock = makeUpdatePrismaMock();
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    await expect(
      service.update(CAMINO_ID_A, 1, distanceDto, ['viewer']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFoundException when Camino does not exist', async () => {
    const prismaMock = {
      caminoPointOrder: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      camino: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      stage: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    await expect(
      service.update(CAMINO_ID_A, 1, distanceDto, ['pilgrim']),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.stage.upsert).not.toHaveBeenCalled();
  });

  it('throws NotFoundException for out-of-range stageNumber', async () => {
    const prismaMock = {
      caminoPointOrder: {
        findMany: vi.fn().mockResolvedValue(makeOrderRows([PT_A, PT_B])),
      },
      stage: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);

    // 2 points → 1 stage; requesting stage 5 is out of range
    await expect(
      service.update(CAMINO_ID_A, 5, distanceDto, ['pilgrim']),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.stage.upsert).not.toHaveBeenCalled();
  });
});

// ─── StagesService.upsertStagePairs() ────────────────────────────────────────

describe('StagesService.upsertStagePairs()', () => {
  function makeTxMock() {
    return {
      stage: {
        upsert: vi.fn().mockResolvedValue(stageRow1),
      },
    };
  }

  it('makes no upsert calls for 0 point IDs', async () => {
    const prismaMock = {};
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);
    const tx = makeTxMock();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await service.upsertStagePairs([], tx as any);

    expect(tx.stage.upsert).not.toHaveBeenCalled();
  });

  it('makes no upsert calls for 1 point ID', async () => {
    const prismaMock = {};
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);
    const tx = makeTxMock();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await service.upsertStagePairs([PT_A.id], tx as any);

    expect(tx.stage.upsert).not.toHaveBeenCalled();
  });

  it('makes exactly 1 upsert call for 2 point IDs', async () => {
    const prismaMock = {};
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);
    const tx = makeTxMock();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await service.upsertStagePairs([PT_A.id, PT_B.id], tx as any);

    expect(tx.stage.upsert).toHaveBeenCalledOnce();
    expect(tx.stage.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          startPointId_endPointId: {
            startPointId: PT_A.id,
            endPointId: PT_B.id,
          },
        },
      }),
    );
  });

  it('makes exactly 2 upsert calls in order for 3 point IDs', async () => {
    const prismaMock = {};
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);
    const tx = makeTxMock();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await service.upsertStagePairs([PT_A.id, PT_B.id, PT_C.id], tx as any);

    expect(tx.stage.upsert).toHaveBeenCalledTimes(2);
    const firstCall = tx.stage.upsert.mock.calls[0][0];
    const secondCall = tx.stage.upsert.mock.calls[1][0];
    expect(firstCall.where.startPointId_endPointId.startPointId).toBe(PT_A.id);
    expect(firstCall.where.startPointId_endPointId.endPointId).toBe(PT_B.id);
    expect(secondCall.where.startPointId_endPointId.startPointId).toBe(PT_B.id);
    expect(secondCall.where.startPointId_endPointId.endPointId).toBe(PT_C.id);
  });

  it('does not create a duplicate when called twice with the same pair (no-op update)', async () => {
    const prismaMock = {};
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);
    const tx = makeTxMock();
    tx.stage.upsert = vi
      .fn()
      .mockResolvedValueOnce(stageRow1) // first call: creates the row
      .mockResolvedValueOnce(stageRow1); // second call: no-op update, returns same row

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await service.upsertStagePairs([PT_A.id, PT_B.id], tx as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await service.upsertStagePairs([PT_A.id, PT_B.id], tx as any);

    expect(tx.stage.upsert).toHaveBeenCalledTimes(2);
    // Both calls used the same where clause — the second one is the no-op
    const [call1, call2] = tx.stage.upsert.mock.calls;
    expect(call1[0].where).toEqual(call2[0].where);
    // The update payload is empty: existing data is preserved
    expect(call1[0].update).toEqual({});
  });

  it('propagates DB errors out of the method', async () => {
    const dbError = new Error('DB connection timeout');
    const prismaMock = {};
    const module = await buildModule(prismaMock);
    const service = module.get(StagesService);
    const tx = {
      stage: {
        upsert: vi.fn().mockRejectedValue(dbError),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(
      service.upsertStagePairs([PT_A.id, PT_B.id], tx as any),
    ).rejects.toThrow('DB connection timeout');
  });
});
