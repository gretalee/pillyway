import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { KindeRole } from '../auth/kinde-jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { SightDetailDto } from './dto/sight-detail.dto';
import { UpdateSightDto } from './dto/update-sight.dto';

@Injectable()
export class SightsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const sights = await this.prisma.sight.findMany({ where: { caminoPointId } });
    return sights.map((s) => this.toDto(s));
  }

  // ── update ────────────────────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateSightDto,
    roles: KindeRole[],
  ): Promise<SightDetailDto> {
    if (!roles.some((r) => r.key === 'pilgrim')) {
      throw new ForbiddenException('Requires pilgrim role.');
    }

    const fields = Object.keys(dto).filter((k) => (dto as unknown as Record<string, unknown>)[k] !== undefined);
    if (fields.length === 0) {
      throw new BadRequestException('Request body must not be empty');
    }
    if (dto.imageUrls !== undefined && dto.removeImageUrls !== undefined) {
      throw new BadRequestException('imageUrls and removeImageUrls are mutually exclusive');
    }
    const latSet = dto.latitude !== undefined && dto.latitude !== null;
    const lonSet = dto.longitude !== undefined && dto.longitude !== null;
    if (latSet !== lonSet) {
      throw new BadRequestException('Both latitude and longitude must be provided together or both omitted');
    }

    const existing = await this.prisma.sight.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Sight not found.');
    }

    // Compute new imageUrls when removeImageUrls is provided
    let resolvedImageUrls: string[] | undefined;
    if (dto.removeImageUrls !== undefined) {
      const toRemove = new Set(dto.removeImageUrls);
      resolvedImageUrls = existing.imageUrls.filter((url) => !toRemove.has(url));
    } else if (dto.imageUrls !== undefined) {
      resolvedImageUrls = dto.imageUrls;
    }

    const updated = await this.prisma.sight.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(resolvedImageUrls !== undefined && { imageUrls: resolvedImageUrls }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        updatedAt: new Date(),
      },
    });

    return this.toDto(updated);
  }

  // ── delete ────────────────────────────────────────────────────────────────────

  async delete(id: string, roles: KindeRole[]): Promise<void> {
    if (!roles.some((r) => r.key === 'pilgrim')) {
      throw new ForbiddenException('Requires pilgrim role.');
    }

    const existing = await this.prisma.sight.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Sight not found.');
    }

    await this.prisma.sight.delete({ where: { id } });
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
