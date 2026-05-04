import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
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

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CaminoSummary[]> {
    try {
      return await this.prisma.camino.findMany({
        select: { id: true, name: true, description: true, verified: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      this.logger.error('Failed to fetch caminos', err);
      throw new InternalServerErrorException('Failed to fetch caminos.');
    }
  }

  async create(dto: CreateCaminoDto, userId: string): Promise<CaminoDetail> {
    this.logger.debug('Creating camino');

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Case-insensitive name uniqueness check
        const existing = await tx.camino.findFirst({
          where: { name: { equals: dto.name, mode: 'insensitive' } },
        });
        if (existing) {
          throw new ConflictException(
            'A camino with this name already exists.',
          );
        }

        // 2. Detect duplicate new-point definitions in the request (same lowercase name+country)
        const newPointDefs = dto.caminoPoints.filter((p) => !p.caminoPointId);
        const seen = new Set<string>();
        for (const point of newPointDefs) {
          const key = `${point.name!.toLowerCase()}|${point.country!.toLowerCase()}`;
          if (seen.has(key)) {
            throw new BadRequestException(
              'The request contains duplicate camino point definitions (same name and country).',
            );
          }
          seen.add(key);
        }

        // 3. Create the camino record
        const camino = await tx.camino.create({
          data: {
            name: dto.name,
            description: dto.description ?? null,
            createdBy: userId,
          },
        });

        // 4. Resolve each point and create its order record
        const caminoPoints: CaminoPointInResponse[] = [];

        for (let i = 0; i < dto.caminoPoints.length; i++) {
          const item = dto.caminoPoints[i];
          let pointId: string;
          let pointName: string;
          let pointCountry: string;

          if (item.caminoPointId) {
            // Existing point — verify it exists
            const found = await tx.caminoPoint.findUnique({
              where: { id: item.caminoPointId },
            });
            if (!found) {
              throw new BadRequestException(
                `CaminoPoint not found: ${item.caminoPointId}`,
              );
            }
            pointId = found.id;
            pointName = found.name;
            pointCountry = found.country;
          } else {
            // New point — upsert by name+country composite unique key
            const upserted = await tx.caminoPoint.upsert({
              where: {
                name_country: {
                  name: item.name!,
                  country: item.country!,
                },
              },
              create: {
                name: item.name!,
                country: item.country!,
                description: item.description ?? null,
              },
              update: {},
            });
            pointId = upserted.id;
            pointName = upserted.name;
            pointCountry = upserted.country;
          }

          const position = i + 1;
          await tx.caminoPointOrder.create({
            data: {
              caminoId: camino.id,
              caminoPointId: pointId,
              position,
            },
          });

          caminoPoints.push({
            id: pointId,
            name: pointName,
            country: pointCountry,
            position,
          });
        }

        this.logger.debug(
          'Camino created successfully with ID: ' + camino.id,
        );

        return {
          id: camino.id,
          name: camino.name,
          description: camino.description,
          verified: camino.verified,
          caminoPoints,
        };
      });
    } catch (err) {
      // Re-throw NestJS HTTP exceptions as-is (ConflictException, BadRequestException, etc.)
      if (err instanceof HttpException) {
        throw err;
      }

      // Prisma unique-constraint violation — only map to camino-name conflict
      // when the violated constraint is specifically the camino name index.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const target = Array.isArray(err.meta?.target)
          ? (err.meta.target as string[])
          : [];
        if (target.includes('name')) {
          throw new ConflictException(
            'A camino with this name already exists.',
          );
        }
        // Another unique constraint was violated — rethrow for the generic handler below.
      }

      this.logger.error('Failed to create camino', err);
      throw new InternalServerErrorException(
        'Failed to create camino. Please try again.',
      );
    }
  }
}
