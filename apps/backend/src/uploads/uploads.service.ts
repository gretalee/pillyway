import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectsCommand,
  DeleteObjectsCommandOutput,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import { buildImageFilename } from './image-name.util';
import {
  ImageProcessingService,
  ProcessedImage,
} from './image-processing.service';
import { deriveThumbnailUrl } from './image-url.util';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly imageProcessing: ImageProcessingService,
  ) {
    this.bucket = this.config.getOrThrow<string>('SUPABASE_STORAGE_BUCKET');
    const endpoint = this.config.getOrThrow<string>('SUPABASE_S3_URL');
    const region = this.config.getOrThrow<string>('SUPABASE_S3_REGION');
    const supabaseUrl = this.config.getOrThrow<string>('SUPABASE_URL');

    this.publicBaseUrl = `${supabaseUrl}/storage/v1/object/public/${this.bucket}`;

    this.s3 = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('SUPABASE_S3_ACCESS_KEY'),
        secretAccessKey: this.config.getOrThrow<string>(
          'SUPABASE_S3_SECRET_KEY',
        ),
      },
      forcePathStyle: true,
    });
  }

  /**
   * Uploads a raw buffer to S3 using a caller-supplied key and content type.
   * The key format is fully controlled by the caller — no filename appending.
   * Returns the public URL for the uploaded object.
   */
  async uploadImage(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    this.logger.debug(
      `Uploading key="${key}" size=${buffer.byteLength} mime=${contentType}`,
    );

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
    } catch (err) {
      this.logger.error(`S3 upload failed for key "${key}": ${String(err)}`);
      throw new InternalServerErrorException('Failed to upload the image.');
    }

    const publicUrl = `${this.publicBaseUrl}/${key}`;
    this.logger.debug(`Uploaded successfully → ${publicUrl}`);
    return publicUrl;
  }

  /**
   * Uploads a gallery+thumbnail derivative pair produced by
   * ImageProcessingService: gallery at `key`, thumbnail at the key's
   * derived `-thumb.webp` sibling. Only the gallery URL is ever returned —
   * per the dual-derivative naming convention, the thumbnail is never
   * stored anywhere, only ever re-derived from the gallery URL on demand
   * (see image-url.util.ts). Either PUT failing fails the whole pair: a
   * gallery URL persisted without its thumbnail sibling would 404 the
   * moment anything requests the derived thumbnail URL.
   */
  async uploadImagePair(key: string, images: ProcessedImage): Promise<string> {
    const [url] = await Promise.all([
      this.uploadImage(key, images.gallery, 'image/webp'),
      this.uploadImage(deriveThumbnailUrl(key), images.thumbnail, 'image/webp'),
    ]);
    return url;
  }

  /**
   * Deletes a single S3 object identified by its public URL, AND its
   * derived thumbnail sibling. The gallery delete is strict — throws
   * BadGatewayException if it fails (key appears in response.Errors or the
   * SDK call rejects), which blocks the caller's DB delete, since a
   * dangling reference to a deleted-but-still-referenced URL must never
   * happen. The thumbnail delete is best-effort: nothing stores or
   * references its URL directly (it's always re-derived), so a failure
   * there is a harmless — if wasteful — orphan, not a dangling reference,
   * and must not block the DB delete the gallery delete is gating.
   */
  async deleteImageStrict(url: string): Promise<void> {
    const prefix = `${this.publicBaseUrl}/`;
    if (!url.startsWith(prefix)) {
      this.logger.error(
        `deleteImageStrict: URL does not match expected prefix — url="${url}"`,
      );
      throw new BadGatewayException(
        'Failed to delete the image from storage. The record has been preserved.',
      );
    }

    const key = url.slice(prefix.length);
    this.logger.debug(
      `Deleting object key="${key}" from bucket "${this.bucket}"`,
    );

    let response: DeleteObjectsCommandOutput;
    try {
      response = await this.s3.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: [{ Key: key }],
            Quiet: false,
          },
        }),
      );
    } catch (err) {
      this.logger.error(
        `S3 deleteImageStrict SDK error for key "${key}": ${String(err)}`,
      );
      throw new BadGatewayException(
        'Failed to delete the image from storage. The record has been preserved.',
      );
    }

    if (response.Errors && response.Errors.length > 0) {
      for (const e of response.Errors) {
        this.logger.error(
          `S3 deleteImageStrict error for key "${e.Key ?? '?'}": [${e.Code ?? '?'}] ${e.Message ?? '?'}`,
        );
      }
      throw new BadGatewayException(
        'Failed to delete the image from storage. The record has been preserved.',
      );
    }

    this.logger.debug(`Object key="${key}" deleted successfully`);

    // Best-effort thumbnail cleanup — see method doc. deleteImages() can
    // itself throw on a hard SDK-level failure (it only self-handles the
    // soft response.Errors case) — same convention as every other
    // best-effort caller of deleteImages() in this codebase (e.g.
    // CaminosService.delete()): wrap it here, don't let it escape.
    try {
      await this.deleteImages([deriveThumbnailUrl(url)]);
    } catch (err) {
      this.logger.error(
        `Failed to delete thumbnail sibling for "${url}": ${String(err)}`,
      );
    }
  }

  /**
   * Processes and uploads up to 10 images (accommodation/sight content —
   * see the 'waypoint-content' context in ImageProcessingService), each as
   * a gallery+thumbnail pair. Returns the gallery URLs only, in the same
   * flat string[] shape as before — no caller-facing/schema change.
   *
   * `names[i]` is an optional display name for `files[i]` (positional,
   * sparse — pass undefined for files that should get a generated name).
   * Sanitized + always suffixed with a unique fragment via
   * buildImageFilename, so a caller-supplied name can never collide with
   * (and overwrite) an existing image.
   */
  async uploadImages(
    files: Express.Multer.File[],
    names?: (string | undefined)[],
  ): Promise<{ urls: string[] }> {
    this.logger.debug(
      `Uploading ${files.length} file(s) to bucket "${this.bucket}"`,
    );

    const urls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let images: ProcessedImage;
      try {
        images = await this.imageProcessing.processForUpload(
          file.buffer,
          'waypoint-content',
        );
      } catch (err) {
        this.logger.warn(
          `Image processing failed for "${file.originalname}": ${String(err)}`,
        );
        throw new BadRequestException(
          `The image "${file.originalname}" could not be processed. Please ensure it is a valid, non-corrupted image file.`,
        );
      }

      const key = `images/${buildImageFilename(names?.[i])}`;

      let url: string;
      try {
        url = await this.uploadImagePair(key, images);
      } catch (err) {
        this.logger.error(
          `S3 upload failed for "${file.originalname}": ${String(err)}`,
        );
        throw new InternalServerErrorException(
          `Failed to upload file: ${file.originalname}`,
        );
      }

      this.logger.debug(`Uploaded successfully → ${url}`);
      urls.push(url);
    }

    return { urls };
  }

  /**
   * Best-effort bulk delete: every given URL AND its derived thumbnail
   * sibling. Never throws — logs and continues, since every caller of this
   * method treats it as best-effort cleanup (unlike deleteImageStrict).
   */
  async deleteImages(urls: string[]): Promise<void> {
    if (urls.length === 0) {
      return;
    }

    const expandedUrls = urls.flatMap((url) => [url, deriveThumbnailUrl(url)]);

    const prefix = `${this.publicBaseUrl}/`;
    const keys = expandedUrls
      .filter((url) => url.startsWith(prefix))
      .map((url) => url.slice(prefix.length));

    if (keys.length < expandedUrls.length) {
      this.logger.warn(
        `deleteImages: ${expandedUrls.length - keys.length} of ${expandedUrls.length} URL(s)/derived key(s) did not match the expected prefix and will be skipped. ` +
          `Possible orphaned S3 objects. Prefix="${prefix}"`,
      );
    }

    if (keys.length === 0) {
      return;
    }

    this.logger.debug(
      `Deleting ${keys.length} object(s) from bucket "${this.bucket}": ${keys.join(', ')}`,
    );

    const response = await this.s3.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: keys.map((Key) => ({ Key })),
          Quiet: false,
        },
      }),
    );

    if (response.Errors && response.Errors.length > 0) {
      for (const err of response.Errors) {
        this.logger.error(
          `S3 delete failed for key "${err.Key ?? '?'}": [${err.Code ?? '?'}] ${err.Message ?? '?'}`,
        );
      }
    }
  }
}
