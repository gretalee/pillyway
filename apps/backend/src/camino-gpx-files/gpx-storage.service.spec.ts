import {
  BadGatewayException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Readable } from 'stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GpxStorageService } from './gpx-storage.service';

// ─── Hoist the send mock so it's available inside vi.mock() ───────────────────

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock('@aws-sdk/client-s3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aws-sdk/client-s3')>();
  return {
    ...actual,
    // Must be a regular function (not arrow) to support `new S3Client()`
    S3Client: vi.fn().mockImplementation(function (this: { send: typeof mockSend }) {
      this.send = mockSend;
    }),
  };
});

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'camino-gpx-files/camino-id/file-id.gpx';
const GPX_BUFFER = Buffer.from(
  '<?xml version="1.0"?><gpx xmlns="http://www.topografix.com/GPX/1/1"><trk></trk></gpx>',
);

// ─── Setup ────────────────────────────────────────────────────────────────────

function makeConfigService(): ConfigService {
  return {
    getOrThrow: (key: string) => {
      const map: Record<string, string> = {
        SUPABASE_STORAGE_BUCKET_GPX: 'pilly_gpx',
        SUPABASE_S3_URL: 'http://localhost:54321/storage/v1/s3',
        SUPABASE_S3_REGION: 'local',
        SUPABASE_S3_ACCESS_KEY: 'test-key',
        SUPABASE_S3_SECRET_KEY: 'test-secret',
      };
      return map[key];
    },
  } as unknown as ConfigService;
}

describe('GpxStorageService', () => {
  let service: GpxStorageService;

  beforeEach(async () => {
    mockSend.mockReset();

    const module = await Test.createTestingModule({
      providers: [
        GpxStorageService,
        { provide: ConfigService, useValue: makeConfigService() },
      ],
    }).compile();

    service = module.get(GpxStorageService);
  });

  // ── uploadGpxFile ────────────────────────────────────────────────────────────

  describe('uploadGpxFile', () => {
    it('sends PutObjectCommand with correct bucket, key, buffer, and content type', async () => {
      mockSend.mockResolvedValue({});

      await service.uploadGpxFile(STORAGE_KEY, GPX_BUFFER);

      expect(mockSend).toHaveBeenCalledOnce();
      const cmd = mockSend.mock.calls[0][0];
      expect(cmd.input).toMatchObject({
        Bucket: 'pilly_gpx',
        Key: STORAGE_KEY,
        Body: GPX_BUFFER,
        ContentType: 'application/xml',
      });
    });

    it('throws InternalServerErrorException on S3 SDK error', async () => {
      mockSend.mockRejectedValue(new Error('Network failure'));

      await expect(service.uploadGpxFile(STORAGE_KEY, GPX_BUFFER)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ── streamGpxFile ────────────────────────────────────────────────────────────

  describe('streamGpxFile', () => {
    it('returns a readable stream and contentLength from S3 response', async () => {
      const fakeStream = new Readable({ read() {} });
      mockSend.mockResolvedValue({ Body: fakeStream, ContentLength: 1024 });

      const result = await service.streamGpxFile(STORAGE_KEY);

      expect(result.stream).toBe(fakeStream);
      expect(result.contentLength).toBe(1024);
    });

    it('throws NotFoundException when S3 returns NoSuchKey error (name)', async () => {
      const err = Object.assign(new Error('Not found'), { name: 'NoSuchKey' });
      mockSend.mockRejectedValue(err);

      await expect(service.streamGpxFile(STORAGE_KEY)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when S3 returns NoSuchKey error (Code)', async () => {
      const err = Object.assign(new Error('Not found'), { Code: 'NoSuchKey' });
      mockSend.mockRejectedValue(err);

      await expect(service.streamGpxFile(STORAGE_KEY)).rejects.toThrow(NotFoundException);
    });

    it('throws InternalServerErrorException when Body is null', async () => {
      mockSend.mockResolvedValue({ Body: null, ContentLength: 0 });

      await expect(service.streamGpxFile(STORAGE_KEY)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws InternalServerErrorException on other S3 SDK errors', async () => {
      mockSend.mockRejectedValue(new Error('Unknown S3 error'));

      await expect(service.streamGpxFile(STORAGE_KEY)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ── deleteGpxFile ────────────────────────────────────────────────────────────

  describe('deleteGpxFile', () => {
    it('sends DeleteObjectsCommand with correct bucket and key', async () => {
      mockSend.mockResolvedValue({ Errors: [] });

      await service.deleteGpxFile(STORAGE_KEY);

      expect(mockSend).toHaveBeenCalledOnce();
      const cmd = mockSend.mock.calls[0][0];
      expect(cmd.input).toMatchObject({
        Bucket: 'pilly_gpx',
        Delete: { Objects: [{ Key: STORAGE_KEY }], Quiet: false },
      });
    });

    it('throws BadGatewayException when SDK throws', async () => {
      mockSend.mockRejectedValue(new Error('S3 unavailable'));

      await expect(service.deleteGpxFile(STORAGE_KEY)).rejects.toThrow(BadGatewayException);
    });

    it('throws BadGatewayException when response.Errors is non-empty', async () => {
      mockSend.mockResolvedValue({
        Errors: [{ Key: STORAGE_KEY, Code: 'AccessDenied', Message: 'denied' }],
      });

      await expect(service.deleteGpxFile(STORAGE_KEY)).rejects.toThrow(BadGatewayException);
    });
  });
});
