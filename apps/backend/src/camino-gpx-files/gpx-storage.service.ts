import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const GPX_REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class GpxStorageService {
  private readonly logger = new Logger(GpxStorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.getOrThrow<string>('SUPABASE_STORAGE_BUCKET_GPX');
    // Tech debt: duplicates the S3Client setup from UploadsService — both use the same
    // credentials and endpoint for different buckets. A future refactor should extract
    // a shared @Global() S3ClientProvider.
    this.s3 = new S3Client({
      endpoint: config.getOrThrow<string>('SUPABASE_S3_URL'),
      region: config.getOrThrow<string>('SUPABASE_S3_REGION'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('SUPABASE_S3_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow<string>('SUPABASE_S3_SECRET_KEY'),
      },
      forcePathStyle: true,
      requestHandler: { requestTimeout: GPX_REQUEST_TIMEOUT_MS },
    });
  }

  async uploadGpxFile(storageKey: string, buffer: Buffer): Promise<void> {
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          Body: buffer,
          ContentType: 'application/xml',
        }),
      );
    } catch (err) {
      this.logger.error(`S3 GPX upload failed for key "${storageKey}": ${String(err)}`);
      throw new InternalServerErrorException('Failed to upload the GPX file.');
    }
  }

  async streamGpxFile(
    storageKey: string,
  ): Promise<{ stream: Readable; contentLength: number | undefined }> {
    let output;
    try {
      output = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
      );
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err.name === 'NoSuchKey' || (err as { Code?: string }).Code === 'NoSuchKey')
      ) {
        throw new NotFoundException('GPX file not found in storage.');
      }
      this.logger.error(`S3 GPX stream failed for key "${storageKey}": ${String(err)}`);
      throw new InternalServerErrorException('Failed to retrieve the GPX file.');
    }

    if (!output.Body) {
      throw new InternalServerErrorException('GPX file body is empty.');
    }

    return {
      stream: output.Body as Readable,
      contentLength: output.ContentLength,
    };
  }

  async deleteGpxFile(storageKey: string): Promise<void> {
    let response;
    try {
      response = await this.s3.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: [{ Key: storageKey }],
            Quiet: false,
          },
        }),
      );
    } catch (err) {
      this.logger.error(
        'GPX S3 delete SDK error',
        { storageKey, error: String(err) },
      );
      throw new BadGatewayException(
        'Failed to delete the GPX file from storage. The record has been preserved.',
      );
    }

    if (response.Errors && response.Errors.length > 0) {
      for (const e of response.Errors) {
        this.logger.error(
          `S3 GPX delete error for key "${e.Key ?? '?'}": [${e.Code ?? '?'}] ${e.Message ?? '?'}`,
        );
      }
      throw new BadGatewayException(
        'Failed to delete the GPX file from storage. The record has been preserved.',
      );
    }
  }
}
