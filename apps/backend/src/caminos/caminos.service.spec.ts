import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SupabaseService } from '../supabase/supabase.service';
import { CaminosService } from './caminos.service';
import { CreateCaminoDto } from './dto/create-camino.dto';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRpcMock(result: { data: unknown; error: unknown }) {
  return vi.fn().mockResolvedValue(result);
}

function makeSelectMock(result: { data: unknown; error: unknown }) {
  const orderMock = vi.fn().mockResolvedValue(result);
  const selectMock = vi.fn().mockReturnValue({ order: orderMock });
  const fromMock = vi.fn().mockReturnValue({ select: selectMock });
  return { fromMock, selectMock, orderMock };
}

function buildModule(supabaseClientStub: object): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      CaminosService,
      {
        provide: SupabaseService,
        useValue: { client: supabaseClientStub },
      },
    ],
  }).compile();
}

// ─── Shared DTOs ─────────────────────────────────────────────────────────────

const newPointDto: CreateCaminoDto = {
  name: 'Camino Francés',
  description: 'The most popular route.',
  caminoPoints: [{ name: 'Saint-Jean-Pied-de-Port', country: 'France' }],
};

const existingPointDto: CreateCaminoDto = {
  name: 'Camino del Norte',
  caminoPoints: [
    { caminoPointId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
  ],
};

const mixedDto: CreateCaminoDto = {
  name: 'Camino Mixto',
  caminoPoints: [
    { caminoPointId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
    { name: 'Roncesvalles', country: 'Spain' },
  ],
};

const threeNewPointsDto: CreateCaminoDto = {
  name: 'Camino Triple',
  caminoPoints: [
    { name: 'Irún', country: 'Spain' },
    { name: 'San Sebastián', country: 'Spain' },
    { name: 'Zarautz', country: 'Spain' },
  ],
};

const CREATED_CAMINO = {
  id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  name: 'Camino Francés',
  description: 'The most popular route.',
  verified: false,
  caminoPoints: [
    {
      id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      name: 'Saint-Jean-Pied-de-Port',
      country: 'France',
      position: 1,
    },
  ],
};

// ─── CaminosService.create() — Happy paths ───────────────────────────────────

describe('CaminosService.create()', () => {
  let service: CaminosService;

  // CAM-BE-01: creates camino + one brand-new caminoPoint
  it('CAM-BE-01: creates camino with one new caminoPoint via RPC', async () => {
    const rpcMock = makeRpcMock({ data: CREATED_CAMINO, error: null });
    const module = await buildModule({ rpc: rpcMock });
    service = module.get(CaminosService);

    const result = await service.create(newPointDto, 'kinde-user-001');

    expect(rpcMock).toHaveBeenCalledOnce();
    expect(rpcMock).toHaveBeenCalledWith('create_camino', {
      p_name: newPointDto.name,
      p_description: newPointDto.description,
      p_created_by: 'kinde-user-001',
      p_points: JSON.stringify(newPointDto.caminoPoints),
    });
    expect(result).toEqual(CREATED_CAMINO);
  });

  // CAM-BE-02: creates camino + links one existing caminoPoint by ID
  it('CAM-BE-02: creates camino linking an existing caminoPoint by ID', async () => {
    const rpcResult = {
      ...CREATED_CAMINO,
      name: 'Camino del Norte',
      caminoPoints: [
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          name: 'Irún',
          country: 'Spain',
          position: 1,
        },
      ],
    };
    const rpcMock = makeRpcMock({ data: rpcResult, error: null });
    const module = await buildModule({ rpc: rpcMock });
    service = module.get(CaminosService);

    const result = await service.create(existingPointDto, 'kinde-user-001');

    expect(result.caminoPoints[0].id).toBe(
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    );
    expect(rpcMock).toHaveBeenCalledOnce();
  });

  // CAM-BE-03: mixed array — existing + new
  it('CAM-BE-03: creates camino with mixed existing and new points', async () => {
    const rpcResult = {
      ...CREATED_CAMINO,
      name: 'Camino Mixto',
      caminoPoints: [
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          name: 'Irún',
          country: 'Spain',
          position: 1,
        },
        {
          id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
          name: 'Roncesvalles',
          country: 'Spain',
          position: 2,
        },
      ],
    };
    const rpcMock = makeRpcMock({ data: rpcResult, error: null });
    const module = await buildModule({ rpc: rpcMock });
    service = module.get(CaminosService);

    const result = await service.create(mixedDto, 'kinde-user-001');

    expect(result.caminoPoints).toHaveLength(2);
    expect(result.caminoPoints[0].position).toBe(1);
    expect(result.caminoPoints[1].position).toBe(2);
  });

  // CAM-BE-04: three new points in order
  it('CAM-BE-04: creates camino with three new points and correct positions', async () => {
    const rpcResult = {
      ...CREATED_CAMINO,
      name: 'Camino Triple',
      caminoPoints: [
        { id: 'id-1', name: 'Irún', country: 'Spain', position: 1 },
        { id: 'id-2', name: 'San Sebastián', country: 'Spain', position: 2 },
        { id: 'id-3', name: 'Zarautz', country: 'Spain', position: 3 },
      ],
    };
    const rpcMock = makeRpcMock({ data: rpcResult, error: null });
    const module = await buildModule({ rpc: rpcMock });
    service = module.get(CaminosService);

    const result = await service.create(threeNewPointsDto, 'kinde-user-001');

    expect(result.caminoPoints).toHaveLength(3);
    expect(result.caminoPoints.map((p) => p.position)).toEqual([1, 2, 3]);
  });
});

// ─── CaminosService.create() — Exception mapping ─────────────────────────────

describe('CaminosService.create() — RPC error mapping', () => {
  let service: CaminosService;

  // CAM-BE-07: non-existent caminoPointId → BadRequestException
  it('CAM-BE-07: throws BadRequestException when caminoPointId is not found in DB', async () => {
    const rpcMock = makeRpcMock({
      data: null,
      error: {
        message:
          'CAMINO_POINT_NOT_FOUND:a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      },
    });
    const module = await buildModule({ rpc: rpcMock });
    service = module.get(CaminosService);

    await expect(
      service.create(existingPointDto, 'kinde-user-001'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // CAM-BE-07 message content
  it('CAM-BE-07: BadRequestException message contains the missing point ID', async () => {
    const pointId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const rpcMock = makeRpcMock({
      data: null,
      error: { message: `CAMINO_POINT_NOT_FOUND:${pointId}` },
    });
    const module = await buildModule({ rpc: rpcMock });
    service = module.get(CaminosService);

    await expect(
      service.create(existingPointDto, 'kinde-user-001'),
    ).rejects.toThrow(pointId);
  });

  // CAMINO_NAME_EXISTS → ConflictException (409)
  it('maps CAMINO_NAME_EXISTS RPC error to ConflictException (409)', async () => {
    const rpcMock = makeRpcMock({
      data: null,
      error: { message: 'CAMINO_NAME_EXISTS' },
    });
    const module = await buildModule({ rpc: rpcMock });
    service = module.get(CaminosService);

    await expect(
      service.create(newPointDto, 'kinde-user-001'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  // DUPLICATE_POINT_IN_REQUEST → BadRequestException
  it('maps DUPLICATE_POINT_IN_REQUEST RPC error to BadRequestException (400)', async () => {
    const rpcMock = makeRpcMock({
      data: null,
      error: { message: 'DUPLICATE_POINT_IN_REQUEST' },
    });
    const module = await buildModule({ rpc: rpcMock });
    service = module.get(CaminosService);

    await expect(
      service.create(newPointDto, 'kinde-user-001'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // Unrecognised DB error → InternalServerErrorException
  it('throws InternalServerErrorException for unknown DB errors', async () => {
    const rpcMock = makeRpcMock({
      data: null,
      error: { message: 'unexpected pg error' },
    });
    const module = await buildModule({ rpc: rpcMock });
    service = module.get(CaminosService);

    await expect(
      service.create(newPointDto, 'kinde-user-001'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
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
      },
    ];

    const { fromMock } = makeSelectMock({ data: summaries, error: null });
    const module = await buildModule({ from: fromMock });
    const service = module.get(CaminosService);

    const result = await service.findAll();

    expect(result).toEqual(summaries);
    expect(fromMock).toHaveBeenCalledWith('caminos');
  });

  it('returns an empty array when no caminos exist', async () => {
    const { fromMock } = makeSelectMock({ data: [], error: null });
    const module = await buildModule({ from: fromMock });
    const service = module.get(CaminosService);

    const result = await service.findAll();

    expect(result).toEqual([]);
  });

  it('throws InternalServerErrorException when DB query fails', async () => {
    const { fromMock } = makeSelectMock({
      data: null,
      error: { message: 'connection timeout' },
    });
    const module = await buildModule({ from: fromMock });
    const service = module.get(CaminosService);

    await expect(service.findAll()).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('returns null-safe empty array when data is null (no DB error)', async () => {
    const { fromMock } = makeSelectMock({ data: null, error: null });
    const module = await buildModule({ from: fromMock });
    const service = module.get(CaminosService);

    const result = await service.findAll();

    expect(result).toEqual([]);
  });
});
