import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';
import { CreateCaminoDto } from './dto/create-camino.dto';

export interface CaminoSummary {
  id: string;
  name: string;
  description: string | null;
  verified: boolean;
}

export interface CaminoPointInResponse {
  id: string;
  name: string;
  country: string;
  position: number;
}

export interface CaminoDetail {
  id: string;
  name: string;
  description: string | null;
  verified: boolean;
  caminoPoints: CaminoPointInResponse[];
}

@Injectable()
export class CaminosService {
  private readonly logger = new Logger(CaminosService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async findAll(): Promise<CaminoSummary[]> {
    const { data, error } = await this.supabase.client
      .from('caminos')
      .select('id, name, description, verified')
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch caminos', error);
      throw new InternalServerErrorException('Failed to fetch caminos.');
    }

    return data ?? [];
  }

  async create(dto: CreateCaminoDto, userId: string): Promise<CaminoDetail> {
    this.logger.debug('Creating camino');
    const response = await this.supabase.client.rpc('create_camino', {
      p_name: dto.name,
      p_description: dto.description ?? null,
      p_created_by: userId,
      p_points: dto.caminoPoints,
    });

    const { data, error } = response as {
      data: CaminoDetail | null;
      error: Error | null;
    };

    if (error) {
      const msg: string = error.message ?? '';

      if (msg.includes('CAMINO_NAME_EXISTS')) {
        throw new ConflictException('A camino with this name already exists.');
      }

      if (msg.includes('CAMINO_POINT_NOT_FOUND')) {
        const uuidMatch = msg.match(/CAMINO_POINT_NOT_FOUND:([0-9a-f-]{36})/i);
        const pointId = uuidMatch ? uuidMatch[1] : 'unknown';
        throw new BadRequestException(`CaminoPoint not found: ${pointId}`);
      }

      if (msg.includes('DUPLICATE_POINT_IN_REQUEST')) {
        throw new BadRequestException(
          'The request contains duplicate camino point definitions (same name and country).',
        );
      }

      this.logger.error('create_camino RPC failed', error);
      throw new InternalServerErrorException(
        'Failed to create camino. Please try again.',
      );
    }

    this.logger.debug('Camino created successfully with ID: ' + data?.id);

    return data as CaminoDetail;
  }
}
