import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UploadsService } from './uploads.service';

// ─── Hoist the send mock so it's available inside vi.mock() ──────────────────

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('@aws-sdk/client-s3', () => ({
  // eslint-disable-next-line prefer-arrow-callback
  S3Client: vi.fn(function () { return { send: sendMock }; }),
  // eslint-disable-next-line prefer-arrow-callback
  PutObjectCommand: vi.fn(function (input: unknown) { return { input }; }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://abcdef.supabase.co';
const BUCKET = 'pillyway-images';

const defaultConfig: Record<string, string> = {
  SUPABASE_URL,
  SUPABASE_STORAGE_BUCKET: BUCKET,
  SUPABASE_S3_URL: 'https://abcdef.supabase.co/storage/v1/s3',
  SUPABASE_S3_REGION: 'eu-central-1',
  SUPABASE_S3_ACCESS_KEY: 'test-access-key',
  SUPABASE_S3_SECRET_KEY: 'test-secret-key',
};

function makeFile(
  originalname = 'photo.jpg',
  mimetype = 'image/jpeg',
): Express.Multer.File {
  return {
    fieldname: 'files',
    originalname,
    encoding: '7bit',
    mimetype,
    size: 1024,
    buffer: Buffer.from('fake-image-data'),
    stream: null as unknown as NodeJS.ReadableStream,
    destination: '',
    filename: '',
    path: '',
  };
}

function buildModule(configValues: Record<string, string>): Promise<TestingModule> {
  const configServiceMock: Partial<ConfigService> = {
    getOrThrow: vi.fn(<T = string>(key: string): T => {
      if (key in configValues) return configValues[key] as unknown as T;
      throw new Error(`Config key not found: ${key}`);
    }),
  };

  return Test.createTestingModule({
    providers: [
      UploadsService,
      { provide: ConfigService, useValue: configServiceMock },
    ],
  })
    .setLogger(false)
    .compile();
}

// ─── Success paths ─────────────────────────────────────────────────────────────

describe('UploadsService.uploadImages() — success', () => {
  beforeEach(() => sendMock.mockResolvedValue({}));
  afterEach(() => vi.clearAllMocks());

  it('returns an object with a urls array containing one URL for a single file', async () => {
    const service = (await buildModule(defaultConfig)).get(UploadsService);
    const result = await service.uploadImages([makeFile()]);

    expect(result.urls).toHaveLength(1);
    expect(result.urls[0]).toMatch(
      new RegExp(`^${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/images/`),
    );
  });

  it('returns one URL per file when multiple files are uploaded', async () => {
    const service = (await buildModule(defaultConfig)).get(UploadsService);
    const result = await service.uploadImages([
      makeFile('a.jpg'),
      makeFile('b.png', 'image/png'),
      makeFile('c.webp', 'image/webp'),
    ]);

    expect(result.urls).toHaveLength(3);
  });

  it('calls PutObjectCommand with correct bucket, key prefix, and content type', async () => {
    const service = (await buildModule(defaultConfig)).get(UploadsService);
    await service.uploadImages([makeFile('shot.jpg', 'image/jpeg')]);

    const MockedPutObjectCommand = vi.mocked(PutObjectCommand);
    expect(MockedPutObjectCommand).toHaveBeenCalledOnce();
    const arg = MockedPutObjectCommand.mock.calls[0][0];
    expect(arg.Bucket).toBe(BUCKET);
    expect(arg.Key).toMatch(/^images\//);
    expect(arg.ContentType).toBe('image/jpeg');
    expect(arg.Body).toBeInstanceOf(Buffer);
  });

  it('sanitises special characters in the original filename', async () => {
    const service = (await buildModule(defaultConfig)).get(UploadsService);
    await service.uploadImages([makeFile('my photo (1).jpg')]);

    const MockedPutObjectCommand = vi.mocked(PutObjectCommand);
    const key = MockedPutObjectCommand.mock.calls[0][0].Key as string;
    expect(key.split('/').pop()!).not.toMatch(/[ ()]/);
  });

  it('returns an empty urls array when given an empty files array', async () => {
    const service = (await buildModule(defaultConfig)).get(UploadsService);
    sendMock.mockClear(); // reset any calls recorded during module construction
    const result = await service.uploadImages([]);

    expect(result.urls).toEqual([]);
    expect(sendMock).not.toHaveBeenCalled();
  });
});

// ─── Failure paths ─────────────────────────────────────────────────────────────

describe('UploadsService.uploadImages() — failure', () => {
  afterEach(() => vi.clearAllMocks());

  it('throws InternalServerErrorException when S3 send rejects', async () => {
    sendMock.mockRejectedValue(new Error('S3 network error'));
    const service = (await buildModule(defaultConfig)).get(UploadsService);

    await expect(service.uploadImages([makeFile('broken.jpg')])).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('includes the original filename in the error message', async () => {
    sendMock.mockRejectedValue(new Error('Forbidden'));
    const service = (await buildModule(defaultConfig)).get(UploadsService);

    await expect(service.uploadImages([makeFile('problem-file.jpg')])).rejects.toThrow(
      'problem-file.jpg',
    );
  });

  it('stops uploading on the first failure and throws immediately', async () => {
    sendMock.mockRejectedValue(new Error('Bad Gateway'));
    const service = (await buildModule(defaultConfig)).get(UploadsService);

    await expect(
      service.uploadImages([makeFile('first.jpg'), makeFile('second.jpg')]),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(sendMock).toHaveBeenCalledOnce();
  });
});
