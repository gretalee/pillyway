import {
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
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  CaminoPictureResponseDto,
  CaminoPicturesResponseDto,
} from './dto/camino-picture-response.dto';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_PICTURES = 50;

@Injectable()
export class CaminoPicturesService {
  private readonly logger = new Logger(CaminoPicturesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
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
      select: { id: true },
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

    // 3. If uploading as primary, ensure no primary exists yet
    if (isPrimary) {
      const existingPrimary = await this.prisma.caminoPicture.findFirst({
        where: { caminoId, isPrimary: true },
        select: { id: true },
      });
      if (existingPrimary) {
        throw new ConflictException(
          'A primary picture already exists for this camino.',
        );
      }
    }

    // 4. Generate picture ID before transaction and S3 upload so DB record and key are consistent
    const pictureId = randomUUID();
    const ext = EXT_MAP[detected.mime];
    const key = `camino-pictures/${caminoId}/${pictureId}.${ext}`;

    // 5. Wrap the 50-picture count check and the DB insert in a transaction to prevent races
    //    The S3 upload happens outside the transaction; on S3 failure we skip the DB insert.
    let url: string;

    // Perform the 50-picture count check and compute maxPosition inside a transaction.
    // We do this before the S3 upload so we fail fast before incurring S3 cost.
    const { maxPosition } = await this.prisma.$transaction(async (tx) => {
      const count = await tx.caminoPicture.count({ where: { caminoId } });
      if (count >= MAX_PICTURES) {
        throw new UnprocessableEntityException(
          'This camino has reached the maximum of 50 pictures.',
        );
      }

      if (!isPrimary) {
        const maxPositionRecord = await tx.caminoPicture.aggregate({
          where: { caminoId, isPrimary: false },
          _max: { position: true },
        });
        return { maxPosition: maxPositionRecord._max.position ?? 0 };
      }

      return { maxPosition: 0 };
    });

    // 6. Upload to S3 — key uses only server-generated values; no user filename
    try {
      url = await this.uploadsService.uploadImage(key, file);
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

    const updated = await this.prisma.caminoPicture.update({
      where: { id: pictureId },
      data: { label: label ?? null },
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
