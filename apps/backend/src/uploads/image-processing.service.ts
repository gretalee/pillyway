import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

// Longest edge in pixels. Smaller images are not upscaled.
const MAX_DIMENSION = 1920;
// WebP quality (0–100). 85 gives excellent visual quality at ~50 % smaller file than JPEG.
const WEBP_QUALITY = 85;

@Injectable()
export class ImageProcessingService {
  /**
   * Resizes an image so its longest edge does not exceed MAX_DIMENSION and
   * re-encodes it as WebP. EXIF orientation is corrected automatically.
   * Images already within the size limit are still re-encoded to WebP.
   */
  async processForUpload(input: Buffer): Promise<Buffer> {
    return sharp(input)
      .rotate()
      .resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  }
}
