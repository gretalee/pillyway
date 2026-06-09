import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AccommodationType, PriceRange } from '@prisma/client';

import { KindeRole } from '../auth/kinde-jwt.strategy';
import { DeleteAuthorizationService } from '../common/delete-authorization.service';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../event-log/event-type.enum';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { AccommodationDetailDto } from './dto/accommodation-detail.dto';
import { UpdateAccommodationDto } from './dto/update-accommodation.dto';

/** Creators may delete their own accommodations within this period after creation. */
const ACCOMMODATION_DELETE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class AccommodationsService {
  private readonly logger = new Logger(AccommodationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
    private readonly deleteAuthorizationService: DeleteAuthorizationService,
    private readonly eventLog: EventLogService,
  ) {}

  // ── findById ─────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<AccommodationDetailDto> {
    const accommodation = await this.prisma.accommodation.findUnique({
      where: { id },
      include: { caminoPoint: { select: { slug: true } } },
    });

    if (!accommodation) {
      throw new NotFoundException('Accommodation not found.');
    }

    return this.toDto(accommodation);
  }

  // ── findByCaminoPointId ───────────────────────────────────────────────────────

  async findByCaminoPointId(
    caminoPointId: string,
  ): Promise<AccommodationDetailDto[]> {
    const accommodations = await this.prisma.accommodation.findMany({
      where: { caminoPointId },
      include: { caminoPoint: { select: { slug: true } } },
    });

    return accommodations.map((a) => this.toDto(a));
  }

  // ── update ────────────────────────────────────────────────────────────────────

  async update(
    id: string,
    userId: string,
    dto: UpdateAccommodationDto,
    roles: KindeRole[],
  ): Promise<AccommodationDetailDto> {
    if (!roles.some((r) => r.key === 'pilgrim')) {
      throw new ForbiddenException('Requires pilgrim role.');
    }

    dto.assertValid();

    const existing = await this.prisma.accommodation.findUnique({
      where: { id },
      include: { caminoPoint: { select: { slug: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Accommodation not found.');
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

    const updated = await this.prisma.accommodation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(resolvedImageUrls !== undefined && {
          imageUrls: resolvedImageUrls,
        }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.addressStreet !== undefined && {
          addressStreet: dto.addressStreet,
        }),
        ...(dto.addressZip !== undefined && { addressZip: dto.addressZip }),
        ...(dto.addressCity !== undefined && { addressCity: dto.addressCity }),
        ...(dto.addressCountry !== undefined && {
          addressCountry: dto.addressCountry,
        }),
        ...(dto.priceRange !== undefined && { priceRange: dto.priceRange }),
        updatedAt: new Date(),
      },
    });

    this.eventLog.logEvent(EventType.ACCOMMODATION_UPDATED, userId, {
      accommodation_id: id,
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
          `Storage cleanup failed after accommodation update: ${String(err)}`,
        );
      }
    }

    return this.toDto({ ...updated, caminoPoint: existing.caminoPoint });
  }

  // ── delete ────────────────────────────────────────────────────────────────────

  /**
   * Deletes an accommodation. Authorization rules:
   *   - `owner` role: always permitted.
   *   - Creator: permitted within 1 hour of creation.
   *   - All others: ForbiddenException (403).
   */
  async delete(id: string, userId: string, roles: KindeRole[]): Promise<void> {
    // Fetch first so we return 404 before 403
    const existing = await this.prisma.accommodation.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Accommodation not found.');
    }

    this.deleteAuthorizationService.assertCanDelete(
      userId,
      roles,
      existing,
      ACCOMMODATION_DELETE_WINDOW_MS,
    );

    await this.prisma.accommodation.delete({ where: { id } });

    if (existing.imageUrls.length > 0) {
      try {
        await this.uploadsService.deleteImages(existing.imageUrls);
      } catch (err) {
        // Storage cleanup is best-effort — DB write already succeeded
        this.logger.error(
          `Storage cleanup failed after accommodation delete: ${String(err)}`,
        );
      }
    }
  }

  // ── private helpers ───────────────────────────────────────────────────────────

  private toDto(accommodation: {
    id: string;
    caminoPointId: string;
    name: string;
    description: string | null;
    imageUrls: string[];
    verified: boolean;
    type: AccommodationType;
    email: string | null;
    website: string | null;
    addressStreet: string | null;
    addressZip: string | null;
    addressCity: string | null;
    addressCountry: string | null;
    priceRange: PriceRange | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    caminoPoint: { slug: string };
  }): AccommodationDetailDto {
    const dto = new AccommodationDetailDto();
    dto.id = accommodation.id;
    dto.caminoPointId = accommodation.caminoPointId;
    dto.waypointSlug = accommodation.caminoPoint.slug;
    dto.name = accommodation.name;
    dto.description = accommodation.description;
    dto.imageUrls = accommodation.imageUrls;
    dto.verified = accommodation.verified;
    dto.type = accommodation.type;
    dto.email = accommodation.email;
    dto.website = accommodation.website;
    dto.addressStreet = accommodation.addressStreet;
    dto.addressZip = accommodation.addressZip;
    dto.addressCity = accommodation.addressCity;
    dto.addressCountry = accommodation.addressCountry;
    dto.priceRange = accommodation.priceRange;
    dto.createdBy = accommodation.createdBy;
    dto.createdAt = accommodation.createdAt;
    dto.updatedAt = accommodation.updatedAt;
    return dto;
  }
}
