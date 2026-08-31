import {
  BadGatewayException,
  BadRequestException,
  InternalServerErrorException,
  LoggerService,
} from '@nestjs/common';
import { Readable } from 'stream';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DeleteObjectsCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UploadsService } from './uploads.service';
import { ImageProcessingService } from './image-processing.service';

// ─── Hoist the send mock so it's available inside vi.mock() ──────────────────

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(function () {
    return { send: sendMock };
  }),

  PutObjectCommand: vi.fn(function (input: unknown) {
    return { input };
  }),

  DeleteObjectsCommand: vi.fn(function (input: unknown) {
    return { input };
  }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://abcdef.supabase.co';
const BUCKET = 'pillyway-images';
const PUBLIC_BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

const defaultConfig: Record<string, string> = {
  SUPABASE_URL,
  SUPABASE_STORAGE_BUCKET: BUCKET,
  SUPABASE_S3_URL: 'https://abcdef.supabase.co/storage/v1/s3',
  SUPABASE_S3_REGION: 'eu-central-1',
  SUPABASE_S3_ACCESS_KEY: 'test-access-key',
  SUPABASE_S3_SECRET_KEY: 'test-secret-key',
};

const GALLERY_BUFFER = Buffer.from([0x52, 0x49, 0x46, 0x46]); // fake WebP bytes
const THUMBNAIL_BUFFER = Buffer.from([0x57, 0x45, 0x42, 0x50]); // fake WebP bytes

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
    stream: null as unknown as Readable,
    destination: '',
    filename: '',
    path: '',
  };
}

function makeImageProcessingServiceMock() {
  return {
    processForUpload: vi.fn().mockResolvedValue({
      gallery: GALLERY_BUFFER,
      thumbnail: THUMBNAIL_BUFFER,
    }),
  };
}

function buildModule(
  configValues: Record<string, string>,
  imageProcessingMock: object = makeImageProcessingServiceMock(),
): Promise<TestingModule> {
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
      { provide: ImageProcessingService, useValue: imageProcessingMock },
    ],
  })
    .setLogger(false as unknown as LoggerService)
    .compile();
}

// ─── uploadImages() — success ──────────────────────────────────────────────────

describe('UploadsService.uploadImages() — success', () => {
  beforeEach(() => sendMock.mockResolvedValue({}));
  afterEach(() => vi.clearAllMocks());

  it('returns an object with a urls array containing one (gallery) URL for a single file', async () => {
    const service = (await buildModule(defaultConfig)).get(UploadsService);
    const result = await service.uploadImages([makeFile()]);

    expect(result.urls).toHaveLength(1);
    expect(result.urls[0]).toMatch(new RegExp(`^${PUBLIC_BASE_URL}/images/`));
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

  it('processes every file through ImageProcessingService with the waypoint-content context', async () => {
    const imageMock = makeImageProcessingServiceMock();
    const service = (await buildModule(defaultConfig, imageMock)).get(
      UploadsService,
    );

    await service.uploadImages([
      makeFile('a.jpg'),
      makeFile('b.png', 'image/png'),
    ]);

    expect(imageMock.processForUpload).toHaveBeenCalledTimes(2);
    expect(imageMock.processForUpload).toHaveBeenCalledWith(
      expect.any(Buffer),
      'waypoint-content',
    );
  });

  it('uploads both a gallery and a derived thumbnail object per file, both as image/webp', async () => {
    const service = (await buildModule(defaultConfig)).get(UploadsService);
    await service.uploadImages([makeFile('shot.jpg', 'image/jpeg')]);

    const MockedPutObjectCommand = vi.mocked(PutObjectCommand);
    expect(MockedPutObjectCommand).toHaveBeenCalledTimes(2);

    const [galleryCall, thumbCall] = MockedPutObjectCommand.mock.calls.map(
      (c) => c[0],
    );
    expect(galleryCall.Bucket).toBe(BUCKET);
    expect(galleryCall.Key).toMatch(/^images\/[^/]+\.webp$/);
    expect(galleryCall.ContentType).toBe('image/webp');
    expect(galleryCall.Body).toEqual(GALLERY_BUFFER);

    expect(thumbCall.Key).toBe(
      galleryCall.Key!.replace(/\.webp$/, '-thumb.webp'),
    );
    expect(thumbCall.ContentType).toBe('image/webp');
    expect(thumbCall.Body).toEqual(THUMBNAIL_BUFFER);
  });

  it('never uses the original filename in the generated key (server-generated only)', async () => {
    const service = (await buildModule(defaultConfig)).get(UploadsService);
    await service.uploadImages([makeFile('my photo (1) — weird/chars?.jpg')]);

    const MockedPutObjectCommand = vi.mocked(PutObjectCommand);
    const key = MockedPutObjectCommand.mock.calls[0][0].Key as string;
    expect(key).toMatch(/^images\/[0-9a-f-]+\.webp$/);
  });

  it('returns an empty urls array when given an empty files array', async () => {
    const service = (await buildModule(defaultConfig)).get(UploadsService);
    sendMock.mockClear(); // reset any calls recorded during module construction
    const result = await service.uploadImages([]);

    expect(result.urls).toEqual([]);
    expect(sendMock).not.toHaveBeenCalled();
  });
});

// ─── uploadImages() — failure ──────────────────────────────────────────────────

describe('UploadsService.uploadImages() — failure', () => {
  afterEach(() => vi.clearAllMocks());

  it('throws BadRequestException when image processing fails, without reaching S3', async () => {
    sendMock.mockResolvedValue({});
    const imageMock = {
      processForUpload: vi
        .fn()
        .mockRejectedValue(new Error('unsupported image format')),
    };
    const service = (await buildModule(defaultConfig, imageMock)).get(
      UploadsService,
    );
    // Module construction itself (S3Client instantiation in the
    // UploadsService constructor) is unrelated, but clear here anyway so
    // this assertion only reflects calls made during the action under test.
    sendMock.mockClear();

    await expect(
      service.uploadImages([makeFile('corrupt.jpg')]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('throws InternalServerErrorException when S3 send rejects', async () => {
    sendMock.mockRejectedValue(new Error('S3 network error'));
    const service = (await buildModule(defaultConfig)).get(UploadsService);

    await expect(
      service.uploadImages([makeFile('broken.jpg')]),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('includes the original filename in the processing-error message', async () => {
    const imageMock = {
      processForUpload: vi.fn().mockRejectedValue(new Error('bad image')),
    };
    const service = (await buildModule(defaultConfig, imageMock)).get(
      UploadsService,
    );

    await expect(
      service.uploadImages([makeFile('problem-file.jpg')]),
    ).rejects.toThrow('problem-file.jpg');
  });

  it('stops uploading on the first failure and throws immediately', async () => {
    sendMock.mockRejectedValue(new Error('Bad Gateway'));
    const service = (await buildModule(defaultConfig)).get(UploadsService);

    await expect(
      service.uploadImages([makeFile('first.jpg'), makeFile('second.jpg')]),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    // First file's gallery PUT fails immediately — its thumbnail PUT (fired
    // in parallel via Promise.all) may or may not have been sent depending
    // on scheduling, but the second FILE must never be attempted.
    const MockedPutObjectCommand = vi.mocked(PutObjectCommand);
    const uploadedKeys = MockedPutObjectCommand.mock.calls.map((c) => c[0].Key);
    expect(uploadedKeys.every((k) => !String(k).includes('second'))).toBe(true);
  });
});

// ─── uploadImagePair() ──────────────────────────────────────────────────────────

describe('UploadsService.uploadImagePair()', () => {
  beforeEach(() => sendMock.mockResolvedValue({}));
  afterEach(() => vi.clearAllMocks());

  it('uploads gallery at the given key and thumbnail at the derived -thumb key', async () => {
    const service = (await buildModule(defaultConfig)).get(UploadsService);

    const url = await service.uploadImagePair('images/abc.webp', {
      gallery: GALLERY_BUFFER,
      thumbnail: THUMBNAIL_BUFFER,
    });

    expect(url).toBe(`${PUBLIC_BASE_URL}/images/abc.webp`);
    const MockedPutObjectCommand = vi.mocked(PutObjectCommand);
    const keys = MockedPutObjectCommand.mock.calls.map((c) => c[0].Key);
    expect(keys).toContain('images/abc.webp');
    expect(keys).toContain('images/abc-thumb.webp');
  });

  it('rejects if the thumbnail PUT fails, even if the gallery PUT would succeed', async () => {
    // uploadImagePair fires both PUTs via Promise.all — the gallery call is
    // constructed and sent (synchronously, up to its own await) before the
    // thumbnail one, so mocking by call order (not by inspecting the
    // command's contents) deterministically targets "thumbnail fails".
    sendMock
      .mockResolvedValueOnce({}) // gallery PUT succeeds
      .mockRejectedValueOnce(new Error('S3 unavailable')); // thumbnail PUT fails
    const service = (await buildModule(defaultConfig)).get(UploadsService);

    await expect(
      service.uploadImagePair('images/abc.webp', {
        gallery: GALLERY_BUFFER,
        thumbnail: THUMBNAIL_BUFFER,
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

// ─── deleteImageStrict() ────────────────────────────────────────────────────────

describe('UploadsService.deleteImageStrict()', () => {
  afterEach(() => vi.clearAllMocks());

  it('deletes the gallery key strictly and the derived thumbnail key best-effort', async () => {
    sendMock.mockResolvedValue({ Errors: [] });
    const service = (await buildModule(defaultConfig)).get(UploadsService);

    await service.deleteImageStrict(`${PUBLIC_BASE_URL}/images/abc.webp`);

    const MockedDeleteObjectsCommand = vi.mocked(DeleteObjectsCommand);
    const allKeys = MockedDeleteObjectsCommand.mock.calls.flatMap((c) =>
      c[0].Delete!.Objects!.map((o) => o.Key),
    );
    expect(allKeys).toContain('images/abc.webp');
    expect(allKeys).toContain('images/abc-thumb.webp');
  });

  it('throws BadGatewayException when the gallery delete fails, without letting a thumbnail failure mask it', async () => {
    sendMock.mockResolvedValue({
      Errors: [{ Key: 'images/abc.webp', Code: 'AccessDenied' }],
    });
    const service = (await buildModule(defaultConfig)).get(UploadsService);

    await expect(
      service.deleteImageStrict(`${PUBLIC_BASE_URL}/images/abc.webp`),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('does not throw when only the thumbnail delete fails (best-effort)', async () => {
    sendMock.mockImplementation(
      (cmd: { input: { Delete: { Objects: { Key: string }[] } } }) => {
        const keys = cmd.input.Delete.Objects.map((o) => o.Key);
        if (keys.some((k) => k.includes('-thumb'))) {
          return Promise.reject(new Error('S3 unavailable for thumbnail'));
        }
        return Promise.resolve({ Errors: [] });
      },
    );
    const service = (await buildModule(defaultConfig)).get(UploadsService);

    await expect(
      service.deleteImageStrict(`${PUBLIC_BASE_URL}/images/abc.webp`),
    ).resolves.toBeUndefined();
  });
});

// ─── deleteImages() ─────────────────────────────────────────────────────────────

describe('UploadsService.deleteImages()', () => {
  afterEach(() => vi.clearAllMocks());

  it('expands each URL to include its derived thumbnail key before deleting', async () => {
    sendMock.mockResolvedValue({});
    const service = (await buildModule(defaultConfig)).get(UploadsService);

    await service.deleteImages([`${PUBLIC_BASE_URL}/images/one.webp`]);

    const MockedDeleteObjectsCommand = vi.mocked(DeleteObjectsCommand);
    const keys =
      MockedDeleteObjectsCommand.mock.calls[0][0].Delete!.Objects!.map(
        (o) => o.Key,
      );
    expect(keys).toEqual(['images/one.webp', 'images/one-thumb.webp']);
  });

  it('is a no-op for an empty array', async () => {
    const service = (await buildModule(defaultConfig)).get(UploadsService);
    sendMock.mockClear();

    await service.deleteImages([]);

    expect(sendMock).not.toHaveBeenCalled();
  });
});
