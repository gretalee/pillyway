import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UploadsService } from './uploads.service';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://abcdef.supabase.co';
const SERVICE_ROLE_KEY = 'test-service-role-key';
const BUCKET = 'pillyway-images';

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

// ─── Module builder ───────────────────────────────────────────────────────────

function buildModule(configValues: Record<string, string>): Promise<TestingModule> {
  const configServiceMock: Partial<ConfigService> = {
    getOrThrow: vi.fn(<T = string>(key: string): T => {
      if (key in configValues) {
        return configValues[key] as unknown as T;
      }
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

const defaultConfig = {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
  SUPABASE_STORAGE_BUCKET: BUCKET,
};

// ─── UploadsService.uploadImages() — Success paths ───────────────────────────

describe('UploadsService.uploadImages() — success', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns an object with a urls array containing one URL for a single file', async () => {
    const module = await buildModule(defaultConfig);
    const service = module.get(UploadsService);

    const result = await service.uploadImages([makeFile()]);

    expect(result.urls).toHaveLength(1);
    // URL must start with the public storage prefix
    expect(result.urls[0]).toMatch(
      new RegExp(
        `^${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/images/`,
      ),
    );
  });

  it('returns one URL per file when multiple files are uploaded', async () => {
    const module = await buildModule(defaultConfig);
    const service = module.get(UploadsService);

    const result = await service.uploadImages([
      makeFile('a.jpg'),
      makeFile('b.png', 'image/png'),
      makeFile('c.webp', 'image/webp'),
    ]);

    expect(result.urls).toHaveLength(3);
  });

  it('calls fetch with correct method, auth header, and content-type', async () => {
    const module = await buildModule(defaultConfig);
    const service = module.get(UploadsService);
    const file = makeFile('shot.jpg', 'image/jpeg');

    await service.uploadImages([file]);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];

    expect(url).toMatch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/images/`);
    expect((init.headers as Record<string, string>)['Authorization']).toBe(
      `Bearer ${SERVICE_ROLE_KEY}`,
    );
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'image/jpeg',
    );
    expect(init.method).toBe('POST');
  });

  it('sanitises special characters in the original filename', async () => {
    const module = await buildModule(defaultConfig);
    const service = module.get(UploadsService);

    await service.uploadImages([makeFile('my photo (1).jpg')]);

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    // The filename portion after the UUID should not contain spaces or parens
    const urlPart = url.split('/images/')[1];
    expect(urlPart).not.toMatch(/[ ()]/);
  });

  it('returns an empty urls array when given an empty files array', async () => {
    const module = await buildModule(defaultConfig);
    const service = module.get(UploadsService);

    const result = await service.uploadImages([]);

    expect(result.urls).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ─── UploadsService.uploadImages() — Failure paths ───────────────────────────

describe('UploadsService.uploadImages() — failure', () => {
  afterEach(() => vi.restoreAllMocks());

  it('throws InternalServerErrorException when Supabase returns a non-2xx response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    );

    const module = await buildModule(defaultConfig);
    const service = module.get(UploadsService);

    await expect(
      service.uploadImages([makeFile('broken.jpg')]),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('includes the original filename in the error message', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Forbidden', { status: 403 }),
    );

    const module = await buildModule(defaultConfig);
    const service = module.get(UploadsService);

    await expect(
      service.uploadImages([makeFile('problem-file.jpg')]),
    ).rejects.toThrow('problem-file.jpg');
  });

  it('stops uploading on the first failure and throws immediately', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('Bad Gateway', { status: 502 }));

    const module = await buildModule(defaultConfig);
    const service = module.get(UploadsService);

    await expect(
      service.uploadImages([makeFile('first.jpg'), makeFile('second.jpg')]),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    // Only the first file's upload should have been attempted
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});
