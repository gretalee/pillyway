import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';

export interface CaminoPointSearchResult {
  id: string;
  name: string;
  country: string;
  description: string | null;
}

@Injectable()
export class CaminoPointsService {
  private readonly logger = new Logger(CaminoPointsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * ILIKE search on name, optional exact-match filter on country.
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

    // Filters must be applied before .limit() and .order() because
    // PostgrestFilterBuilder (returned by .select()) carries filter methods,
    // whereas PostgrestTransformBuilder (returned by .limit()/.order()) does not.
    let query = this.supabase.client
      .from('camino_points')
      .select('id, name, country, description');

    if (name) {
      // Supabase JS SDK uses parameterized bindings internally; user input is
      // never interpolated directly into the SQL string.
      query = query.ilike('name', `%${name}%`);
    }

    if (country) {
      query = query.eq('country', country);
    }

    const { data, error } = await query.limit(5).order('name');

    if (error) {
      this.logger.error('camino_points search failed', error);
      throw new InternalServerErrorException('Failed to search camino points.');
    }

    return (data ?? []) as CaminoPointSearchResult[];
  }
}
