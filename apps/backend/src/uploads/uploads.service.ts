import {
  BadGatewayException,
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
import { randomUUID } from 'crypto';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
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
   * Uploads a single file to S3 using a caller-supplied key.
   * The key format is fully controlled by the caller — no filename appending.
   * Returns the public URL for the uploaded object.
   */
  async uploadImage(key: string, file: Express.Multer.File): Promise<string> {
    this.logger.debug(
      `Uploading key="${key}" size=${file.size} mime=${file.mimetype}`,
    );

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
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
   * Deletes a single S3 object identified by its public URL.
   * Throws BadGatewayException if the delete operation fails (key appears in
   * response.Errors or the SDK call rejects). Used by picture delete where an
   * S3 failure must block the DB delete.
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
  }

  async uploadImages(
    files: Express.Multer.File[],
  ): Promise<{ urls: string[] }> {
    this.logger.debug(
      `Uploading ${files.length} file(s) to bucket "${this.bucket}"`,
    );

    const urls: string[] = [];

    for (const file of files) {
      const sanitisedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const key = `images/${randomUUID()}-${sanitisedName}`;

      this.logger.debug(
        `Uploading key="${key}" size=${file.size} mime=${file.mimetype}`,
      );

      try {
        await this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          }),
        );
      } catch (err) {
        this.logger.error(
          `S3 upload failed for "${file.originalname}": ${String(err)}`,
        );
        throw new InternalServerErrorException(
          `Failed to upload file: ${file.originalname}`,
        );
      }

      const publicUrl = `${this.publicBaseUrl}/${key}`;
      this.logger.debug(`Uploaded successfully → ${publicUrl}`);
      urls.push(publicUrl);
    }

    return { urls };
  }

  async deleteImages(urls: string[]): Promise<void> {
    if (urls.length === 0) {
      return;
    }

    const prefix = `${this.publicBaseUrl}/`;
    const keys = urls
      .filter((url) => url.startsWith(prefix))
      .map((url) => url.slice(prefix.length));

    if (keys.length < urls.length) {
      this.logger.warn(
        `deleteImages: ${urls.length - keys.length} of ${urls.length} URL(s) did not match the expected prefix and will be skipped. ` +
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
