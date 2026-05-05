import {
  Injectable,
  InternalServerErrorException,
  Logger,
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
}
