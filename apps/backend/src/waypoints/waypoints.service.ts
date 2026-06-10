import { Injectable, NotFoundException } from '@nestjs/common';

import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../event-log/event-type.enum';
import { PrismaService } from '../prisma/prisma.service';
import { AccommodationResponseDto } from './dto/accommodation-response.dto';
import { CreateAccommodationDto } from './dto/create-accommodation.dto';
import { CreateSightDto } from './dto/create-sight.dto';
import { SightResponseDto } from './dto/sight-response.dto';
import { WaypointDetailDto } from './dto/waypoint-detail.dto';

@Injectable()
export class WaypointsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventLog: EventLogService,
  ) {}

  // ── findBySlug ───────────────────────────────────────────────────────────────

  /**
   * Returns the detail for a waypoint (CaminoPoint) identified by its slug.
   * Accommodations and sights are now served by their own dedicated modules.
   *
   * @throws NotFoundException when no CaminoPoint with the given slug exists.
   */
  async findBySlug(slug: string): Promise<WaypointDetailDto> {
    const point = await this.prisma.caminoPoint.findUnique({
      where: { slug },
    });

    if (!point) {
      throw new NotFoundException('Waypoint not found.');
    }

    return {
      id: point.id,
      name: point.name,
      country: point.country,
      slug: point.slug,
      description: point.description,
    };
  }

  // ── createAccommodation ──────────────────────────────────────────────────────

  /**
   * Creates a new Accommodation for the waypoint identified by slug.
   *
   * @throws NotFoundException when no CaminoPoint with the given slug exists.
   */
  async createAccommodation(
    slug: string,
    dto: CreateAccommodationDto,
    userId: string,
  ): Promise<AccommodationResponseDto> {
    const point = await this.prisma.caminoPoint.findUnique({ where: { slug } });
    if (!point) {
      throw new NotFoundException('Waypoint not found.');
    }

    const created = await this.prisma.accommodation.create({
      data: {
        caminoPointId: point.id,
        name: dto.name,
        description: dto.description ?? null,
        imageUrls: dto.imageUrls ?? [],
        type: dto.type,
        email: dto.email ?? null,
        website: dto.website ?? null,
        addressStreet: dto.addressStreet ?? null,
        addressZip: dto.addressZip ?? null,
        addressCity: dto.addressCity ?? null,
        addressCountry: dto.addressCountry ?? null,
        priceRange: dto.priceRange ?? null,
        createdBy: userId,
      },
    });

    this.eventLog.logEvent(EventType.ACCOMMODATION_CREATED, userId, {
      accommodation_id: created.id,
      camino_point_id: point.id,
      waypoint_name: point.name,
      accommodation_name: created.name,
    });

    return {
      id: created.id,
      caminoPointId: created.caminoPointId,
      name: created.name,
      description: created.description,
      imageUrls: created.imageUrls,
      verified: created.verified,
      createdBy: created.createdBy,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  // ── createSight ──────────────────────────────────────────────────────────────

  /**
   * Creates a new Sight for the waypoint identified by slug.
   *
   * @throws NotFoundException when no CaminoPoint with the given slug exists.
   */
  async createSight(
    slug: string,
    dto: CreateSightDto,
    userId: string,
  ): Promise<SightResponseDto> {
    const point = await this.prisma.caminoPoint.findUnique({ where: { slug } });
    if (!point) {
      throw new NotFoundException('Waypoint not found.');
    }

    const created = await this.prisma.sight.create({
      data: {
        caminoPointId: point.id,
        name: dto.name,
        description: dto.description ?? null,
        imageUrls: dto.imageUrls ?? [],
        address: dto.address ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        createdBy: userId,
      },
    });

    this.eventLog.logEvent(EventType.SIGHT_CREATED, userId, {
      sight_id: created.id,
      camino_point_id: point.id,
      waypoint_name: point.name,
      sight_name: created.name,
    });

    return {
      id: created.id,
      caminoPointId: created.caminoPointId,
      name: created.name,
      description: created.description,
      imageUrls: created.imageUrls,
      verified: created.verified,
      createdBy: created.createdBy,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }
}
