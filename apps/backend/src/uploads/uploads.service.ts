import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadsService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Uploads one or more image files to Supabase Storage using the service-role key.
   * Each file is stored under `images/<uuid>-<sanitised-filename>` in the configured bucket.
   *
   * @param files - Array of multer file objects (in-memory buffer).
   * @returns     - An object containing the public URLs of all uploaded files.
   * @throws InternalServerErrorException when any individual upload fails.
   */
  async uploadImages(
    files: Express.Multer.File[],
  ): Promise<{ urls: string[] }> {
    const supabaseUrl = this.config.getOrThrow<string>('SUPABASE_URL');
    const serviceRoleKey = this.config.getOrThrow<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    const bucket = this.config.getOrThrow<string>('SUPABASE_STORAGE_BUCKET');

    const urls: string[] = [];

    for (const file of files) {
      const sanitisedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `${randomUUID()}-${sanitisedName}`;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/images/${filename}`;

      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': file.mimetype,
          'x-upsert': 'true',
        },
        body: file.buffer,
      });

      if (!res.ok) {
        throw new InternalServerErrorException(
          `Failed to upload file: ${file.originalname}`,
        );
      }

      urls.push(
        `${supabaseUrl}/storage/v1/object/public/${bucket}/images/${filename}`,
      );
    }

    return { urls };
  }
}
