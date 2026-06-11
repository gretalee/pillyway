import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { randomUUID } from 'crypto';

import { KindeRole } from '../auth/kinde-jwt.strategy';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../event-log/event-type.enum';
import { PrismaService } from '../prisma/prisma.service';
import { ImageProcessingService } from '../uploads/image-processing.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  CaminoPictureResponseDto,
  CaminoPicturesResponseDto,
} from './dto/camino-picture-response.dto';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const MAX_PICTURES = 50;

@Injectable()
export class CaminoPicturesService {
  private readonly logger = new Logger(CaminoPicturesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
    private readonly imageProcessing: ImageProcessingService,
    private readonly eventLog: EventLogService,
  ) {}

  // ── getPictures ─────────────────────────────────────────────────────────────

  async getPictures(caminoId: string): Promise<CaminoPicturesResponseDto> {
    const camino = await this.prisma.camino.findUnique({
      where: { id: caminoId },
      select: { id: true },
    });
    if (!camino) {
      throw new NotFoundException('Camino not found.');
    }

    const pictures = await this.prisma.caminoPicture.findMany({
      where: { caminoId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });

    const primaryRecord = pictures.find((p) => p.isPrimary) ?? null;
    const galleryRecords = pictures.filter((p) => !p.isPrimary);

    const response = new CaminoPicturesResponseDto();
    response.primary = primaryRecord
      ? plainToInstance(CaminoPictureResponseDto, primaryRecord, {
          excludeExtraneousValues: true,
        })
      : null;
    response.gallery = galleryRecords.map((p) =>
      plainToInstance(CaminoPictureResponseDto, p, {
        excludeExtraneousValues: true,
      }),
    );

    return response;
  }

  // ── uploadPicture ───────────────────────────────────────────────────────────

  async uploadPicture(
    caminoId: string,
    file: Express.Multer.File,
    isPrimary: boolean,
    userId: string,
  ): Promise<CaminoPictureResponseDto> {
    // 1. Verify camino exists
    const camino = await this.prisma.camino.findUnique({
      where: { id: caminoId },
      select: { id: true, name: true },
    });
    if (!camino) {
      throw new NotFoundException('Camino not found.');
    }

    // 2. Magic-byte check using file-type (dynamic import — file-type is ESM-only)
    const { fileTypeFromBuffer } = await import('file-type');
    const detected = await fileTypeFromBuffer(file.buffer);
    if (
      !detected ||
      !ALLOWED_MIME.has(detected.mime) ||
      detected.mime !== file.mimetype
    ) {
      throw new UnsupportedMediaTypeException(
        'File type not supported. Accepted types: image/jpeg, image/png, image/webp',
      );
    }

    // 3. Fail fast: check the 50-picture limit and compute maxPosition before any CPU-heavy work.
    const { maxPosition } = await this.prisma.$transaction(async (tx) => {
      const count = await tx.caminoPicture.count({ where: { caminoId } });
      if (count >= MAX_PICTURES) {
        throw new UnprocessableEntityException(
          'This camino has reached the maximum of 50 pictures.',
        );
      }

      // If uploading as primary, ensure no primary exists yet
      if (isPrimary) {
        const existingPrimary = await tx.caminoPicture.findFirst({
          where: { caminoId, isPrimary: true },
          select: { id: true },
        });
        if (existingPrimary) {
          throw new ConflictException(
            'A primary picture already exists for this camino.',
          );
        }
        return { maxPosition: 0 };
      }

      const maxPositionRecord = await tx.caminoPicture.aggregate({
        where: { caminoId, isPrimary: false },
        _max: { position: true },
      });
      return { maxPosition: maxPositionRecord._max.position ?? 0 };
    });

    // 4. Compress and re-encode to WebP. Errors from sharp (corrupt file, decompression
    //    bomb, unsupported format variant) are caught and surfaced as 422 rather than 500.
    let processedBuffer: Buffer;
    try {
      processedBuffer = await this.imageProcessing.processForUpload(file.buffer);
    } catch (err) {
      this.logger.warn(
        `Image processing failed for caminoId=${caminoId}: ${String(err)}`,
      );
      throw new BadRequestException(
        'The image could not be processed. Please ensure it is a valid, non-corrupted image file.',
      );
    }

    // 5. Generate picture ID before S3 upload so DB record and key are consistent
    const pictureId = randomUUID();
    const key = `camino-pictures/${caminoId}/${pictureId}.webp`;

    let url: string;

    // 6. Upload to S3 — key uses only server-generated values; no user filename
    try {
      url = await this.uploadsService.uploadImage(key, processedBuffer, 'image/webp');
    } catch (err) {
      this.logger.error(
        `S3 upload failed for camino picture caminoId=${caminoId} pictureId=${pictureId}: ${String(err)}`,
      );
      throw err;
    }

    // 7. Insert DB record — only reached on S3 success
    //    If the primary constraint is violated concurrently, Prisma throws P2002.
    //    We catch that and clean up the orphaned S3 object (best-effort).
    let record: Awaited<ReturnType<typeof this.prisma.caminoPicture.create>>;

    try {
      record = await this.prisma.$transaction(async (tx) => {
        // Re-check count inside the insert transaction to prevent races between
        // the pre-check transaction and this one.
        const count = await tx.caminoPicture.count({ where: { caminoId } });
        if (count >= MAX_PICTURES) {
          throw new UnprocessableEntityException(
            'This camino has reached the maximum of 50 pictures.',
          );
        }

        return tx.caminoPicture.create({
          data: {
            id: pictureId,
            caminoId,
            uploadedBy: userId,
            url,
            isPrimary,
            position: isPrimary ? null : maxPosition + 1,
          },
        });
      });
    } catch (err) {
      // S3 object already uploaded — clean up orphan (best-effort)
      this.uploadsService.deleteImages([url]).catch((cleanupErr) => {
        this.logger.error(
          `Failed to clean up orphaned S3 object after DB insert failure. key="${key}" err=${String(cleanupErr)}`,
        );
      });

      // Concurrent primary upload: partial unique index violation → 409 instead of 500
      if (
        isPrimary &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'A primary picture already exists for this camino.',
        );
      }

      throw err;
    }

    this.eventLog.logEvent(EventType.CAMINO_IMAGE_UPLOADED, userId, {
      camino_id: caminoId,
      camino_name: camino.name,
      picture_id: pictureId,
      picture_name: file.originalname,
      is_primary: isPrimary,
    });

    return plainToInstance(CaminoPictureResponseDto, record, {
      excludeExtraneousValues: true,
    });
  }

  // ── updateLabel ─────────────────────────────────────────────────────────────

  async updateLabel(
    caminoId: string,
    pictureId: string,
    label: string | null | undefined,
    userId: string,
    userRoles: KindeRole[],
  ): Promise<CaminoPictureResponseDto> {
    const picture = await this.prisma.caminoPicture.findFirst({
      where: { id: pictureId, caminoId },
    });
    if (!picture) {
      throw new NotFoundException('Picture not found.');
    }

    const isUploader = picture.uploadedBy === userId;
    const isOwner = userRoles.some((r) => r.key === 'owner');
    if (!isUploader && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to edit this picture.',
      );
    }

    // If label is omitted, treat this as a no-op (clients must send null to clear).
    if (label === undefined) {
      return plainToInstance(CaminoPictureResponseDto, picture, {
        excludeExtraneousValues: true,
      });
    }

    const updated = await this.prisma.caminoPicture.update({
      where: { id: pictureId },
      data: { label },
    });

    return plainToInstance(CaminoPictureResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  // ── deletePicture ───────────────────────────────────────────────────────────

  async deletePicture(
    caminoId: string,
    pictureId: string,
    userId: string,
    userRoles: KindeRole[],
  ): Promise<void> {
    // 1. IDOR prevention: look up using both pictureId AND caminoId
    const picture = await this.prisma.caminoPicture.findFirst({
      where: { id: pictureId, caminoId },
    });
    if (!picture) {
      throw new NotFoundException('Picture not found.');
    }

    // 2. Authorization: uploader or owner
    const isUploader = picture.uploadedBy === userId;
    const isOwner = userRoles.some((r) => r.key === 'owner');
    if (!isUploader && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to delete this picture.',
      );
    }

    // 3. Delete from S3 first — throws BadGatewayException on failure,
    //    which prevents the DB record from being deleted
    await this.uploadsService.deleteImageStrict(picture.url);

    // 4. Only on S3 success: delete the DB record
    await this.prisma.caminoPicture.delete({ where: { id: pictureId } });

    this.logger.debug(
      `Picture ${pictureId} deleted by userId=${userId} (isOwner=${isOwner})`,
    );
  }
}
