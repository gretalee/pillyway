import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AccommodationResponseDto } from './dto/accommodation-response.dto';
import { CreateAccommodationDto } from './dto/create-accommodation.dto';
import { CreateSightDto } from './dto/create-sight.dto';
import { SightResponseDto } from './dto/sight-response.dto';
import { WaypointDetailDto } from './dto/waypoint-detail.dto';

@Injectable()
export class WaypointsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── findBySlug ───────────────────────────────────────────────────────────────

  /**
   * Returns the full detail for a waypoint (CaminoPoint) identified by its slug,
   * including all accommodations and sights associated with it.
   *
   * @throws NotFoundException when no CaminoPoint with the given slug exists.
   */
  async findBySlug(slug: string): Promise<WaypointDetailDto> {
    const point = await this.prisma.caminoPoint.findUnique({
      where: { slug },
      include: { accommodations: true, sights: true },
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
      accommodations: point.accommodations.map((a) => ({
        id: a.id,
        caminoPointId: a.caminoPointId,
        name: a.name,
        description: a.description,
        imageUrls: a.imageUrls,
        verified: a.verified,
        createdBy: a.createdBy,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
      sights: point.sights.map((s) => ({
        id: s.id,
        caminoPointId: s.caminoPointId,
        name: s.name,
        description: s.description,
        imageUrls: s.imageUrls,
        verified: s.verified,
        createdBy: s.createdBy,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
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
        createdBy: userId,
      },
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
        createdBy: userId,
      },
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
