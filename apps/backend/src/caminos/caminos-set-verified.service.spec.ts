/**
 * Unit tests for CaminosService.setVerified and the CaminosController
 * PATCH /:id/verified endpoint — the owner-only camino verification feature.
 *
 * The full CaminosService constructor requires StagesService, which has its own
 * deep dependency tree. We only test setVerified here, so we construct the
 * service directly with a prisma mock and a stub StagesService.
 */
import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { KindeJwtPayload } from '../auth/kinde-jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { StagesService } from '../stages/stages.service';
import { CaminosController } from './caminos.controller';
import { CaminosService, CaminoDetailFull } from './caminos.service';
import { SetCaminoVerifiedDto } from './dto/set-camino-verified.dto';

// ─── Prisma mock factory ──────────────────────────────────────────────────────

function buildPrismaMock() {
  return {
    camino: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      $transaction: vi.fn(),
    },
    caminoPointOrder: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    caminoPoint: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({})),
  } as unknown as PrismaService;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CAMINO_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const NOW = new Date('2024-01-01T00:00:00.000Z');

const CAMINO_STUB = {
  id: CAMINO_ID,
  name: 'Camino Frances',
  verified: false,
  description: null,
  createdBy: USER_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

const CAMINO_FULL_STUB: CaminoDetailFull = {
  id: CAMINO_ID,
  name: 'Camino Frances',
  verified: true,
  description: null,
  createdBy: USER_ID,
  createdAt: NOW,
  updatedAt: NOW,
  caminoPoints: [],
};

const CAMINO_FULL_STUB_UNVERIFIED: CaminoDetailFull = {
  ...CAMINO_FULL_STUB,
  verified: false,
};

// ─── Service-level tests ──────────────────────────────────────────────────────

describe('CaminosService.setVerified', () => {
  let service: CaminosService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  const stagesServiceStub = {
    upsertStagePairs: vi.fn(),
  } as unknown as StagesService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new CaminosService(prisma, stagesServiceStub);
  });

  it('sets verified=true and returns the updated camino', async () => {
    vi.mocked(prisma.camino.findUnique)
      .mockResolvedValueOnce(CAMINO_STUB as never) // existence check
      .mockResolvedValueOnce({                      // findById call inside setVerified
        ...CAMINO_STUB,
        verified: true,
        caminoPointOrder: [],
      } as never);
    vi.mocked(prisma.camino.update).mockResolvedValue({ ...CAMINO_STUB, verified: true } as never);

    const result = await service.setVerified(CAMINO_ID, true);

    expect(prisma.camino.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CAMINO_ID },
        data: expect.objectContaining({ verified: true }),
      }),
    );
    expect(result.verified).toBe(true);
  });

  it('sets verified=false (unverifies a previously verified camino)', async () => {
    const verifiedCamino = { ...CAMINO_STUB, verified: true };
    vi.mocked(prisma.camino.findUnique)
      .mockResolvedValueOnce(verifiedCamino as never)
      .mockResolvedValueOnce({ ...verifiedCamino, verified: false, caminoPointOrder: [] } as never);
    vi.mocked(prisma.camino.update).mockResolvedValue({ ...verifiedCamino, verified: false } as never);

    const result = await service.setVerified(CAMINO_ID, false);

    expect(prisma.camino.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ verified: false }),
      }),
    );
    expect(result.verified).toBe(false);
  });

  it('throws NotFoundException when the camino does not exist', async () => {
    vi.mocked(prisma.camino.findUnique).mockResolvedValue(null);

    await expect(service.setVerified(CAMINO_ID, true)).rejects.toThrow(NotFoundException);
  });

  it('sets updatedAt manually because the schema does not use @updatedAt', async () => {
    // The service must explicitly set updatedAt on every update.
    vi.mocked(prisma.camino.findUnique)
      .mockResolvedValueOnce(CAMINO_STUB as never)
      .mockResolvedValueOnce({ ...CAMINO_STUB, verified: true, caminoPointOrder: [] } as never);
    vi.mocked(prisma.camino.update).mockResolvedValue({ ...CAMINO_STUB, verified: true } as never);

    await service.setVerified(CAMINO_ID, true);

    const updateArg = vi.mocked(prisma.camino.update).mock.calls[0][0];
    expect(updateArg.data).toHaveProperty('updatedAt');
    expect(updateArg.data.updatedAt).toBeInstanceOf(Date);
  });
});

// ─── Controller-level tests ───────────────────────────────────────────────────

describe('CaminosController PATCH /:id/verified — setVerified', () => {
  let controller: CaminosController;
  let caminosService: CaminosService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CaminosController],
      providers: [
        {
          provide: CaminosService,
          useValue: {
            findAll: vi.fn(),
            findById: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            setVerified: vi.fn(),
          },
        },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CaminosController);
    caminosService = module.get(CaminosService);
  });

  it('delegates to CaminosService.setVerified with the correct arguments', async () => {
    vi.mocked(caminosService.setVerified).mockResolvedValue(CAMINO_FULL_STUB);
    const dto: SetCaminoVerifiedDto = { verified: true };

    const result = await controller.setVerified(CAMINO_ID, dto);

    expect(caminosService.setVerified).toHaveBeenCalledWith(CAMINO_ID, true);
    expect(result).toEqual(CAMINO_FULL_STUB);
  });

  it('delegates a false value correctly (unverify)', async () => {
    vi.mocked(caminosService.setVerified).mockResolvedValue(CAMINO_FULL_STUB_UNVERIFIED);
    const dto: SetCaminoVerifiedDto = { verified: false };

    const result = await controller.setVerified(CAMINO_ID, dto);

    expect(caminosService.setVerified).toHaveBeenCalledWith(CAMINO_ID, false);
    expect(result.verified).toBe(false);
  });

  it('propagates NotFoundException when the camino does not exist', async () => {
    vi.mocked(caminosService.setVerified).mockRejectedValue(
      new NotFoundException('Camino not found.'),
    );

    await expect(
      controller.setVerified(CAMINO_ID, { verified: true }),
    ).rejects.toThrow(NotFoundException);
  });

  it('has JwtAuthGuard applied — unauthenticated callers are blocked', () => {
    // Guards only execute in the HTTP pipeline, not on direct method calls.
    // Verify the decorator metadata is wired correctly so the runtime enforces it.
    const guards: unknown[] =
      Reflect.getMetadata('__guards__', CaminosController.prototype.setVerified) ?? [];
    expect(guards, 'setVerified must declare JwtAuthGuard').toContain(JwtAuthGuard);
  });

  it('has RolesGuard applied — non-owner callers are blocked', () => {
    const guards: unknown[] =
      Reflect.getMetadata('__guards__', CaminosController.prototype.setVerified) ?? [];
    expect(guards, 'setVerified must declare RolesGuard').toContain(RolesGuard);
  });

  it('setVerified handler has @Roles("owner") metadata — pilgrim-only users are excluded', () => {
    // Verify the decorator metadata is wired correctly. The @Roles('owner')
    // decorator uses SetMetadata(ROLES_KEY, ['owner']); this test confirms the
    // metadata was applied so the RolesGuard will enforce it at runtime.
    const handlerMetadata: string[] | undefined = Reflect.getMetadata(
      'roles',
      CaminosController.prototype.setVerified,
    );

    expect(handlerMetadata, "Expected @Roles('owner') metadata on setVerified handler").toBeTruthy();
    expect(handlerMetadata).toContain('owner');
    expect(handlerMetadata).not.toContain('pilgrim');

    // Confirm a pilgrim-only role set does not satisfy the 'owner' requirement.
    const pilgrimRoles: KindeJwtPayload['roles'] = [
      { id: 'pilgrim', key: 'pilgrim', name: 'Pilgrim' },
    ];
    const hasOwnerRole = pilgrimRoles?.some((r) => r.key === 'owner') ?? false;
    expect(hasOwnerRole, 'A pilgrim-only user must not satisfy the owner role check').toBe(false);
  });
});
