import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
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
        secretAccessKey: this.config.getOrThrow<string>('SUPABASE_S3_SECRET_KEY'),
      },
      forcePathStyle: true,
    });
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

      this.logger.debug(`Uploading key="${key}" size=${file.size} mime=${file.mimetype}`);

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
