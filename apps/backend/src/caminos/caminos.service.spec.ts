import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  LoggerService,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KindeRole } from '../auth/kinde-jwt.strategy';
import { DeleteAuthorizationService } from '../common/delete-authorization.service';
import { EventLogService } from '../event-log/event-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { StagesService } from '../stages/stages.service';
import { UploadsService } from '../uploads/uploads.service';
import { CaminosService } from './caminos.service';
import { CreateCaminoDto } from './dto/create-camino.dto';
import { UpdateCaminoDto } from './dto/update-camino.dto';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Builds the transaction mock object used inside the $transaction callback.
 * Each method can be overridden by callers via spread to set up specific scenarios.
 */
function makeTx() {
  return {
    camino: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        name: 'Camino Francés',
        description: 'The most popular route.',
        verified: false,
        createdBy: 'kinde-user-001',
      }),
    },
    caminoPoint: {
      findUnique: vi.fn(),
      upsert: vi.fn().mockResolvedValue({
        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        name: 'Saint-Jean-Pied-de-Port',
        country: 'france',
        description: null,
      }),
    },
    caminoPointOrder: {
      create: vi.fn().mockResolvedValue({}),
    },
  };
}

// StagesService mock used by all CaminosService tests.
// upsertStagePairs must be a no-op so it does not interfere with the transaction
// mock callback (it receives the tx object but does nothing with it).
const stagesServiceMock = {
  upsertStagePairs: vi.fn().mockResolvedValue(undefined),
};

// Minimal UploadsService mock. CaminosService only calls deleteImages in delete(),
// which is tested separately in the camino-pictures spec. For all other tests,
// the mock just needs to satisfy DI.
const uploadsServiceMock = {
  deleteImages: vi.fn().mockResolvedValue(undefined),
};

const eventLogMock = { logEvent: vi.fn() };

// Suppress NestJS Logger output for error-path tests — the errors are expected.
beforeEach(() => {
  vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  stagesServiceMock.upsertStagePairs.mockClear();
  uploadsServiceMock.deleteImages.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function buildModule(prismaMock: object): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      CaminosService,
      { provide: PrismaService, useValue: prismaMock },
      { provide: StagesService, useValue: stagesServiceMock },
      DeleteAuthorizationService,
      { provide: UploadsService, useValue: uploadsServiceMock },
      { provide: EventLogService, useValue: eventLogMock },
    ],
  })
    .setLogger(false as unknown as LoggerService)
    .compile();
}

// ─── Shared DTOs ─────────────────────────────────────────────────────────────

const newPointDto: CreateCaminoDto = {
  name: 'Camino Francés',
  description: 'The most popular route.',
  caminoPoints: [{ name: 'Saint-Jean-Pied-de-Port', country: 'france' }],
};

const existingPointDto: CreateCaminoDto = {
  name: 'Camino del Norte',
  caminoPoints: [{ caminoPointId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }],
};

const mixedDto: CreateCaminoDto = {
  name: 'Camino Mixto',
  caminoPoints: [
    { caminoPointId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
    { name: 'Roncesvalles', country: 'spain' },
  ],
};

const threeNewPointsDto: CreateCaminoDto = {
  name: 'Camino Triple',
  caminoPoints: [
    { name: 'Irún', country: 'spain' },
    { name: 'San Sebastián', country: 'spain' },
    { name: 'Zarautz', country: 'spain' },
  ],
};

// ─── CaminosService.create() — Happy paths ───────────────────────────────────

describe('CaminosService.create()', () => {
  // CAM-BE-01: creates camino + one brand-new caminoPoint
  it('CAM-BE-01: creates camino with one new caminoPoint via Prisma transaction', async () => {
    const tx = makeTx();
    const prismaMock = {
      $transaction: vi
        .fn()
        .mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) =>
          cb(tx),
        ),
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    const result = await service.create(newPointDto, 'kinde-user-001');

    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(tx.camino.create).toHaveBeenCalledOnce();
    expect(tx.caminoPoint.upsert).toHaveBeenCalledOnce();
    expect(tx.caminoPointOrder.create).toHaveBeenCalledOnce();
    expect(result.id).toBe('3fa85f64-5717-4562-b3fc-2c963f66afa6');
    expect(result.caminoPoints).toHaveLength(1);
    expect(result.caminoPoints[0].position).toBe(1);
  });

  // CAM-BE-02: creates camino + links one existing caminoPoint by ID
  it('CAM-BE-02: creates camino linking an existing caminoPoint by ID', async () => {
    const tx = makeTx();
    tx.camino.create = vi.fn().mockResolvedValue({
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Camino del Norte',
      description: null,
      verified: false,
      createdBy: 'kinde-user-001',
    });
    tx.caminoPoint.findUnique = vi.fn().mockResolvedValue({
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'Irún',
      country: 'spain',
      description: null,
    });
    const prismaMock = {
      $transaction: vi
        .fn()
        .mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) =>
          cb(tx),
        ),
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    const result = await service.create(existingPointDto, 'kinde-user-001');

    expect(result.caminoPoints[0].id).toBe(
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    );
    expect(tx.caminoPoint.findUnique).toHaveBeenCalledOnce();
    expect(tx.caminoPoint.upsert).not.toHaveBeenCalled();
  });

  // CAM-BE-03: mixed array — existing + new
  it('CAM-BE-03: creates camino with mixed existing and new points', async () => {
    const tx = makeTx();
    tx.camino.create = vi.fn().mockResolvedValue({
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Camino Mixto',
      description: null,
      verified: false,
      createdBy: 'kinde-user-001',
    });
    tx.caminoPoint.findUnique = vi.fn().mockImplementation(({ where }) => {
      // ID lookup (existing point resolution) — return the fixture point
      if (where.id) {
        return Promise.resolve({
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          name: 'Irún',
          country: 'spain',
          slug: 'irun',
          description: null,
        });
      }
      // Slug uniqueness check inside generateSlug — slug is free, return null
      return Promise.resolve(null);
    });
    tx.caminoPoint.upsert = vi.fn().mockResolvedValue({
      id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      name: 'Roncesvalles',
      country: 'spain',
      slug: 'roncesvalles',
      description: null,
    });
    const prismaMock = {
      $transaction: vi
        .fn()
        .mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) =>
          cb(tx),
        ),
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    const result = await service.create(mixedDto, 'kinde-user-001');

    expect(result.caminoPoints).toHaveLength(2);
    expect(result.caminoPoints[0].position).toBe(1);
    expect(result.caminoPoints[1].position).toBe(2);
  });

  // CAM-BE-04: three new points in order
  it('CAM-BE-04: creates camino with three new points and correct positions', async () => {
    const tx = makeTx();
    tx.camino.create = vi.fn().mockResolvedValue({
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Camino Triple',
      description: null,
      verified: false,
      createdBy: 'kinde-user-001',
    });
    let upsertCallCount = 0;
    const upsertResults = [
      { id: 'id-1', name: 'Irún', country: 'spain', description: null },
      {
        id: 'id-2',
        name: 'San Sebastián',
        country: 'spain',
        description: null,
      },
      { id: 'id-3', name: 'Zarautz', country: 'spain', description: null },
    ];
    tx.caminoPoint.upsert = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(upsertResults[upsertCallCount++]),
      );
    const prismaMock = {
      $transaction: vi
        .fn()
        .mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) =>
          cb(tx),
        ),
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    const result = await service.create(threeNewPointsDto, 'kinde-user-001');

    expect(result.caminoPoints).toHaveLength(3);
    expect(result.caminoPoints.map((p) => p.position)).toEqual([1, 2, 3]);
  });
});

// ─── CaminosService.create() — Exception mapping ─────────────────────────────

describe('CaminosService.create() — error mapping', () => {
  // CAM-BE-07: non-existent caminoPointId → BadRequestException
  it('CAM-BE-07: throws BadRequestException when caminoPointId is not found in DB', async () => {
    const tx = makeTx();
    tx.caminoPoint.findUnique = vi.fn().mockResolvedValue(null);
    const prismaMock = {
      $transaction: vi
        .fn()
        .mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) =>
          cb(tx),
        ),
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    await expect(
      service.create(existingPointDto, 'kinde-user-001'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // CAM-BE-07 message content
  it('CAM-BE-07: BadRequestException message contains the missing point ID', async () => {
    const pointId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const tx = makeTx();
    tx.caminoPoint.findUnique = vi.fn().mockResolvedValue(null);
    const prismaMock = {
      $transaction: vi
        .fn()
        .mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) =>
          cb(tx),
        ),
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    await expect(
      service.create(existingPointDto, 'kinde-user-001'),
    ).rejects.toThrow(pointId);
  });

  // Camino name already exists → ConflictException (409)
  it('maps existing camino name to ConflictException (409)', async () => {
    const tx = makeTx();
    tx.camino.findFirst = vi.fn().mockResolvedValue({
      id: 'x',
      name: 'Camino Francés',
    });
    const prismaMock = {
      $transaction: vi
        .fn()
        .mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) =>
          cb(tx),
        ),
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    await expect(
      service.create(newPointDto, 'kinde-user-001'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  // Duplicate new-point definitions in request → BadRequestException
  it('maps duplicate new-point definitions in request to BadRequestException (400)', async () => {
    const tx = makeTx();
    const prismaMock = {
      $transaction: vi
        .fn()
        .mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) =>
          cb(tx),
        ),
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    const duplicateDto: CreateCaminoDto = {
      name: 'Camino Duplicado',
      caminoPoints: [
        { name: 'Irún', country: 'spain' },
        { name: 'irún', country: 'spain' }, // same point, different casing
      ],
    };

    await expect(
      service.create(duplicateDto, 'kinde-user-001'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // Prisma P2002 on camino name index → ConflictException
  it('maps Prisma P2002 on camino name index to ConflictException', async () => {
    const { Prisma } = await import('@prisma/client');
    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`name`)',
      {
        code: 'P2002',
        clientVersion: '7.0.0',
        meta: { target: ['name'], modelName: 'Camino' },
      },
    );
    const prismaMock = {
      $transaction: vi.fn().mockRejectedValue(p2002Error),
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    await expect(
      service.create(newPointDto, 'kinde-user-001'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  // Prisma P2002 on a non-name constraint → InternalServerErrorException (not a name conflict)
  it('maps Prisma P2002 on non-name constraint to InternalServerErrorException', async () => {
    const { Prisma } = await import('@prisma/client');
    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`camino_id`, `position`)',
      {
        code: 'P2002',
        clientVersion: '7.0.0',
        meta: {
          target: ['camino_id', 'position'],
          modelName: 'CaminoPointOrder',
        },
      },
    );
    const prismaMock = {
      $transaction: vi.fn().mockRejectedValue(p2002Error),
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    await expect(
      service.create(newPointDto, 'kinde-user-001'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  // Unrecognised DB error → InternalServerErrorException
  it('throws InternalServerErrorException for unknown DB errors', async () => {
    const prismaMock = {
      $transaction: vi.fn().mockRejectedValue(new Error('unexpected pg error')),
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    await expect(
      service.create(newPointDto, 'kinde-user-001'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

// ─── Shared helpers for findById / update / delete ───────────────────────────

const CAMINO_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const OWNER_ID = 'kinde-owner-001';
const OTHER_ID = 'kinde-other-001';

const PILGRIM_ROLES: KindeRole[] = [
  { id: 'r1', key: 'pilgrim', name: 'Pilgrim' },
];
const OWNER_ROLES: KindeRole[] = [{ id: 'r2', key: 'owner', name: 'Owner' }];
const OWNER_AND_PILGRIM_ROLES: KindeRole[] = [
  { id: 'r1', key: 'pilgrim', name: 'Pilgrim' },
  { id: 'r2', key: 'owner', name: 'Owner' },
];
const NO_ROLES: KindeRole[] = [];

const baseCamino = {
  id: CAMINO_ID,
  name: 'Camino Francés',
  description: 'A popular route.',
  verified: false,
  createdBy: OWNER_ID,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const caminoWithOrder = {
  ...baseCamino,
  caminoPointOrder: [
    {
      position: 1,
      caminoPoint: {
        id: 'pt-1',
        name: 'Saint-Jean',
        country: 'france',
        description: null,
      },
    },
  ],
};

// Shape returned by findUnique with { select: { caminoPointId: true } } —
// used by update() to detect whether existing waypoints are being removed.
const caminoWithPointIds = {
  ...baseCamino,
  caminoPointOrder: [{ caminoPointId: 'pt-1' }],
};

// ─── CaminosService.findById() ───────────────────────────────────────────────

describe('CaminosService.findById()', () => {
  it('returns CaminoDetailFull with ordered caminoPoints when camino exists', async () => {
    const prismaMock = {
      camino: { findUnique: vi.fn().mockResolvedValue(caminoWithOrder) },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    const result = await service.findById(CAMINO_ID);

    expect(result.id).toBe(CAMINO_ID);
    expect(result.caminoPoints).toHaveLength(1);
    expect(result.caminoPoints[0].position).toBe(1);
  });

  it('throws NotFoundException when camino does not exist', async () => {
    const prismaMock = {
      camino: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    await expect(service.findById(CAMINO_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

// ─── CaminosService.update() ─────────────────────────────────────────────────

describe('CaminosService.update()', () => {
  // DTO without caminoPoints — name-only update, removal check never triggered
  const nameDto: UpdateCaminoDto = {
    name: 'Camino Updated',
  };

  // DTO whose only point is a brand-new one — existing pt-1 is absent → triggers removal check
  const removalDto: UpdateCaminoDto = {
    caminoPoints: [{ name: 'New Point', country: 'spain' }],
  };

  // Builds a Prisma mock suitable for update() tests.
  // firstResult  — returned by the first camino.findUnique (existence + removal check)
  // secondResult — returned by the second camino.findUnique (findById after update)
  function makeUpdatePrismaMock(
    firstResult: object = caminoWithPointIds,
    secondResult: object = caminoWithOrder,
  ) {
    const caminoMock = {
      findUnique: vi
        .fn()
        .mockResolvedValueOnce(firstResult)
        .mockResolvedValueOnce(secondResult),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(baseCamino),
    };

    const tx = {
      camino: caminoMock,
      caminoPointOrder: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({}),
      },
      caminoPoint: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({
          id: 'new-pt-id',
          name: 'New Point',
          country: 'spain',
          slug: 'new-point',
          description: null,
        }),
      },
    };

    return {
      camino: caminoMock,
      $transaction: vi
        .fn()
        .mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) =>
          cb(tx as unknown as ReturnType<typeof makeTx>),
        ),
    };
  }

  // ─ Name/description edits: any pilgrim is allowed ────────────────────────

  it('allows any pilgrim to update name or description regardless of creator or time window', async () => {
    const prismaMock = makeUpdatePrismaMock();
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    const result = await service.update(
      CAMINO_ID,
      nameDto,
      OTHER_ID,
      PILGRIM_ROLES,
    );
    expect(result.id).toBe(CAMINO_ID);
  });

  it('throws ForbiddenException when user has no pilgrim role', async () => {
    const prismaMock = makeUpdatePrismaMock();
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    await expect(
      service.update(CAMINO_ID, nameDto, OTHER_ID, NO_ROLES),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  // ─ Waypoint removal: requires owner or creator-within-window ─────────────

  it('allows a user with owner role to remove waypoints from any camino', async () => {
    const prismaMock = makeUpdatePrismaMock();
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    const result = await service.update(
      CAMINO_ID,
      removalDto,
      OTHER_ID,
      OWNER_AND_PILGRIM_ROLES,
    );
    expect(result.id).toBe(CAMINO_ID);
  });

  it('allows the creator to remove waypoints within the time window', async () => {
    const recentWithIds = {
      ...caminoWithPointIds,
      createdBy: OWNER_ID,
      createdAt: new Date(Date.now() - 60 * 1000),
    };
    const recentWithOrder = {
      ...caminoWithOrder,
      createdBy: OWNER_ID,
      createdAt: recentWithIds.createdAt,
    };
    const prismaMock = makeUpdatePrismaMock(recentWithIds, recentWithOrder);
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    const result = await service.update(
      CAMINO_ID,
      removalDto,
      OWNER_ID,
      PILGRIM_ROLES,
    );
    expect(result.id).toBe(CAMINO_ID);
  });

  it('throws ForbiddenException when a non-creator pilgrim tries to remove waypoints', async () => {
    // baseCamino.createdBy is OWNER_ID — OTHER_ID is not the creator
    const prismaMock = makeUpdatePrismaMock();
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    await expect(
      service.update(CAMINO_ID, removalDto, OTHER_ID, PILGRIM_ROLES),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws ForbiddenException when creator is outside the time window and tries to remove waypoints', async () => {
    // baseCamino.createdAt is 2026-01-01 — well outside the 2-hour window
    const prismaMock = makeUpdatePrismaMock();
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    await expect(
      service.update(CAMINO_ID, removalDto, OWNER_ID, PILGRIM_ROLES),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  // ─ Common error cases ─────────────────────────────────────────────────────

  it('throws NotFoundException when camino does not exist', async () => {
    const prismaMock = makeUpdatePrismaMock();
    prismaMock.camino.findUnique = vi.fn().mockResolvedValue(null);
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    await expect(
      service.update(CAMINO_ID, nameDto, OWNER_ID, NO_ROLES),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when new name conflicts with another camino', async () => {
    const prismaMock = makeUpdatePrismaMock();
    prismaMock.camino.findFirst = vi
      .fn()
      .mockResolvedValue({ id: 'other-id', name: 'Camino Updated' });
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    await expect(
      service.update(CAMINO_ID, nameDto, OTHER_ID, PILGRIM_ROLES),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

// ─── CaminosService.delete() ─────────────────────────────────────────────────

// Helper: adds the caminoPicture.findMany stub required by CaminosService.delete
// after the S3 picture cleanup was added.
function makeDeletePrismaMock(
  caminoRecord: object | null,
  options: { deleteSpy?: ReturnType<typeof vi.fn> } = {},
) {
  const deleteSpy =
    options.deleteSpy ?? vi.fn().mockResolvedValue(caminoRecord);
  return {
    camino: {
      findUnique: vi.fn().mockResolvedValue(caminoRecord),
      delete: deleteSpy,
    },
    caminoPicture: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    _deleteSpy: deleteSpy,
  };
}

describe('CaminosService.delete()', () => {
  // Owner role is always allowed regardless of who created the camino or when.
  it('allows a user with owner role to delete any camino', async () => {
    const prismaMock = makeDeletePrismaMock(baseCamino);
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    await expect(
      service.delete(CAMINO_ID, OTHER_ID, OWNER_ROLES),
    ).resolves.toBeUndefined();
    expect(prismaMock.camino.delete).toHaveBeenCalledOnce();
  });

  // Creator within the 2-hour window is allowed.
  it('allows the creator to delete their own camino within the time window', async () => {
    const recentCamino = {
      ...baseCamino,
      createdBy: OWNER_ID,
      createdAt: new Date(Date.now() - 60 * 1000),
    };
    const prismaMock = makeDeletePrismaMock(recentCamino);
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    await expect(
      service.delete(CAMINO_ID, OWNER_ID, PILGRIM_ROLES),
    ).resolves.toBeUndefined();
    expect(prismaMock.camino.delete).toHaveBeenCalledOnce();
  });

  // Creator after the 2-hour window is forbidden.
  it('throws ForbiddenException when creator is outside the time window', async () => {
    // baseCamino.createdAt is 2026-01-01 — well outside the 2-hour window
    const deleteSpy = vi.fn();
    const prismaMock = makeDeletePrismaMock(baseCamino, { deleteSpy });
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    await expect(
      service.delete(CAMINO_ID, OWNER_ID, PILGRIM_ROLES),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  // Non-creator, non-owner is always forbidden.
  it('throws ForbiddenException when user is neither creator nor owner', async () => {
    const recentCamino = {
      ...baseCamino,
      createdBy: OWNER_ID,
      createdAt: new Date(Date.now() - 60 * 1000),
    };
    const deleteSpy = vi.fn();
    const prismaMock = makeDeletePrismaMock(recentCamino, { deleteSpy });
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    // OTHER_ID is not the creator (OWNER_ID) and has only pilgrim role (not owner)
    await expect(
      service.delete(CAMINO_ID, OTHER_ID, PILGRIM_ROLES),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  // User with no roles and not the creator is forbidden.
  it('throws ForbiddenException when user has no roles and is not the creator', async () => {
    const deleteSpy = vi.fn();
    const prismaMock = makeDeletePrismaMock(baseCamino, { deleteSpy });
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    await expect(
      service.delete(CAMINO_ID, OTHER_ID, NO_ROLES),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when camino does not exist', async () => {
    const deleteSpy = vi.fn();
    const prismaMock = makeDeletePrismaMock(null, { deleteSpy });
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    await expect(
      service.delete(CAMINO_ID, OTHER_ID, NO_ROLES),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});

// ─── CaminosService — generateSlug() (tested via create()) ──────────────────
//
// generateSlug is private, so we drive it through the public create() API.
// The slug is generated inside the $transaction callback before caminoPoint.upsert,
// so we verify the create data passed to upsert contains the expected slug.

describe('CaminosService — generateSlug() slug generation', () => {
  function makeTxForSlug(slugExists: (slug: string) => boolean) {
    return {
      camino: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          name: 'Test Camino',
          description: null,
          verified: false,
          createdBy: 'kinde-user-001',
        }),
      },
      caminoPoint: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          // When called with { slug } it's the uniqueness check inside generateSlug
          if (where.slug !== undefined) {
            return Promise.resolve(
              slugExists(where.slug) ? { id: 'existing' } : null,
            );
          }
          // When called with { id } or other keys return null (point doesn't pre-exist)
          return Promise.resolve(null);
        }),
        upsert: vi.fn().mockImplementation(({ create }) =>
          Promise.resolve({
            id: 'new-pt-id',
            name: create.name,
            country: create.country,
            slug: create.slug,
            description: null,
          }),
        ),
      },
      caminoPointOrder: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
  }

  afterEach(() => vi.restoreAllMocks());

  it('generates "saint-jean-pied-de-port" from "Saint-Jean-Pied-de-Port"', async () => {
    const tx = makeTxForSlug(() => false);
    const prismaMock = {
      $transaction: vi
        .fn()
        .mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) =>
          cb(tx),
        ),
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    const dto: CreateCaminoDto = {
      name: 'Test Camino',
      caminoPoints: [{ name: 'Saint-Jean-Pied-de-Port', country: 'france' }],
    };
    const result = await service.create(dto, 'kinde-user-001');

    expect(result.caminoPoints[0].slug).toBe('saint-jean-pied-de-port');
  });

  it('converts spaces to hyphens', async () => {
    const tx = makeTxForSlug(() => false);
    const prismaMock = {
      $transaction: vi
        .fn()
        .mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) =>
          cb(tx),
        ),
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    const dto: CreateCaminoDto = {
      name: 'Test Camino',
      caminoPoints: [{ name: 'Los Arcos', country: 'spain' }],
    };
    const result = await service.create(dto, 'kinde-user-001');

    expect(result.caminoPoints[0].slug).toBe('los-arcos');
  });

  it('appends country on first collision', async () => {
    // First slug "burgos" already taken — expect "burgos-spain"
    const tx = makeTxForSlug((slug) => slug === 'burgos');
    const prismaMock = {
      $transaction: vi
        .fn()
        .mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) =>
          cb(tx),
        ),
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    const dto: CreateCaminoDto = {
      name: 'Test Camino',
      caminoPoints: [{ name: 'Burgos', country: 'spain' }],
    };
    const result = await service.create(dto, 'kinde-user-001');

    expect(result.caminoPoints[0].slug).toBe('burgos-spain');
  });

  it('appends numeric suffix when base and country slug are both taken', async () => {
    // Both "burgos" and "burgos-spain" already taken — expect "burgos-spain-2"
    const tx = makeTxForSlug(
      (slug) => slug === 'burgos' || slug === 'burgos-spain',
    );
    const prismaMock = {
      $transaction: vi
        .fn()
        .mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) =>
          cb(tx),
        ),
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    const dto: CreateCaminoDto = {
      name: 'Test Camino',
      caminoPoints: [{ name: 'Burgos', country: 'spain' }],
    };
    const result = await service.create(dto, 'kinde-user-001');

    expect(result.caminoPoints[0].slug).toBe('burgos-spain-2');
  });
});

// ─── CaminosService.findAll() ────────────────────────────────────────────────

describe('CaminosService.findAll()', () => {
  it('returns an array of camino summaries ordered by created_at desc', async () => {
    const summaries = [
      {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        name: 'Camino Francés',
        description: null,
        verified: true,
        createdBy: 'kinde-user-001',
        createdAt: new Date('2026-01-01'),
      },
    ];
    const prismaMock = {
      camino: { findMany: vi.fn().mockResolvedValue(summaries) },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    const result = await service.findAll();

    expect(result).toEqual(summaries);
    expect(prismaMock.camino.findMany).toHaveBeenCalledOnce();
  });

  it('returns an empty array when no caminos exist', async () => {
    const prismaMock = {
      camino: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    const result = await service.findAll();

    expect(result).toEqual([]);
  });

  it('throws InternalServerErrorException when DB query fails', async () => {
    const prismaMock = {
      camino: { findMany: vi.fn().mockRejectedValue(new Error('timeout')) },
    };
    const module = await buildModule(prismaMock);
    const service = module.get(CaminosService);

    await expect(service.findAll()).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
