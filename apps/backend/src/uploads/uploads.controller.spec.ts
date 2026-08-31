import { Logger, LoggerService } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

function makeUploadsServiceMock() {
  return { uploadImages: vi.fn().mockResolvedValue({ urls: [] }) };
}

async function buildController(
  uploadsServiceMock: object,
): Promise<UploadsController> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [UploadsController],
    providers: [{ provide: UploadsService, useValue: uploadsServiceMock }],
  })
    .setLogger(false as unknown as LoggerService)
    .compile();
  return module.get(UploadsController);
}

beforeEach(() => {
  vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
});

describe('UploadsController.uploadImages() — names parsing', () => {
  it('passes undefined names when the field is omitted entirely', async () => {
    const uploadsServiceMock = makeUploadsServiceMock();
    const controller = await buildController(uploadsServiceMock);

    await controller.uploadImages([], undefined);

    expect(uploadsServiceMock.uploadImages).toHaveBeenCalledWith([], undefined);
  });

  it('parses a valid JSON array of names, converting null entries to undefined', async () => {
    const uploadsServiceMock = makeUploadsServiceMock();
    const controller = await buildController(uploadsServiceMock);

    await controller.uploadImages([], '["Mein schönes Bild", null]');

    expect(uploadsServiceMock.uploadImages).toHaveBeenCalledWith(
      [],
      ['Mein schönes Bild', undefined],
    );
  });

  it('falls back to undefined (generated names for every file) on malformed JSON', async () => {
    const uploadsServiceMock = makeUploadsServiceMock();
    const controller = await buildController(uploadsServiceMock);

    await expect(
      controller.uploadImages([], 'not valid json{'),
    ).resolves.toEqual({ urls: [] });

    expect(uploadsServiceMock.uploadImages).toHaveBeenCalledWith([], undefined);
  });

  it('falls back to undefined when the JSON parses but is not an array', async () => {
    const uploadsServiceMock = makeUploadsServiceMock();
    const controller = await buildController(uploadsServiceMock);

    await controller.uploadImages([], '{"not": "an array"}');

    expect(uploadsServiceMock.uploadImages).toHaveBeenCalledWith([], undefined);
  });

  it('converts non-string array entries (e.g. numbers) to undefined rather than passing them through', async () => {
    const uploadsServiceMock = makeUploadsServiceMock();
    const controller = await buildController(uploadsServiceMock);

    await controller.uploadImages([], '["ok", 42, true]');

    expect(uploadsServiceMock.uploadImages).toHaveBeenCalledWith(
      [],
      ['ok', undefined, undefined],
    );
  });
});
