import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

/**
 * One entry per place in the app an image gets uploaded. Each gets its own
 * "gallery" (full-view) target — a hero banner and a lightbox-viewed gallery
 * photo don't need the same ceiling. Accommodation and sight images share
 * one 'waypoint-content' profile: both are small card/lightbox photos of a
 * point of interest, treated identically, and the shared /uploads/images
 * endpoint they both go through has no way to distinguish which entity type
 * is calling it anyway — a real per-type distinction can be added later if
 * their treatment ever needs to actually differ. The "thumbnail" (grid/card)
 * target is shared across ALL contexts — see THUMBNAIL_PROFILE below —
 * since a thumbnail's job (a small preview) doesn't vary by context the way
 * the full-view image's does.
 */
export type ImageContext =
  | 'camino-hero'
  | 'camino-gallery'
  | 'waypoint-content';

interface SizeProfile {
  /** Longest edge in pixels. Smaller inputs are never upscaled. */
  maxDimension: number;
  /** Target output size in bytes. The quality step-down loop stops once
   * under this, or at QUALITY_FLOOR — whichever comes first. */
  maxBytes: number;
}

const GALLERY_PROFILES: Record<ImageContext, SizeProfile> = {
  'camino-hero': { maxDimension: 1600, maxBytes: 300_000 },
  'camino-gallery': { maxDimension: 1920, maxBytes: 400_000 },
  'waypoint-content': { maxDimension: 1600, maxBytes: 250_000 },
};

const THUMBNAIL_PROFILE: SizeProfile = { maxDimension: 400, maxBytes: 80_000 };

// Quality ladder for the adaptive step-down loop. WebP output size is
// monotonically non-increasing as quality drops for a fixed resize, so a
// simple linear walk converges — no need for binary search at this step
// count (confirmed with software-architect-lead). QUALITY_FLOOR is the
// last-resort step: below this, artifacting becomes visually objectionable,
// so we stop degrading and ship the best-effort result rather than block
// the upload entirely.
const QUALITY_STEPS = [80, 70, 60, 50, 40] as const;
const QUALITY_FLOOR = QUALITY_STEPS[QUALITY_STEPS.length - 1];

// effort trades CPU time for compression ratio at a fixed quality (0-6,
// sharp default 4). Explicit 4 keeps the up-to-10-encodes-per-upload
// (2 sizes × up to 5 quality steps) well within request-latency budget —
// see the synchronous-vs-background-job note on processForUpload below.
const WEBP_EFFORT = 4;

// Pixel cap to guard against decompression bombs (100 MP ≈ 10 000 × 10 000).
const MAX_INPUT_PIXELS = 100_000_000;

export interface ProcessedImage {
  gallery: Buffer;
  thumbnail: Buffer;
}

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  /**
   * Produces two WebP derivatives of an uploaded image — a context-sized
   * "gallery" (full) view and a shared, smaller "thumbnail" — using an
   * adaptive quality step-down so a byte-size budget is actually hit rather
   * than applying one flat quality to every input regardless of size.
   *
   * Runs synchronously in the request (matches prior behaviour). Worst case
   * is ~10 WebP encodes (2 sizes × up to 5 quality steps), each on an
   * already-downsized in-memory buffer — low-single-digit ms each,
   * negligible next to the S3 round-trips already on this path. Revisit
   * only if a third derivative size is added, or effort is raised for
   * smaller files (software-architect-lead guidance).
   *
   * EXIF orientation is corrected automatically. Images already within a
   * profile's limits pass through close to unchanged: the first quality
   * step (80) is usually enough, so nothing here re-crunches an already-
   * small photo — it just re-encodes it once to WebP at good quality.
   */
  async processForUpload(
    input: Buffer,
    context: ImageContext,
  ): Promise<ProcessedImage> {
    const galleryProfile = GALLERY_PROFILES[context];

    // Decode the (possibly huge, e.g. 4000px/8MB phone photo) original
    // exactly once, auto-rotated and resized to the gallery target. Every
    // later step — the thumbnail resize and all quality-step re-encodes —
    // operates on this already-small buffer, never the original again.
    const resizedGallery = await sharp(input, {
      limitInputPixels: MAX_INPUT_PIXELS,
    })
      .rotate()
      .resize(galleryProfile.maxDimension, galleryProfile.maxDimension, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();

    // Thumbnail derives from the already-downsized gallery buffer, not the
    // original — a 400px thumbnail needs no more source detail than the
    // gallery size already has, and this avoids a second full decode.
    const resizedThumbnail = await sharp(resizedGallery)
      .resize(THUMBNAIL_PROFILE.maxDimension, THUMBNAIL_PROFILE.maxDimension, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();

    const [gallery, thumbnail] = await Promise.all([
      this.encodeToBudget(resizedGallery, galleryProfile.maxBytes, 'gallery'),
      this.encodeToBudget(
        resizedThumbnail,
        THUMBNAIL_PROFILE.maxBytes,
        'thumbnail',
      ),
    ]);

    return { gallery, thumbnail };
  }

  /**
   * Encodes an already-resized pixel buffer to WebP, stepping quality down
   * the QUALITY_STEPS ladder until the output fits maxBytes or the floor is
   * hit. A fresh `sharp()` instance is required per iteration — a pipeline
   * is single-use once a terminal method (`.toBuffer()`) has been called
   * and throws "Input image already used" on reuse (confirmed with
   * software-architect-lead) — so each step re-wraps the same small,
   * already-resized `resizedBuffer`, not the original.
   */
  private async encodeToBudget(
    resizedBuffer: Buffer,
    maxBytes: number,
    label: string,
  ): Promise<Buffer> {
    let best: Buffer = resizedBuffer;
    for (const quality of QUALITY_STEPS) {
      const encoded = await sharp(resizedBuffer)
        .webp({ quality, effort: WEBP_EFFORT })
        .toBuffer();
      best = encoded;
      if (encoded.byteLength <= maxBytes || quality === QUALITY_FLOOR) {
        if (encoded.byteLength > maxBytes) {
          this.logger.warn(
            `${label}: could not meet byte budget ${maxBytes} even at quality floor ${QUALITY_FLOOR} ` +
              `(got ${encoded.byteLength} bytes) — shipping best-effort result rather than blocking the upload.`,
          );
        }
        return encoded;
      }
    }
    return best;
  }
}
