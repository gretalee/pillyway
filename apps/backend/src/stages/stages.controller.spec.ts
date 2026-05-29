import {
  BadRequestException,
  ForbiddenException,
  LoggerService,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StagesController } from './stages.controller';
import { StagesService } from './stages.service';
import { UpdateStageDto } from './dto/update-stage.dto';
import { StageDetail } from './dto/stage-detail.dto';
import { StageListItem } from './dto/stage-list-item.dto';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const CAMINO_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const STAGE_ID = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const NOW = new Date('2026-05-11T10:00:00.000Z');

const startPoint = {
  id: 'pt-a',
  name: 'Start Town',
  country: 'france',
  slug: 'start-town',
  hasAccommodation: false,
};
const endPoint = {
  id: 'pt-b',
  name: 'End Town',
  country: 'spain',
  slug: 'end-town',
  hasAccommodation: false,
};

const mockListItem: StageListItem = {
  id: STAGE_ID,
  stageNumber: 1,
  startPoint,
  endPoint,
  distance: 24.7,
  description: 'First leg',
  createdAt: NOW,
  updatedAt: NOW,
};

const mockDetail: StageDetail = {
  ...mockListItem,
  previousStage: null,
  nextStage: {
    stageNumber: 2,
    startPointName: 'End Town',
    endPointName: 'Far Town',
  },
};

function buildModule(
  serviceMock: Partial<StagesService>,
): Promise<TestingModule> {
  return Test.createTestingModule({
    controllers: [StagesController],
    providers: [{ provide: StagesService, useValue: serviceMock }],
  })
    .setLogger(false as unknown as LoggerService)
    .compile();
}

// ─── GET /caminos/:caminoId/stages ────────────────────────────────────────────

describe('StagesController.findByCamino()', () => {
  it('delegates to StagesService.findByCamino and returns 200 with the array', async () => {
    const serviceMock = {
      findByCamino: vi.fn().mockResolvedValue([mockListItem]),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(StagesController);

    const result = await controller.findByCamino(CAMINO_ID);

    expect(serviceMock.findByCamino).toHaveBeenCalledWith(CAMINO_ID);
    expect(result).toEqual([mockListItem]);
  });

  it('propagates NotFoundException from service', async () => {
    const serviceMock = {
      findByCamino: vi
        .fn()
        .mockRejectedValue(new NotFoundException('Camino not found.')),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(StagesController);

    await expect(controller.findByCamino(CAMINO_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

// ─── GET /caminos/:caminoId/stages/:stageNumber ───────────────────────────────

describe('StagesController.findOne()', () => {
  it('delegates to StagesService.findOne and returns 200 with StageDetail', async () => {
    const serviceMock = {
      findOne: vi.fn().mockResolvedValue(mockDetail),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(StagesController);

    const result = await controller.findOne(CAMINO_ID, 1);

    expect(serviceMock.findOne).toHaveBeenCalledWith(CAMINO_ID, 1);
    expect(result).toEqual(mockDetail);
  });

  it('propagates NotFoundException for out-of-range stageNumber', async () => {
    const serviceMock = {
      findOne: vi
        .fn()
        .mockRejectedValue(new NotFoundException('Stage not found.')),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(StagesController);

    await expect(controller.findOne(CAMINO_ID, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

// ─── PATCH /caminos/:caminoId/stages/:stageNumber ────────────────────────────

describe('StagesController.update()', () => {
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

  it('returns 200 with updated StageDetail for a pilgrim', async () => {
    const updatedDetail: StageDetail = { ...mockDetail, distance: 30.5 };
    const serviceMock = {
      update: vi.fn().mockResolvedValue(updatedDetail),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(StagesController);

    const dto: UpdateStageDto = { distance: 30.5 } as UpdateStageDto;
    const result = await controller.update(
      CAMINO_ID,
      1,
      dto,
      mockRequest as never,
    );

    expect(serviceMock.update).toHaveBeenCalledWith(CAMINO_ID, 1, dto, [
      'pilgrim',
    ]);
    expect(result.distance).toBe(30.5);
  });

  it('propagates ForbiddenException when service throws (user has no pilgrim role)', async () => {
    const serviceMock = {
      update: vi
        .fn()
        .mockRejectedValue(
          new ForbiddenException(
            'You do not have permission to edit this stage.',
          ),
        ),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(StagesController);

    const dto: UpdateStageDto = { distance: 10.0 } as UpdateStageDto;
    await expect(
      controller.update(CAMINO_ID, 1, dto, mockRequest as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('propagates NotFoundException when service throws', async () => {
    const serviceMock = {
      update: vi
        .fn()
        .mockRejectedValue(new NotFoundException('Camino not found.')),
    };
    const module = await buildModule(serviceMock);
    const controller = module.get(StagesController);

    const dto: UpdateStageDto = { distance: 10.0 } as UpdateStageDto;
    await expect(
      controller.update(CAMINO_ID, 1, dto, mockRequest as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── UpdateStageDto validation ────────────────────────────────────────────────

describe('UpdateStageDto validation', () => {
  let pipe: ValidationPipe;

  beforeEach(() => {
    pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  });

  async function validate(value: object): Promise<UpdateStageDto> {
    return pipe.transform(value, {
      type: 'body',
      metatype: UpdateStageDto,
    }) as Promise<UpdateStageDto>;
  }

  it('throws BadRequestException for empty body {}', async () => {
    await expect(validate({})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException when distance is 0 (below Min(0.1))', async () => {
    await expect(validate({ distance: 0 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws BadRequestException when distance is 10000 (above Max(9999.9))', async () => {
    await expect(validate({ distance: 10000 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws BadRequestException when distance is NaN', async () => {
    // JSON.parse does not produce NaN, but we test the service-level numeric coercion
    // by passing the string representation; production code uses class-transformer transform.
    // Here we test directly with the numeric NaN value.
    await expect(validate({ distance: NaN })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('accepts valid distance with 1 decimal place', async () => {
    const result = await validate({ distance: 24.7 });
    expect(result.distance).toBe(24.7);
  });

  it('accepts null distance (clears the field)', async () => {
    const result = await validate({ distance: null });
    expect(result.distance).toBeNull();
  });

  it('accepts null description (clears the field)', async () => {
    const result = await validate({ description: null });
    expect(result.description).toBeNull();
  });

  it('accepts valid description string', async () => {
    const result = await validate({ description: 'A lovely walk.' });
    expect(result.description).toBe('A lovely walk.');
  });
});
