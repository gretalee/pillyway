import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { KindeRole } from '../auth/kinde-jwt.strategy';
import { DeleteAuthorizationService } from '../common/delete-authorization.service';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../event-log/event-type.enum';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { SightDetailDto } from './dto/sight-detail.dto';
import { UpdateSightDto } from './dto/update-sight.dto';

/** Creators may delete their own sights within this period after creation. */
const SIGHT_DELETE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class SightsService {
  private readonly logger = new Logger(SightsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
    private readonly deleteAuthorizationService: DeleteAuthorizationService,
    private readonly eventLog: EventLogService,
  ) {}

  // ── findById ─────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<SightDetailDto> {
    const sight = await this.prisma.sight.findUnique({ where: { id } });

    if (!sight) {
      throw new NotFoundException('Sight not found.');
    }

    return this.toDto(sight);
  }

  // ── findByCaminoPointId ───────────────────────────────────────────────────────

  async findByCaminoPointId(caminoPointId: string): Promise<SightDetailDto[]> {
    const sights = await this.prisma.sight.findMany({
      where: { caminoPointId },
    });
    return sights.map((s) => this.toDto(s));
  }

  // ── update ────────────────────────────────────────────────────────────────────

  async update(
    id: string,
    userId: string,
    dto: UpdateSightDto,
    roles: KindeRole[],
  ): Promise<SightDetailDto> {
    if (!roles.some((r) => r.key === 'pilgrim')) {
      throw new ForbiddenException('Requires pilgrim role.');
    }

    dto.assertValid();

    const existing = await this.prisma.sight.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Sight not found.');
    }

    // Compute new imageUrls and which URLs were dropped (for storage cleanup)
    let resolvedImageUrls: string[] | undefined;
    let urlsToDelete: string[] = [];

    if (dto.removeImageUrls !== undefined) {
      const toRemove = new Set(dto.removeImageUrls);
      urlsToDelete = existing.imageUrls.filter((url) => toRemove.has(url));
      resolvedImageUrls = existing.imageUrls.filter(
        (url) => !toRemove.has(url),
      );
    } else if (dto.imageUrls !== undefined) {
      resolvedImageUrls = dto.imageUrls;
      const kept = new Set(dto.imageUrls);
      urlsToDelete = existing.imageUrls.filter((url) => !kept.has(url));
    }

    const updated = await this.prisma.sight.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(resolvedImageUrls !== undefined && {
          imageUrls: resolvedImageUrls,
        }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        updatedAt: new Date(),
      },
    });

    this.eventLog.logEvent(EventType.SIGHT_UPDATED, userId, {
      sight_id: id,
      camino_point_id: existing.caminoPointId,
      changed_fields: Object.entries(dto)
        .filter(([k, v]) => v !== undefined && k !== 'removeImageUrls')
        .map(([k]) => k),
    });

    if (urlsToDelete.length > 0) {
      try {
        await this.uploadsService.deleteImages(urlsToDelete);
      } catch (err) {
        // Storage cleanup is best-effort — DB write already succeeded
        this.logger.error(
          `Storage cleanup failed after sight update: ${String(err)}`,
        );
      }
    }

    return this.toDto(updated);
  }

  // ── delete ────────────────────────────────────────────────────────────────────

  /**
   * Deletes a sight. Authorization rules:
   *   - `owner` role: always permitted.
   *   - Creator: permitted within 1 hour of creation.
   *   - All others: ForbiddenException (403).
   */
  async delete(id: string, userId: string, roles: KindeRole[]): Promise<void> {
    // Fetch first so we return 404 before 403
    const existing = await this.prisma.sight.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Sight not found.');
    }

    this.deleteAuthorizationService.assertCanDelete(
      userId,
      roles,
      existing,
      SIGHT_DELETE_WINDOW_MS,
    );

    await this.prisma.sight.delete({ where: { id } });

    if (existing.imageUrls.length > 0) {
      try {
        await this.uploadsService.deleteImages(existing.imageUrls);
      } catch (err) {
        // Storage cleanup is best-effort — DB write already succeeded
        this.logger.error(
          `Storage cleanup failed after sight delete: ${String(err)}`,
        );
      }
    }
  }

  // ── private helpers ───────────────────────────────────────────────────────────

  private toDto(sight: {
    id: string;
    caminoPointId: string;
    name: string;
    description: string | null;
    imageUrls: string[];
    verified: boolean;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }): SightDetailDto {
    const dto = new SightDetailDto();
    dto.id = sight.id;
    dto.caminoPointId = sight.caminoPointId;
    dto.name = sight.name;
    dto.description = sight.description;
    dto.imageUrls = sight.imageUrls;
    dto.verified = sight.verified;
    dto.address = sight.address;
    dto.latitude = sight.latitude;
    dto.longitude = sight.longitude;
    dto.createdBy = sight.createdBy;
    dto.createdAt = sight.createdAt;
    dto.updatedAt = sight.updatedAt;
    return dto;
  }
}
