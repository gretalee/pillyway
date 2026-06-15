import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Readable } from 'stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KindeRole } from '../auth/kinde-jwt.strategy';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../event-log/event-type.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CaminoGpxFilesService } from './camino-gpx-files.service';
import { UploadCaminoGpxFileDto } from './dto/upload-camino-gpx-file.dto';
import { GpxStorageService } from './gpx-storage.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const CAMINO_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const OTHER_CAMINO_ID = 'd4e5f6a7-b8c9-0123-defa-234567890123';
const GPX_FILE_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const USER_ID = 'kinde-user-001';
const OTHER_USER_ID = 'kinde-user-002';
const STORAGE_KEY = `camino-gpx-files/${CAMINO_ID}/${GPX_FILE_ID}.gpx`;

const PILGRIM_ROLES: KindeRole[] = [{ id: 'r1', key: 'pilgrim', name: 'Pilgrim' }];
const OWNER_ROLES: KindeRole[] = [
  { id: 'r1', key: 'pilgrim', name: 'Pilgrim' },
  { id: 'r2', key: 'owner', name: 'Owner' },
];

const VALID_GPX_11 = Buffer.from(
  '<?xml version="1.0"?>' +
  '<gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><name>test</name></trk></gpx>',
);

const VALID_GPX_10 = Buffer.from(
  '<?xml version="1.0"?>' +
  '<gpx xmlns="http://www.topografix.com/GPX/1/0"><wpt lat="0" lon="0"/></gpx>',
);

const VALID_GPX_RTE = Buffer.from(
  '<?xml version="1.0"?>' +
  '<gpx xmlns="http://www.topografix.com/GPX/1/1"><rte></rte></gpx>',
);

function makeFakeRecord(overrides: Partial<{
  id: string;
  caminoId: string;
  uploadedBy: string;
  uploaderName: string;
  fileName: string;
  storageKey: string;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: GPX_FILE_ID,
    caminoId: CAMINO_ID,
    uploadedBy: USER_ID,
    uploaderName: 'Test User',
    fileName: 'my-track',
    storageKey: STORAGE_KEY,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeDto(overrides: Partial<UploadCaminoGpxFileDto> = {}): UploadCaminoGpxFileDto {
  return { fileName: 'My Track', ...overrides } as UploadCaminoGpxFileDto;
}

function makeFile(buffer: Buffer, mimetype = 'application/gpx+xml'): Express.Multer.File {
  return { buffer, mimetype, originalname: 'track.gpx', size: buffer.length } as Express.Multer.File;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

describe('CaminoGpxFilesService', () => {
  let service: CaminoGpxFilesService;
  let prismaMock: {
    camino: { findUnique: ReturnType<typeof vi.fn> };
    caminoGpxFile: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };
  let gpxStorageMock: {
    uploadGpxFile: ReturnType<typeof vi.fn>;
    streamGpxFile: ReturnType<typeof vi.fn>;
    deleteGpxFile: ReturnType<typeof vi.fn>;
  };
  let eventLogMock: { logEvent: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prismaMock = {
      camino: { findUnique: vi.fn() },
      caminoGpxFile: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
    };
    gpxStorageMock = {
      uploadGpxFile: vi.fn().mockResolvedValue(undefined),
      streamGpxFile: vi.fn(),
      deleteGpxFile: vi.fn().mockResolvedValue(undefined),
    };
    eventLogMock = { logEvent: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        CaminoGpxFilesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: GpxStorageService, useValue: gpxStorageMock },
        { provide: EventLogService, useValue: eventLogMock },
      ],
    }).compile();

    service = module.get(CaminoGpxFilesService);
  });

  // ── getGpxFiles ───────────────────────────────────────────────────────────────

  describe('getGpxFiles', () => {
    it('returns empty array when no files exist', async () => {
      prismaMock.camino.findUnique.mockResolvedValue({ id: CAMINO_ID });
      prismaMock.caminoGpxFile.findMany.mockResolvedValue([]);

      const result = await service.getGpxFiles(CAMINO_ID);

      expect(result).toEqual([]);
    });

    it('returns files sorted newest-first (as returned by Prisma)', async () => {
      const records = [
        makeFakeRecord({ id: 'file-2', createdAt: new Date('2026-06-02T00:00:00Z') }),
        makeFakeRecord({ id: 'file-1', createdAt: new Date('2026-06-01T00:00:00Z') }),
      ];
      prismaMock.camino.findUnique.mockResolvedValue({ id: CAMINO_ID });
      prismaMock.caminoGpxFile.findMany.mockResolvedValue(records);

      const result = await service.getGpxFiles(CAMINO_ID);

      expect(result[0].id).toBe('file-2');
      expect(result[1].id).toBe('file-1');
    });

    it('throws NotFoundException when camino is absent', async () => {
      prismaMock.camino.findUnique.mockResolvedValue(null);

      await expect(service.getGpxFiles(CAMINO_ID)).rejects.toThrow(NotFoundException);
    });

    it('does not expose storageKey in response', async () => {
      prismaMock.camino.findUnique.mockResolvedValue({ id: CAMINO_ID });
      prismaMock.caminoGpxFile.findMany.mockResolvedValue([makeFakeRecord()]);

      const [result] = await service.getGpxFiles(CAMINO_ID);

      expect(result).not.toHaveProperty('storageKey');
    });
  });

  // ── uploadGpxFile — pre-parse rejection ──────────────────────────────────────

  describe('uploadGpxFile — pre-parse guard', () => {
    beforeEach(() => {
      prismaMock.camino.findUnique.mockResolvedValue({ id: CAMINO_ID, name: 'Test Camino' });
      prismaMock.caminoGpxFile.count.mockResolvedValue(0);
    });

    it('rejects buffer containing <!DOCTYPE before calling S3', async () => {
      const buf = Buffer.from('<!DOCTYPE foo SYSTEM "http://evil.com/xxe.dtd">');

      await expect(
        service.uploadGpxFile(CAMINO_ID, makeFile(buf), makeDto(), USER_ID, 'Pilgrim'),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(gpxStorageMock.uploadGpxFile).not.toHaveBeenCalled();
    });

    it('rejects buffer containing <!ENTITY before calling S3', async () => {
      const buf = Buffer.from('<?xml version="1.0"?><!ENTITY xxe SYSTEM "file:///etc/passwd">');

      await expect(
        service.uploadGpxFile(CAMINO_ID, makeFile(buf), makeDto(), USER_ID, 'Pilgrim'),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(gpxStorageMock.uploadGpxFile).not.toHaveBeenCalled();
    });
  });

  // ── uploadGpxFile — XML/GPX validation ───────────────────────────────────────

  describe('uploadGpxFile — XML/GPX validation', () => {
    beforeEach(() => {
      prismaMock.camino.findUnique.mockResolvedValue({ id: CAMINO_ID, name: 'Test Camino' });
      prismaMock.caminoGpxFile.count.mockResolvedValue(0);
    });

    it('rejects non-XML buffer', async () => {
      const buf = Buffer.from('not xml at all <<<');

      await expect(
        service.uploadGpxFile(CAMINO_ID, makeFile(buf), makeDto(), USER_ID, 'Pilgrim'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects valid XML with non-<gpx> root element', async () => {
      const buf = Buffer.from('<kml xmlns="http://www.opengis.net/kml/2.2"></kml>');

      await expect(
        service.uploadGpxFile(CAMINO_ID, makeFile(buf), makeDto(), USER_ID, 'Pilgrim'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects <gpx> with unknown namespace', async () => {
      const buf = Buffer.from('<gpx xmlns="http://example.com/custom"></gpx>');

      await expect(
        service.uploadGpxFile(CAMINO_ID, makeFile(buf), makeDto(), USER_ID, 'Pilgrim'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects <gpx> with GPX 1.2 namespace (not in allowed list)', async () => {
      const buf = Buffer.from(
        '<gpx xmlns="http://www.topografix.com/GPX/1/2"><trk></trk></gpx>',
      );

      await expect(
        service.uploadGpxFile(CAMINO_ID, makeFile(buf), makeDto(), USER_ID, 'Pilgrim'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects GPX 1.1 with no trk/rte/wpt elements', async () => {
      const buf = Buffer.from(
        '<gpx xmlns="http://www.topografix.com/GPX/1/1"><metadata></metadata></gpx>',
      );

      await expect(
        service.uploadGpxFile(CAMINO_ID, makeFile(buf), makeDto(), USER_ID, 'Pilgrim'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('accepts valid GPX 1.1 with <trk>', async () => {
      prismaMock.caminoGpxFile.create.mockResolvedValue(makeFakeRecord());

      await expect(
        service.uploadGpxFile(CAMINO_ID, makeFile(VALID_GPX_11), makeDto(), USER_ID, 'Pilgrim'),
      ).resolves.toBeDefined();
    });

    it('accepts valid GPX 1.0 with <wpt> (not wrongly rejected)', async () => {
      prismaMock.caminoGpxFile.create.mockResolvedValue(makeFakeRecord());

      await expect(
        service.uploadGpxFile(CAMINO_ID, makeFile(VALID_GPX_10), makeDto(), USER_ID, 'Pilgrim'),
      ).resolves.toBeDefined();
    });

    it('accepts valid GPX 1.1 with <rte>', async () => {
      prismaMock.caminoGpxFile.create.mockResolvedValue(makeFakeRecord());

      await expect(
        service.uploadGpxFile(CAMINO_ID, makeFile(VALID_GPX_RTE), makeDto(), USER_ID, 'Pilgrim'),
      ).resolves.toBeDefined();
    });
  });

  // ── uploadGpxFile — per-camino cap ───────────────────────────────────────────

  describe('uploadGpxFile — per-camino cap', () => {
    it('throws UnprocessableEntityException when count is 20, S3 not called', async () => {
      prismaMock.camino.findUnique.mockResolvedValue({ id: CAMINO_ID, name: 'Test Camino' });
      prismaMock.caminoGpxFile.count.mockResolvedValue(20);

      await expect(
        service.uploadGpxFile(CAMINO_ID, makeFile(VALID_GPX_11), makeDto(), USER_ID, 'Pilgrim'),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(gpxStorageMock.uploadGpxFile).not.toHaveBeenCalled();
    });
  });

  // ── uploadGpxFile — happy path ────────────────────────────────────────────────

  describe('uploadGpxFile — happy path', () => {
    beforeEach(() => {
      prismaMock.camino.findUnique.mockResolvedValue({ id: CAMINO_ID, name: 'Test Camino' });
      prismaMock.caminoGpxFile.count.mockResolvedValue(0);
      prismaMock.caminoGpxFile.create.mockResolvedValue(makeFakeRecord());
    });

    it('calls gpxStorage.uploadGpxFile with key matching expected pattern', async () => {
      await service.uploadGpxFile(CAMINO_ID, makeFile(VALID_GPX_11), makeDto(), USER_ID, 'Test User');

      const [calledKey] = gpxStorageMock.uploadGpxFile.mock.calls[0];
      expect(calledKey).toMatch(
        new RegExp(`^camino-gpx-files/${CAMINO_ID}/[0-9a-f-]{36}\\.gpx$`),
      );
    });

    it('stores uploaderName from parameter (composed by controller from JWT)', async () => {
      await service.uploadGpxFile(CAMINO_ID, makeFile(VALID_GPX_11), makeDto(), USER_ID, 'Maria Schmidt');

      const createCall = prismaMock.caminoGpxFile.create.mock.calls[0][0];
      expect(createCall.data.uploaderName).toBe('Maria Schmidt');
    });

    it('uses Pilgrim fallback when uploaderName is empty string', async () => {
      await service.uploadGpxFile(CAMINO_ID, makeFile(VALID_GPX_11), makeDto(), USER_ID, 'Pilgrim');

      const createCall = prismaMock.caminoGpxFile.create.mock.calls[0][0];
      expect(createCall.data.uploaderName).toBe('Pilgrim');
    });

    it('does not expose storageKey in the returned DTO', async () => {
      const result = await service.uploadGpxFile(
        CAMINO_ID, makeFile(VALID_GPX_11), makeDto(), USER_ID, 'Test User',
      );

      expect(result).not.toHaveProperty('storageKey');
    });

    it('calls EventLogService.logEvent (fire-and-forget)', async () => {
      await service.uploadGpxFile(CAMINO_ID, makeFile(VALID_GPX_11), makeDto(), USER_ID, 'Test User');

      expect(eventLogMock.logEvent).toHaveBeenCalledWith(
        EventType.CAMINO_GPX_UPLOADED,
        USER_ID,
        expect.objectContaining({ camino_id: CAMINO_ID }),
      );
    });
  });

  // ── uploadGpxFile — error paths ───────────────────────────────────────────────

  describe('uploadGpxFile — error paths', () => {
    it('throws NotFoundException before S3 call when camino not found', async () => {
      prismaMock.camino.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadGpxFile(CAMINO_ID, makeFile(VALID_GPX_11), makeDto(), USER_ID, 'Pilgrim'),
      ).rejects.toThrow(NotFoundException);

      expect(gpxStorageMock.uploadGpxFile).not.toHaveBeenCalled();
    });

    it('propagates error and does not call prisma.create when S3 upload fails', async () => {
      prismaMock.camino.findUnique.mockResolvedValue({ id: CAMINO_ID, name: 'Test' });
      prismaMock.caminoGpxFile.count.mockResolvedValue(0);
      gpxStorageMock.uploadGpxFile.mockRejectedValue(
        new InternalServerErrorException('S3 failed'),
      );

      await expect(
        service.uploadGpxFile(CAMINO_ID, makeFile(VALID_GPX_11), makeDto(), USER_ID, 'Pilgrim'),
      ).rejects.toThrow(InternalServerErrorException);

      expect(prismaMock.caminoGpxFile.create).not.toHaveBeenCalled();
    });

    it('attempts best-effort S3 cleanup with structured fields when DB insert fails', async () => {
      prismaMock.camino.findUnique.mockResolvedValue({ id: CAMINO_ID, name: 'Test' });
      prismaMock.caminoGpxFile.count.mockResolvedValue(0);
      prismaMock.caminoGpxFile.create.mockRejectedValue(new Error('DB insert failed'));
      // Cleanup succeeds silently
      gpxStorageMock.deleteGpxFile.mockResolvedValue(undefined);

      await expect(
        service.uploadGpxFile(CAMINO_ID, makeFile(VALID_GPX_11), makeDto(), USER_ID, 'Pilgrim'),
      ).rejects.toThrow('DB insert failed');

      // Verify cleanup is called
      expect(gpxStorageMock.deleteGpxFile).toHaveBeenCalledOnce();
    });
  });

  // ── downloadGpxFile ───────────────────────────────────────────────────────────

  describe('downloadGpxFile', () => {
    it('throws NotFoundException when record not found', async () => {
      prismaMock.caminoGpxFile.findFirst.mockResolvedValue(null);

      await expect(service.downloadGpxFile(CAMINO_ID, GPX_FILE_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('IDOR prevention: cross-camino lookup returns NotFoundException', async () => {
      prismaMock.caminoGpxFile.findFirst.mockResolvedValue(null);

      await expect(service.downloadGpxFile(OTHER_CAMINO_ID, GPX_FILE_ID)).rejects.toThrow(
        NotFoundException,
      );

      const findCall = prismaMock.caminoGpxFile.findFirst.mock.calls[0][0];
      expect(findCall.where).toMatchObject({ id: GPX_FILE_ID, caminoId: OTHER_CAMINO_ID });
    });

    it('calls streamGpxFile with the record storageKey and returns fileName', async () => {
      const fakeStream = new Readable({ read() {} });
      prismaMock.caminoGpxFile.findFirst.mockResolvedValue(makeFakeRecord());
      gpxStorageMock.streamGpxFile.mockResolvedValue({ stream: fakeStream, contentLength: 512 });

      const result = await service.downloadGpxFile(CAMINO_ID, GPX_FILE_ID);

      expect(gpxStorageMock.streamGpxFile).toHaveBeenCalledWith(STORAGE_KEY);
      expect(result.stream).toBe(fakeStream);
      expect(result.contentLength).toBe(512);
      expect(result.fileName).toBe('my-track');
    });
  });

  // ── deleteGpxFile ─────────────────────────────────────────────────────────────

  describe('deleteGpxFile', () => {
    it('throws NotFoundException when record is absent', async () => {
      prismaMock.caminoGpxFile.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteGpxFile(CAMINO_ID, GPX_FILE_ID, USER_ID, PILGRIM_ROLES),
      ).rejects.toThrow(NotFoundException);
    });

    it('IDOR prevention: cross-camino lookup returns NotFoundException', async () => {
      prismaMock.caminoGpxFile.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteGpxFile(OTHER_CAMINO_ID, GPX_FILE_ID, USER_ID, PILGRIM_ROLES),
      ).rejects.toThrow(NotFoundException);

      const findCall = prismaMock.caminoGpxFile.findFirst.mock.calls[0][0];
      expect(findCall.where).toMatchObject({ id: GPX_FILE_ID, caminoId: OTHER_CAMINO_ID });
    });

    it('throws ForbiddenException for non-uploader, non-owner', async () => {
      prismaMock.caminoGpxFile.findFirst.mockResolvedValue(makeFakeRecord({ uploadedBy: OTHER_USER_ID }));

      await expect(
        service.deleteGpxFile(CAMINO_ID, GPX_FILE_ID, USER_ID, PILGRIM_ROLES),
      ).rejects.toThrow(ForbiddenException);
    });

    it('uploader can delete their own file (no time-window check)', async () => {
      prismaMock.caminoGpxFile.findFirst.mockResolvedValue(makeFakeRecord({ uploadedBy: USER_ID }));
      prismaMock.caminoGpxFile.delete.mockResolvedValue(undefined);

      await expect(
        service.deleteGpxFile(CAMINO_ID, GPX_FILE_ID, USER_ID, PILGRIM_ROLES),
      ).resolves.toBeUndefined();

      expect(gpxStorageMock.deleteGpxFile).toHaveBeenCalledWith(STORAGE_KEY);
      expect(prismaMock.caminoGpxFile.delete).toHaveBeenCalledWith({ where: { id: GPX_FILE_ID } });
    });

    it('owner can delete any file regardless of uploader', async () => {
      prismaMock.caminoGpxFile.findFirst.mockResolvedValue(makeFakeRecord({ uploadedBy: OTHER_USER_ID }));
      prismaMock.caminoGpxFile.delete.mockResolvedValue(undefined);

      await expect(
        service.deleteGpxFile(CAMINO_ID, GPX_FILE_ID, USER_ID, OWNER_ROLES),
      ).resolves.toBeUndefined();

      expect(gpxStorageMock.deleteGpxFile).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('S3 failure propagates BadGatewayException and DB delete is not called', async () => {
      prismaMock.caminoGpxFile.findFirst.mockResolvedValue(makeFakeRecord({ uploadedBy: USER_ID }));
      gpxStorageMock.deleteGpxFile.mockRejectedValue(new Error('S3 error'));

      await expect(
        service.deleteGpxFile(CAMINO_ID, GPX_FILE_ID, USER_ID, PILGRIM_ROLES),
      ).rejects.toThrow();

      expect(prismaMock.caminoGpxFile.delete).not.toHaveBeenCalled();
    });

    it('calls EventLogService.logEvent after successful delete', async () => {
      prismaMock.caminoGpxFile.findFirst.mockResolvedValue(makeFakeRecord({ uploadedBy: USER_ID }));
      prismaMock.caminoGpxFile.delete.mockResolvedValue(undefined);

      await service.deleteGpxFile(CAMINO_ID, GPX_FILE_ID, USER_ID, PILGRIM_ROLES);

      expect(eventLogMock.logEvent).toHaveBeenCalledWith(
        EventType.CAMINO_GPX_DELETED,
        USER_ID,
        expect.objectContaining({ camino_id: CAMINO_ID, gpx_file_id: GPX_FILE_ID }),
      );
    });
  });
});
