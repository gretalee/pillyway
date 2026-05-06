import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { KindeRole } from '../auth/kinde-jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCaminoDto } from './dto/create-camino.dto';
import { UpdateCaminoDto } from './dto/update-camino.dto';

// ─── Response interfaces ──────────────────────────────────────────────────────

export interface CaminoSummary {
  id: string;
  name: string;
  description: string | null;
  verified: boolean;
  createdBy: string;
}

export interface CaminoPointInResponse {
  id: string;
  name: string;
  country: string;
  /** Present on CaminoDetail (create response) but not on CaminoDetailFull — keep for backwards compat. */
  position: number;
}

/**
 * Returned by CaminosService.create. Does not include createdAt / updatedAt
 * because those were not returned by the original create implementation.
 * Kept intentionally minimal to avoid a breaking change.
 */
export interface CaminoDetail {
  id: string;
  name: string;
  description: string | null;
  verified: boolean;
  caminoPoints: CaminoPointInResponse[];
}

/**
 * Full camino representation with timestamps and createdBy.
 * Returned by findById, update.
 */
export interface CaminoDetailFull {
  id: string;
  name: string;
  description: string | null;
  verified: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  caminoPoints: Array<{
    id: string;
    name: string;
    country: string;
    description: string | null;
    position: number;
  }>;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class CaminosService {
  private readonly logger = new Logger(CaminosService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── findAll ─────────────────────────────────────────────────────────────────

  async findAll(): Promise<CaminoSummary[]> {
    try {
      return await this.prisma.camino.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          verified: true,
          createdBy: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      this.logger.error('Failed to fetch caminos', err);
      throw new InternalServerErrorException('Failed to fetch caminos.');
    }
  }

  // ── findById ────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<CaminoDetailFull> {
    const camino = await this.prisma.camino.findUnique({
      where: { id },
      include: {
        caminoPointOrder: {
          orderBy: { position: 'asc' },
          include: { caminoPoint: true },
        },
      },
    });

    if (!camino) {
      throw new NotFoundException('Camino not found.');
    }

    return {
      id: camino.id,
      name: camino.name,
      description: camino.description,
      verified: camino.verified,
      createdBy: camino.createdBy,
      createdAt: camino.createdAt,
      updatedAt: camino.updatedAt,
      caminoPoints: camino.caminoPointOrder.map((order) => ({
        id: order.caminoPoint.id,
        name: order.caminoPoint.name,
        country: order.caminoPoint.country,
        description: order.caminoPoint.description,
        position: order.position,
      })),
    };
  }

  // ── create ──────────────────────────────────────────────────────────────────

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

        this.logger.debug('Camino created successfully with ID: ' + camino.id);

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
          ? err.meta.target
          : typeof err.meta?.target === 'string'
            ? [err.meta.target]
            : [];
        const modelName =
          typeof err.meta?.modelName === 'string'
            ? err.meta.modelName
            : undefined;
        const isCaminoNameConflict =
          target.length === 1 &&
          target[0] === 'name' &&
          (!modelName || modelName === 'Camino');
        if (isCaminoNameConflict) {
          throw new ConflictException(
            'A camino with this name already exists.',
          );
        }
        // Other P2002 (e.g. position or point name+country conflict) — fall through to InternalServerErrorException.
      }

      this.logger.error('Failed to create camino', err);
      throw new InternalServerErrorException(
        'Failed to create camino. Please try again.',
      );
    }
  }

  // ── update ──────────────────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateCaminoDto,
    userId: string,
    userRoles: KindeRole[],
  ): Promise<CaminoDetailFull> {
    this.logger.debug(`Updating camino ${id}`);

    // 1. Verify the camino exists and load it for the ownership check
    const camino = await this.prisma.camino.findUnique({ where: { id } });
    if (!camino) {
      throw new NotFoundException('Camino not found.');
    }

    // 2. Authorisation: pilgrim (any camino) OR owner of this camino
    const isPilgrim = userRoles.some((r) => r.key === 'pilgrim');
    const isOwner = camino.createdBy === userId;
    if (!isPilgrim && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to update this camino.',
      );
    }

    try {
      // 3–5. Run the name check, waypoint replacement, and scalar camino update in a
      //      single transaction so the operation is fully atomic. If any step fails,
      //      all changes are rolled back — including waypoint deletions.
      await this.prisma.$transaction(async (tx) => {
        // 3. Name-conflict check (only when name is being changed)
        if (dto.name !== undefined) {
          const conflict = await tx.camino.findFirst({
            where: {
              name: { equals: dto.name, mode: 'insensitive' },
              id: { not: id },
            },
          });
          if (conflict) {
            throw new ConflictException(
              'A camino with this name already exists.',
            );
          }
        }

        // 4. Waypoint replacement (only when caminoPoints is supplied)
        if (dto.caminoPoints !== undefined) {
          // 4a. Delete existing waypoint orders for this camino
          await tx.caminoPointOrder.deleteMany({ where: { caminoId: id } });

          // 4b. Detect duplicate references to the same existing caminoPointId
          const seenIds = new Set<string>();
          for (const item of dto.caminoPoints) {
            if (item.caminoPointId) {
              if (seenIds.has(item.caminoPointId)) {
                throw new BadRequestException(
                  'The request contains duplicate caminoPointId references.',
                );
              }
              seenIds.add(item.caminoPointId);
            }
          }

          // 4c. Detect duplicate new-point definitions in the payload
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

          // 4d. Re-insert using the same create-or-link logic as create()
          for (let i = 0; i < dto.caminoPoints.length; i++) {
            const item = dto.caminoPoints[i];
            let pointId: string;

            if (item.caminoPointId) {
              const found = await tx.caminoPoint.findUnique({
                where: { id: item.caminoPointId },
              });
              if (!found) {
                throw new BadRequestException(
                  `CaminoPoint not found: ${item.caminoPointId}`,
                );
              }
              pointId = found.id;
            } else {
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
            }

            await tx.caminoPointOrder.create({
              data: { caminoId: id, caminoPointId: pointId, position: i + 1 },
            });
          }
        }

        // 5. Update scalar fields on the camino row.
        //    updatedAt is set explicitly — the schema does not use @updatedAt.
        const updateData: Prisma.CaminoUpdateInput = { updatedAt: new Date() };
        if (dto.name !== undefined) {
          updateData.name = dto.name;
        }
        if (dto.description !== undefined) {
          updateData.description = dto.description;
        }
        await tx.camino.update({ where: { id }, data: updateData });
      });

      // 6. Return the fresh full representation
      return this.findById(id);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }

      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const target = Array.isArray(err.meta?.target)
          ? err.meta.target
          : typeof err.meta?.target === 'string'
            ? [err.meta.target]
            : [];
        const modelName =
          typeof err.meta?.modelName === 'string'
            ? err.meta.modelName
            : undefined;
        if (
          target.length === 1 &&
          target[0] === 'name' &&
          (!modelName || modelName === 'Camino')
        ) {
          throw new ConflictException(
            'A camino with this name already exists.',
          );
        }
      }

      this.logger.error(`Failed to update camino ${id}`, err);
      throw new InternalServerErrorException(
        'Failed to update camino. Please try again.',
      );
    }
  }

  // ── delete ──────────────────────────────────────────────────────────────────

  async delete(
    id: string,
    userId: string,
    userRoles: KindeRole[],
  ): Promise<void> {
    this.logger.debug(`Deleting camino ${id}`);

    // 1. Verify the camino exists and load it for the ownership check
    const camino = await this.prisma.camino.findUnique({ where: { id } });
    if (!camino) {
      throw new NotFoundException('Camino not found.');
    }

    // 2. Authorisation: pilgrim (any camino) OR owner of this camino
    const isPilgrim = userRoles.some((r) => r.key === 'pilgrim');
    const isOwner = camino.createdBy === userId;
    if (!isPilgrim && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to delete this camino.',
      );
    }

    // 3. Delete the camino; DB cascade removes camino_point_order rows.
    //    camino_points rows are intentionally left untouched.
    await this.prisma.camino.delete({ where: { id } });
    this.logger.debug(`Camino ${id} deleted successfully`);
  }
}
