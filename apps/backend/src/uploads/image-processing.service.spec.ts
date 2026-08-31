import { Logger, LoggerService } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { randomBytes } from 'crypto';

import { ImageProcessingService } from './image-processing.service';

// ─── Synthetic test images ─────────────────────────────────────────────────
// Real sharp, real (tiny, in-memory-generated) images — the whole point of
// this service is actual resize/budget behaviour, which a mocked sharp
// couldn't meaningfully verify.

/** A flat-colour PNG at the given dimensions — compresses extremely well,
 * so it exercises the "already small enough at the first quality step" path. */
async function solidColorImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  })
    .png()
    .toBuffer();
}

/** Random-noise pixels — essentially incompressible, so it forces the
 * quality step-down loop to actually walk multiple steps (or hit the floor). */
async function noiseImage(width: number, height: number): Promise<Buffer> {
  const raw = randomBytes(width * height * 3);
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
}

async function metadata(buffer: Buffer) {
  return sharp(buffer).metadata();
}

async function buildService(): Promise<ImageProcessingService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [ImageProcessingService],
  })
    .setLogger(false as unknown as LoggerService)
    .compile();
  return module.get(ImageProcessingService);
}

beforeEach(() => {
  // encodeToBudget logs a warning when a noisy image can't hit budget even
  // at the quality floor — expected noise in the "hits the floor" test.
  vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ImageProcessingService.processForUpload()', () => {
  it("resizes a large image down to the context profile's max dimension", async () => {
    const service = await buildService();
    const large = await solidColorImage(4000, 3000);

    const { gallery } = await service.processForUpload(large, 'camino-gallery');

    const meta = await metadata(gallery);
    expect(Math.max(meta.width, meta.height)).toBeLessThanOrEqual(1920);
  });

  it("does not upscale an image already smaller than the profile's max dimension", async () => {
    const service = await buildService();
    const small = await solidColorImage(300, 200);

    const { gallery } = await service.processForUpload(small, 'camino-gallery');

    const meta = await metadata(gallery);
    expect(meta.width).toBe(300);
    expect(meta.height).toBe(200);
  });

  it('always outputs WebP regardless of input format', async () => {
    const service = await buildService();
    const png = await solidColorImage(500, 500);

    const { gallery, thumbnail } = await service.processForUpload(
      png,
      'waypoint-content',
    );

    expect((await metadata(gallery)).format).toBe('webp');
    expect((await metadata(thumbnail)).format).toBe('webp');
  });

  it('produces a thumbnail smaller in dimensions than the gallery image', async () => {
    const service = await buildService();
    const large = await solidColorImage(4000, 3000);

    const { gallery, thumbnail } = await service.processForUpload(
      large,
      'camino-gallery',
    );

    const galleryMeta = await metadata(gallery);
    const thumbMeta = await metadata(thumbnail);
    expect(Math.max(thumbMeta.width, thumbMeta.height)).toBeLessThanOrEqual(
      400,
    );
    expect(thumbMeta.width).toBeLessThan(galleryMeta.width);
  });

  it('applies different gallery dimension ceilings per context', async () => {
    const service = await buildService();
    const large = await solidColorImage(4000, 3000);

    const hero = await service.processForUpload(large, 'camino-hero');
    const gallery = await service.processForUpload(large, 'camino-gallery');

    const heroMeta = await metadata(hero.gallery);
    const galleryMeta = await metadata(gallery.gallery);
    expect(Math.max(heroMeta.width, heroMeta.height)).toBeLessThanOrEqual(1600);
    expect(Math.max(galleryMeta.width, galleryMeta.height)).toBeLessThanOrEqual(
      1920,
    );
  });

  it('keeps an already-small, simple image at high quality (first step is enough)', async () => {
    const service = await buildService();
    const small = await solidColorImage(200, 150);

    const { gallery } = await service.processForUpload(
      small,
      'waypoint-content',
    );

    // A flat-colour 200x150 WebP at quality 80 is tiny — nowhere near the
    // 250KB accommodation budget, proving the loop didn't need to degrade further.
    expect(gallery.byteLength).toBeLessThan(10_000);
  });

  it('steps quality down for a hard-to-compress (noisy) image without throwing, and stays bounded', async () => {
    const service = await buildService();
    // Large + high-entropy: likely to blow the byte budget even after resize,
    // forcing the quality ladder to walk down toward (or hit) the floor.
    const noisy = await noiseImage(1920, 1920);

    const { gallery } = await service.processForUpload(noisy, 'camino-gallery');

    // Must return a real WebP buffer either way — best-effort at the floor,
    // never an unbounded loop or a thrown error.
    expect((await metadata(gallery)).format).toBe('webp');
    expect(gallery.byteLength).toBeGreaterThan(0);
  });

  it('rejects a corrupt/non-image buffer', async () => {
    const service = await buildService();
    const garbage = Buffer.from([
      0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
    ]);

    await expect(
      service.processForUpload(garbage, 'waypoint-content'),
    ).rejects.toThrow();
  });
});
