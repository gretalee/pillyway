import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export interface CaminoPointSearchResult {
  id: string;
  name: string;
  country: string;
  description: string | null;
}

@Injectable()
export class CaminoPointsService {
  private readonly logger = new Logger(CaminoPointsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Case-insensitive LIKE search on name, optional exact-match filter on country.
   * Returns [] immediately when both params are absent to avoid a full-table scan.
   * Limit is enforced at the DB query level (max 5), not via post-fetch slice.
   */
  async search(
    name: string | undefined,
    country: string | undefined,
  ): Promise<CaminoPointSearchResult[]> {
    // Short-circuit: at least one param must be present
    if (!name && !country) {
      return [];
    }

    try {
      return await this.prisma.caminoPoint.findMany({
        where: {
          ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
          ...(country ? { country } : {}),
        },
        select: { id: true, name: true, country: true, description: true },
        take: 5,
        orderBy: { name: 'asc' },
      });
    } catch (err) {
      this.logger.error('camino_points search failed', err);
      throw new InternalServerErrorException('Failed to search camino points.');
    }
  }

  /**
   * Deletes a camino point, but only if it is not currently used by any
   * camino (zero camino_point_order rows) — camino deletion intentionally
   * leaves camino_points untouched (a waypoint can be shared by other
   * caminos), so this is the only path that can ever remove one, and it
   * must never remove a point another camino still relies on.
   */
  async deleteIfUnused(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const point = await tx.caminoPoint.findUnique({ where: { id } });
      if (!point) {
        throw new NotFoundException('Camino point not found.');
      }

      const usageCount = await tx.caminoPointOrder.count({
        where: { caminoPointId: id },
      });
      if (usageCount > 0) {
        throw new ConflictException(
          'This camino point is still used by one or more caminos and cannot be deleted.',
        );
      }

      // Stage has no cascade from CaminoPoint (Prisma default: Restrict) and
      // is never deleted when a camino is — so any Stage still touching this
      // now-confirmed-unused point is orphaned garbage too, safe to remove
      // before the point itself.
      await tx.stage.deleteMany({
        where: { OR: [{ startPointId: id }, { endPointId: id }] },
      });

      // Cascades accommodations, sights, and any (already-zero) point-order rows.
      await tx.caminoPoint.delete({ where: { id } });
    });
  }
}
