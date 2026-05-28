import {
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Logger,
  LoggerService,
  NotFoundException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KindeRole } from '../auth/kinde-jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CaminosService } from '../caminos/caminos.service';
import { StagesService } from '../stages/stages.service';
import { DeleteAuthorizationService } from '../common/delete-authorization.service';
import { CaminoPicturesService } from './camino-pictures.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const CAMINO_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const PICTURE_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const OTHER_PICTURE_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
const OTHER_CAMINO_ID = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
const USER_ID = 'kinde-user-001';
const OTHER_USER_ID = 'kinde-user-002';
const OWNER_USER_ID = 'kinde-owner-001';
const PICTURE_URL = 'https://example.supabase.co/storage/v1/object/public/bucket/camino-pictures/pic.jpeg';

const PILGRIM_ROLES: KindeRole[] = [{ id: 'r1', key: 'pilgrim', name: 'Pilgrim' }];
const OWNER_ROLES: KindeRole[] = [
  { id: 'r1', key: 'pilgrim', name: 'Pilgrim' },
  { id: 'r2', key: 'owner', name: 'Owner' },
];

// ─── Mock factories ───────────────────────────────────────────────────────────

function makeBasePicture(overrides: Partial<{
  id: string;
  caminoId: string;
  uploadedBy: string;
  url: string;
  isPrimary: boolean;
  position: number | null;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: PICTURE_ID,
    caminoId: CAMINO_ID,
    uploadedBy: USER_ID,
    url: PICTURE_URL,
    isPrimary: false,
    position: 1,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeUploadsServiceMock() {
  return {
    uploadImage: vi.fn().mockResolvedValue(PICTURE_URL),
    deleteImages: vi.fn().mockResolvedValue(undefined),
    deleteImageStrict: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Returns a Prisma mock wired for CaminoPicturesService tests.
 * Individual test cases override specific methods via spread/assignment.
 */
function makePrismaMock(overrides: {
  caminoFindUnique?: ReturnType<typeof vi.fn>;
  pictureFindFirst?: ReturnType<typeof vi.fn>;
  pictureFindMany?: ReturnType<typeof vi.fn>;
  pictureCount?: ReturnType<typeof vi.fn>;
  pictureAggregate?: ReturnType<typeof vi.fn>;
  pictureCreate?: ReturnType<typeof vi.fn>;
  pictureDelete?: ReturnType<typeof vi.fn>;
  transaction?: ReturnType<typeof vi.fn>;
} = {}) {
  const defaultPicture = makeBasePicture();

  const caminoPictureMock = {
    findFirst: overrides.pictureFindFirst ?? vi.fn().mockResolvedValue(defaultPicture),
    findMany: overrides.pictureFindMany ?? vi.fn().mockResolvedValue([defaultPicture]),
    count: overrides.pictureCount ?? vi.fn().mockResolvedValue(0),
    aggregate: overrides.pictureAggregate ?? vi.fn().mockResolvedValue({ _max: { position: null } }),
    create: overrides.pictureCreate ?? vi.fn().mockResolvedValue(defaultPicture),
    delete: overrides.pictureDelete ?? vi.fn().mockResolvedValue(defaultPicture),
  };

  // Build the $transaction mock: default implementation executes the callback
  // with the same prisma mock (so tx.caminoPicture.* works in tests).
  let mock: ReturnType<typeof vi.fn>;
  if (overrides.transaction) {
    mock = overrides.transaction;
  } else {
    // Will be patched below once the full prismaMock object is assembled
    mock = vi.fn();
  }

  const prismaMock: {
    camino: { findUnique: ReturnType<typeof vi.fn> };
    caminoPicture: typeof caminoPictureMock;
    $transaction: ReturnType<typeof vi.fn>;
  } = {
    camino: {
      findUnique: overrides.caminoFindUnique ?? vi.fn().mockResolvedValue({ id: CAMINO_ID }),
    },
    caminoPicture: caminoPictureMock,
    $transaction: mock,
  };

  // Patch default $transaction to pass the mock itself as the tx arg
  if (!overrides.transaction) {
    prismaMock.$transaction = vi.fn().mockImplementation(
      (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock),
    );
  }

  return prismaMock;
}

async function buildModule(
  prismaMock: object,
  uploadsMock: object,
): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      CaminoPicturesService,
      { provide: PrismaService, useValue: prismaMock },
      { provide: UploadsService, useValue: uploadsMock },
    ],
  })
    .setLogger(false as unknown as LoggerService)
    .compile();
}

/** Minimal valid JPEG buffer (SOI + EOI markers). */
function jpegBuffer(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
}

/** Buffer that does not match any known image magic bytes. */
function binaryGarbageBuffer(): Buffer {
  return Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
}

function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'photo.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: jpegBuffer(),
    size: 12,
    stream: null as unknown as NodeJS.ReadableStream,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  } as Express.Multer.File;
}

// ─── Suppress expected logger noise ──────────────────────────────────────────

beforeEach(() => {
  vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── CaminoPicturesService.getPictures() ─────────────────────────────────────

describe('CaminoPicturesService.getPictures()', () => {
  it('returns 404 when camino does not exist', async () => {
    const prismaMock = makePrismaMock({
      caminoFindUnique: vi.fn().mockResolvedValue(null),
    });
    const module = await buildModule(prismaMock, makeUploadsServiceMock());
    const service = module.get(CaminoPicturesService);

    await expect(service.getPictures(CAMINO_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns empty primary and gallery when camino has no pictures', async () => {
    const prismaMock = makePrismaMock({
      pictureFindMany: vi.fn().mockResolvedValue([]),
    });
    const module = await buildModule(prismaMock, makeUploadsServiceMock());
    const service = module.get(CaminoPicturesService);

    const result = await service.getPictures(CAMINO_ID);

    expect(result.primary).toBeNull();
    expect(result.gallery).toHaveLength(0);
  });

  it('splits pictures into primary and gallery correctly', async () => {
    const primary = makeBasePicture({ id: 'p-primary', isPrimary: true, position: null });
    const gallery1 = makeBasePicture({ id: 'p-gallery-1', isPrimary: false, position: 1 });
    const gallery2 = makeBasePicture({ id: 'p-gallery-2', isPrimary: false, position: 2 });

    const prismaMock = makePrismaMock({
      pictureFindMany: vi.fn().mockResolvedValue([primary, gallery1, gallery2]),
    });
    const module = await buildModule(prismaMock, makeUploadsServiceMock());
    const service = module.get(CaminoPicturesService);

    const result = await service.getPictures(CAMINO_ID);

    expect(result.primary).not.toBeNull();
    expect(result.primary?.id).toBe('p-primary');
    expect(result.gallery).toHaveLength(2);
    expect(result.gallery[0].id).toBe('p-gallery-1');
    expect(result.gallery[1].id).toBe('p-gallery-2');
  });
});

// ─── CaminoPicturesService.uploadPicture() ───────────────────────────────────

describe('CaminoPicturesService.uploadPicture()', () => {
  it('returns 404 when camino does not exist', async () => {
    const prismaMock = makePrismaMock({
      caminoFindUnique: vi.fn().mockResolvedValue(null),
    });
    const module = await buildModule(prismaMock, makeUploadsServiceMock());
    const service = module.get(CaminoPicturesService);

    await expect(
      service.uploadPicture(CAMINO_ID, makeFile(), false, USER_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 415 when magic-byte type does not match an allowed MIME type', async () => {
    const prismaMock = makePrismaMock();
    const module = await buildModule(prismaMock, makeUploadsServiceMock());
    const service = module.get(CaminoPicturesService);

    // Buffer that has no recognisable magic bytes
    const badFile = makeFile({ buffer: binaryGarbageBuffer(), mimetype: 'image/jpeg' });

    await expect(
      service.uploadPicture(CAMINO_ID, badFile, false, USER_ID),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('returns 409 when isPrimary=true and a primary picture already exists', async () => {
    const existingPrimary = makeBasePicture({ isPrimary: true, position: null });
    const prismaMock = makePrismaMock({
      pictureFindFirst: vi.fn().mockResolvedValue(existingPrimary),
      pictureCount: vi.fn().mockResolvedValue(1),
    });
    const module = await buildModule(prismaMock, makeUploadsServiceMock());
    const service = module.get(CaminoPicturesService);

    await expect(
      service.uploadPicture(CAMINO_ID, makeFile(), true, USER_ID),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 422 when camino already has 50 pictures', async () => {
    const prismaMock = makePrismaMock({
      pictureCount: vi.fn().mockResolvedValue(50),
    });
    const module = await buildModule(prismaMock, makeUploadsServiceMock());
    const service = module.get(CaminoPicturesService);

    await expect(
      service.uploadPicture(CAMINO_ID, makeFile(), false, USER_ID),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('sets uploadedBy from the userId param, never from any DTO field', async () => {
    const createdRecord = makeBasePicture({ uploadedBy: USER_ID });
    const prismaMock = makePrismaMock({
      pictureCreate: vi.fn().mockResolvedValue(createdRecord),
      pictureCount: vi.fn().mockResolvedValue(0),
      pictureFindFirst: vi.fn().mockResolvedValue(null),
    });
    const uploadsServiceMock = makeUploadsServiceMock();
    const module = await buildModule(prismaMock, uploadsServiceMock);
    const service = module.get(CaminoPicturesService);

    const result = await service.uploadPicture(CAMINO_ID, makeFile(), false, USER_ID);

    // Verify the create call used userId from the param
    expect(prismaMock.caminoPicture.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ uploadedBy: USER_ID }),
      }),
    );
    expect(result.uploadedBy).toBe(USER_ID);
  });

  it('sets isPrimary=false and position when gallery picture is uploaded', async () => {
    const createdRecord = makeBasePicture({ isPrimary: false, position: 1 });
    const prismaMock = makePrismaMock({
      pictureCreate: vi.fn().mockResolvedValue(createdRecord),
      pictureCount: vi.fn().mockResolvedValue(0),
      pictureFindFirst: vi.fn().mockResolvedValue(null),
      pictureAggregate: vi.fn().mockResolvedValue({ _max: { position: null } }),
    });
    const module = await buildModule(prismaMock, makeUploadsServiceMock());
    const service = module.get(CaminoPicturesService);

    // Pass isPrimary = false (the boolean after DTO transform from "false" string)
    const result = await service.uploadPicture(CAMINO_ID, makeFile(), false, USER_ID);

    expect(result.isPrimary).toBe(false);
    expect(prismaMock.caminoPicture.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPrimary: false, position: 1 }),
      }),
    );
  });

  it('sets isPrimary=true and position=null when primary picture is uploaded', async () => {
    const createdRecord = makeBasePicture({ isPrimary: true, position: null });
    const prismaMock = makePrismaMock({
      pictureCreate: vi.fn().mockResolvedValue(createdRecord),
      pictureCount: vi.fn().mockResolvedValue(0),
      pictureFindFirst: vi.fn().mockResolvedValue(null),
    });
    const module = await buildModule(prismaMock, makeUploadsServiceMock());
    const service = module.get(CaminoPicturesService);

    const result = await service.uploadPicture(CAMINO_ID, makeFile(), true, USER_ID);

    expect(result.isPrimary).toBe(true);
    expect(prismaMock.caminoPicture.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPrimary: true, position: null }),
      }),
    );
  });

  it('does not insert a DB record when S3 upload fails', async () => {
    const prismaMock = makePrismaMock({
      pictureCount: vi.fn().mockResolvedValue(0),
      pictureFindFirst: vi.fn().mockResolvedValue(null),
    });
    const uploadsServiceMock = makeUploadsServiceMock();
    uploadsServiceMock.uploadImage = vi
      .fn()
      .mockRejectedValue(new Error('S3 connection refused'));

    const module = await buildModule(prismaMock, uploadsServiceMock);
    const service = module.get(CaminoPicturesService);

    await expect(
      service.uploadPicture(CAMINO_ID, makeFile(), false, USER_ID),
    ).rejects.toThrow();

    expect(prismaMock.caminoPicture.create).not.toHaveBeenCalled();
  });
});

// ─── CaminoPicturesService.deletePicture() ───────────────────────────────────

describe('CaminoPicturesService.deletePicture()', () => {
  it('returns 404 when pictureId does not match the given caminoId (IDOR prevention)', async () => {
    // Picture exists under CAMINO_ID but we supply OTHER_CAMINO_ID
    const prismaMock = makePrismaMock({
      pictureFindFirst: vi.fn().mockResolvedValue(null),
    });
    const module = await buildModule(prismaMock, makeUploadsServiceMock());
    const service = module.get(CaminoPicturesService);

    await expect(
      service.deletePicture(OTHER_CAMINO_ID, PICTURE_ID, USER_ID, PILGRIM_ROLES),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 403 when user is neither the uploader nor an owner', async () => {
    const picture = makeBasePicture({ uploadedBy: USER_ID });
    const prismaMock = makePrismaMock({
      pictureFindFirst: vi.fn().mockResolvedValue(picture),
    });
    const module = await buildModule(prismaMock, makeUploadsServiceMock());
    const service = module.get(CaminoPicturesService);

    // OTHER_USER_ID is not the uploader and has only pilgrim (no owner)
    await expect(
      service.deletePicture(CAMINO_ID, PICTURE_ID, OTHER_USER_ID, PILGRIM_ROLES),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns 502 and preserves DB record when S3 deletion fails', async () => {
    const picture = makeBasePicture({ uploadedBy: USER_ID });
    const prismaMock = makePrismaMock({
      pictureFindFirst: vi.fn().mockResolvedValue(picture),
    });
    const uploadsServiceMock = makeUploadsServiceMock();
    uploadsServiceMock.deleteImageStrict = vi
      .fn()
      .mockRejectedValue(
        new BadGatewayException(
          'Failed to delete the image from storage. The record has been preserved.',
        ),
      );

    const module = await buildModule(prismaMock, uploadsServiceMock);
    const service = module.get(CaminoPicturesService);

    await expect(
      service.deletePicture(CAMINO_ID, PICTURE_ID, USER_ID, PILGRIM_ROLES),
    ).rejects.toBeInstanceOf(BadGatewayException);

    // DB record must NOT have been deleted
    expect(prismaMock.caminoPicture.delete).not.toHaveBeenCalled();
  });

  it('succeeds when user is the uploader', async () => {
    const picture = makeBasePicture({ uploadedBy: USER_ID });
    const prismaMock = makePrismaMock({
      pictureFindFirst: vi.fn().mockResolvedValue(picture),
    });
    const uploadsServiceMock = makeUploadsServiceMock();
    const module = await buildModule(prismaMock, uploadsServiceMock);
    const service = module.get(CaminoPicturesService);

    await expect(
      service.deletePicture(CAMINO_ID, PICTURE_ID, USER_ID, PILGRIM_ROLES),
    ).resolves.toBeUndefined();

    expect(uploadsServiceMock.deleteImageStrict).toHaveBeenCalledOnce();
    expect(prismaMock.caminoPicture.delete).toHaveBeenCalledOnce();
  });

  it('allows owner to delete a picture uploaded by someone else', async () => {
    // Picture uploaded by USER_ID; delete requested by OWNER_USER_ID who holds owner role
    const picture = makeBasePicture({ uploadedBy: USER_ID });
    const prismaMock = makePrismaMock({
      pictureFindFirst: vi.fn().mockResolvedValue(picture),
    });
    const uploadsServiceMock = makeUploadsServiceMock();
    const module = await buildModule(prismaMock, uploadsServiceMock);
    const service = module.get(CaminoPicturesService);

    await expect(
      service.deletePicture(CAMINO_ID, PICTURE_ID, OWNER_USER_ID, OWNER_ROLES),
    ).resolves.toBeUndefined();

    expect(uploadsServiceMock.deleteImageStrict).toHaveBeenCalledOnce();
    expect(prismaMock.caminoPicture.delete).toHaveBeenCalledOnce();
  });

  it('calls S3 deleteImageStrict BEFORE deleting the DB record', async () => {
    const picture = makeBasePicture({ uploadedBy: USER_ID });
    const callOrder: string[] = [];

    const prismaMock = makePrismaMock({
      pictureFindFirst: vi.fn().mockResolvedValue(picture),
      pictureDelete: vi.fn().mockImplementation(() => {
        callOrder.push('db-delete');
        return Promise.resolve(picture);
      }),
    });
    const uploadsServiceMock = makeUploadsServiceMock();
    uploadsServiceMock.deleteImageStrict = vi.fn().mockImplementation(() => {
      callOrder.push('s3-delete');
      return Promise.resolve();
    });

    const module = await buildModule(prismaMock, uploadsServiceMock);
    const service = module.get(CaminoPicturesService);

    await service.deletePicture(CAMINO_ID, PICTURE_ID, USER_ID, PILGRIM_ROLES);

    expect(callOrder).toEqual(['s3-delete', 'db-delete']);
  });
});

// ─── CaminosService.delete() — S3 cleanup ────────────────────────────────────
//
// Verifies that CaminosService.delete fetches picture URLs and calls
// uploadsService.deleteImages BEFORE prisma.camino.delete.

describe('CaminosService.delete() — S3 picture cleanup', () => {
  const baseDeleteCamino = {
    id: CAMINO_ID,
    name: 'Test Camino',
    description: null,
    verified: false,
    createdBy: USER_ID,
    createdAt: new Date(Date.now() - 60 * 1000), // within window
    updatedAt: new Date(),
  };

  async function buildCaminosModule(
    prismaMock: object,
    uploadsMock: object,
  ): Promise<CaminosService> {
    const module = await Test.createTestingModule({
      providers: [
        CaminosService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StagesService, useValue: { upsertStagePairs: vi.fn() } },
        DeleteAuthorizationService,
        { provide: UploadsService, useValue: uploadsMock },
      ],
    })
      .setLogger(false as unknown as LoggerService)
      .compile();
    return module.get(CaminosService);
  }

  it('calls uploadsService.deleteImages before prisma.camino.delete', async () => {
    const callOrder: string[] = [];
    const pictureUrls = [PICTURE_URL, `${PICTURE_URL}-2`];

    const prismaMock = {
      camino: {
        findUnique: vi.fn().mockResolvedValue(baseDeleteCamino),
        delete: vi.fn().mockImplementation(() => {
          callOrder.push('db-delete');
          return Promise.resolve(baseDeleteCamino);
        }),
      },
      caminoPicture: {
        findMany: vi.fn().mockResolvedValue(
          pictureUrls.map((url) => ({ url })),
        ),
      },
    };

    const uploadsServiceMock = {
      deleteImages: vi.fn().mockImplementation(() => {
        callOrder.push('s3-delete');
        return Promise.resolve();
      }),
    };

    const service = await buildCaminosModule(prismaMock, uploadsServiceMock);

    await service.delete(CAMINO_ID, USER_ID, PILGRIM_ROLES);

    expect(callOrder).toEqual(['s3-delete', 'db-delete']);
    expect(uploadsServiceMock.deleteImages).toHaveBeenCalledWith(pictureUrls);
    expect(prismaMock.camino.delete).toHaveBeenCalledOnce();
  });

  it('still deletes the camino when S3 cleanup throws (best-effort)', async () => {
    const prismaMock = {
      camino: {
        findUnique: vi.fn().mockResolvedValue(baseDeleteCamino),
        delete: vi.fn().mockResolvedValue(baseDeleteCamino),
      },
      caminoPicture: {
        findMany: vi.fn().mockResolvedValue([{ url: PICTURE_URL }]),
      },
    };

    const uploadsServiceMock = {
      deleteImages: vi.fn().mockRejectedValue(new Error('S3 unavailable')),
    };

    const service = await buildCaminosModule(prismaMock, uploadsServiceMock);

    // Must not throw — S3 failure is logged, DB delete proceeds
    await expect(
      service.delete(CAMINO_ID, USER_ID, PILGRIM_ROLES),
    ).resolves.toBeUndefined();

    expect(prismaMock.camino.delete).toHaveBeenCalledOnce();
  });

  it('skips S3 cleanup and deletes the camino when it has no pictures', async () => {
    const prismaMock = {
      camino: {
        findUnique: vi.fn().mockResolvedValue(baseDeleteCamino),
        delete: vi.fn().mockResolvedValue(baseDeleteCamino),
      },
      caminoPicture: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const uploadsServiceMock = {
      deleteImages: vi.fn(),
    };

    const service = await buildCaminosModule(prismaMock, uploadsServiceMock);

    await service.delete(CAMINO_ID, USER_ID, PILGRIM_ROLES);

    expect(uploadsServiceMock.deleteImages).not.toHaveBeenCalled();
    expect(prismaMock.camino.delete).toHaveBeenCalledOnce();
  });
});
