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
import { DeleteAuthorizationService } from '../common/delete-authorization.service';
import { EventLogService } from '../event-log/event-log.service';
import { slugify } from '../common/slug.utils';
import { EventType } from '../event-log/event-type.enum';
import { PrismaService } from '../prisma/prisma.service';
import { StagesService } from '../stages/stages.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateCaminoDto } from './dto/create-camino.dto';
import { UpdateCaminoDto } from './dto/update-camino.dto';

// ─── Response interfaces ──────────────────────────────────────────────────────

export interface CaminoSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  verified: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface CaminoPointInResponse {
  id: string;
  name: string;
  country: string;
  slug: string;
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
  slug: string;
  name: string;
  description: string | null;
  verified: boolean;
  caminoPoints: CaminoPointInResponse[];
}

/**
 * Full camino representation with timestamps and createdBy.
 * Returned by findBySlugOrId, update.
 */
export interface CaminoDetailFull {
  id: string;
  slug: string;
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
    slug: string;
    description: string | null;
    position: number;
  }>;
}

// ─── Service ─────────────────────────────────────────────────────────────────

/** Creators may delete their own caminos within this period after creation. */
const CAMINO_DELETE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

@Injectable()
export class CaminosService {
  private readonly logger = new Logger(CaminosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stagesService: StagesService,
    private readonly deleteAuthorizationService: DeleteAuthorizationService,
    private readonly uploadsService: UploadsService,
    private readonly eventLog: EventLogService,
  ) {}

  // ── generateSlug (CaminoPoint) ──────────────────────────────────────────────

  /**
   * Generates a unique slug for a CaminoPoint.
   * Falls back to appending the country and then a numeric suffix on collision.
   * Slug is immutable once set — never call this on an existing point.
   */
  private async generateSlug(
    name: string,
    country: string,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const base = slugify(name);

    const exists = async (slug: string): Promise<boolean> =>
      !!(await tx.caminoPoint.findUnique({ where: { slug } }));

    let candidate = base;
    if (await exists(candidate)) {
      candidate = `${base}-${slugify(country)}`;
      let n = 2;
      while (await exists(candidate)) {
        candidate = `${base}-${slugify(country)}-${n++}`;
      }
    }
    return candidate;
  }

  // ── generateCaminoSlug ──────────────────────────────────────────────────────

  /**
   * Generates a unique slug for a Camino from its name.
   * Falls back to a numeric suffix on collision.
   * Slug is frozen at creation — never regenerate for an existing camino.
   */
  private async generateCaminoSlug(
    name: string,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const base = slugify(name);

    const exists = async (slug: string): Promise<boolean> =>
      !!(await tx.camino.findUnique({ where: { slug } }));

    let candidate = base;
    let n = 2;
    while (await exists(candidate)) {
      candidate = `${base}-${n++}`;
    }
    return candidate;
  }

  // ── findAll ─────────────────────────────────────────────────────────────────

  async findAll(): Promise<CaminoSummary[]> {
    try {
      return await this.prisma.camino.findMany({
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          verified: true,
          createdBy: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      this.logger.error('Failed to fetch caminos', err);
      throw new InternalServerErrorException('Failed to fetch caminos.');
    }
  }

  // ── findBySlugOrId ──────────────────────────────────────────────────────────

  /**
   * Look up a camino by its slug (preferred) or UUID (legacy fallback for old links).
   * Returns the full detail so the caller can detect when a UUID was used and
   * redirect the browser to the canonical slug URL.
   */
  async findBySlugOrId(slugOrId: string): Promise<CaminoDetailFull> {
    const include = {
      caminoPointOrder: {
        orderBy: { position: 'asc' as const },
        include: { caminoPoint: true },
      },
    };

    let camino = await this.prisma.camino.findUnique({
      where: { slug: slugOrId },
      include,
    });

    if (!camino) {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          slugOrId,
        );
      if (isUuid) {
        camino = await this.prisma.camino.findUnique({
          where: { id: slugOrId },
          include,
        });
      }
    }

    if (!camino) {
      throw new NotFoundException('Camino not found.');
    }

    return {
      id: camino.id,
      slug: camino.slug,
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
        slug: order.caminoPoint.slug,
        description: order.caminoPoint.description,
        position: order.position,
      })),
    };
  }

  // ── create ──────────────────────────────────────────────────────────────────

  async create(dto: CreateCaminoDto, userId: string): Promise<CaminoDetail> {
    this.logger.debug('Creating camino');

    try {
      const result = await this.prisma.$transaction(async (tx) => {
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
        const slug = await this.generateCaminoSlug(dto.name, tx);
        const camino = await tx.camino.create({
          data: {
            name: dto.name,
            slug,
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

          let pointSlug: string;

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
            pointSlug = found.slug;
          } else {
            // New point — upsert by name+country composite unique key
            const slug = await this.generateSlug(item.name!, item.country!, tx);
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
                slug,
              },
              update: {}, // slug is immutable — never update it
            });
            pointId = upserted.id;
            pointName = upserted.name;
            pointCountry = upserted.country;
            pointSlug = upserted.slug;
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
            slug: pointSlug,
            position,
          });
        }

        // Eagerly create Stage rows for every consecutive point pair, within the
        // same transaction so a partial failure rolls back both camino and stages.
        const orderedPointIds = caminoPoints.map((p) => p.id);
        await this.stagesService.upsertStagePairs(orderedPointIds, tx);

        this.logger.debug('Camino created successfully with ID: ' + camino.id);

        return {
          id: camino.id,
          slug: camino.slug,
          name: camino.name,
          description: camino.description,
          verified: camino.verified,
          caminoPoints,
        };
      });

      this.eventLog.logEvent(EventType.CAMINO_CREATED, userId, {
        camino_id: result.id,
        camino_name: result.name,
      });

      return result;
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

    // 1. Verify the camino exists; fetch existing waypoint ids for removal detection.
    const camino = await this.prisma.camino.findUnique({
      where: { id },
      include: { caminoPointOrder: { select: { caminoPointId: true } } },
    });
    if (!camino) {
      throw new NotFoundException('Camino not found.');
    }

    // 2. Base authorisation: pilgrim role required for any update.
    if (!userRoles.some((r) => r.key === 'pilgrim')) {
      throw new ForbiddenException(
        'You do not have permission to update this camino.',
      );
    }

    // 3. Removal authorisation: removing an existing waypoint requires owner or
    //    creator-within-window — same policy as camino deletion.
    if (dto.caminoPoints !== undefined) {
      const newlyReferencedIds = new Set(
        dto.caminoPoints
          .filter((p) => p.caminoPointId != null)
          .map((p) => p.caminoPointId as string),
      );
      const hasRemoval = camino.caminoPointOrder.some(
        (o) => !newlyReferencedIds.has(o.caminoPointId),
      );
      if (hasRemoval) {
        this.deleteAuthorizationService.assertCanDelete(
          userId,
          userRoles,
          camino,
          CAMINO_DELETE_WINDOW_MS,
        );
      }
    }

    try {
      // 3–5. Run the name check, waypoint replacement, and scalar camino update in a
      //      single transaction so the operation is fully atomic. If any step fails,
      //      all changes are rolled back — including waypoint deletions.
      await this.prisma.$transaction(
        async (tx) => {
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
            const newPointDefs = dto.caminoPoints.filter(
              (p) => !p.caminoPointId,
            );
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
            const newOrderedPointIds: string[] = [];
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
                const slug = await this.generateSlug(
                  item.name!,
                  item.country!,
                  tx,
                );
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
                    slug,
                  },
                  update: {}, // slug is immutable — never update it
                });
                pointId = upserted.id;
              }

              await tx.caminoPointOrder.create({
                data: { caminoId: id, caminoPointId: pointId, position: i + 1 },
              });
              newOrderedPointIds.push(pointId);
            }

            // Eagerly upsert Stage rows for the new ordering inside the same
            // transaction — old pairs that left the sequence are NOT deleted.
            await this.stagesService.upsertStagePairs(newOrderedPointIds, tx);
          }

          // 5. Update scalar fields on the camino row.
          //    updatedAt is set explicitly — the schema does not use @updatedAt.
          const updateData: Prisma.CaminoUpdateInput = {
            updatedAt: new Date(),
          };
          if (dto.name !== undefined) {
            updateData.name = dto.name;
          }
          if (dto.description !== undefined) {
            updateData.description = dto.description;
          }
          await tx.camino.update({ where: { id }, data: updateData });
        },
        { timeout: 15000 },
      );

      // 6. Return the fresh full representation
      const updated = await this.findBySlugOrId(id);

      this.eventLog.logEvent(EventType.CAMINO_UPDATED, userId, {
        camino_id: id,
        camino_name: updated.name,
        changed_fields: Object.entries(dto)
          .filter(([, v]) => v !== undefined)
          .map(([k]) => k),
      });

      return updated;
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

  // ── setVerified ─────────────────────────────────────────────────────────────

  async setVerified(id: string, verified: boolean): Promise<CaminoDetailFull> {
    this.logger.debug(`setVerified caminoId=${id} verified=${verified}`);

    const camino = await this.prisma.camino.findUnique({ where: { id } });
    if (!camino) throw new NotFoundException('Camino not found.');

    // updatedAt must be set manually — Camino schema does not use @updatedAt.
    await this.prisma.camino.update({
      where: { id },
      data: { verified, updatedAt: new Date() },
    });

    return this.findBySlugOrId(id);
  }

  // ── delete ──────────────────────────────────────────────────────────────────

  /**
   * Deletes a camino. Authorization rules:
   *   - `owner` role: always permitted.
   *   - Creator: permitted within 2 hours of creation.
   *   - All others: ForbiddenException (403).
   */
  async delete(
    id: string,
    userId: string,
    userRoles: KindeRole[],
  ): Promise<void> {
    this.logger.debug(`Deleting camino ${id}`);

    // 1. Verify the camino exists (must precede auth check to return 404, not 403)
    const camino = await this.prisma.camino.findUnique({ where: { id } });
    if (!camino) {
      throw new NotFoundException('Camino not found.');
    }

    // 2. Time-windowed authorization
    this.deleteAuthorizationService.assertCanDelete(
      userId,
      userRoles,
      camino,
      CAMINO_DELETE_WINDOW_MS,
    );

    // 3. Fetch all picture URLs for S3 cleanup before the DB delete.
    //    Best-effort: log failures but do not abort the delete.
    const pictureUrls = await this.prisma.caminoPicture
      .findMany({
        where: { caminoId: id },
        select: { url: true },
      })
      .then((pics) => pics.map((p) => p.url));

    if (pictureUrls.length > 0) {
      try {
        await this.uploadsService.deleteImages(pictureUrls);
      } catch (err) {
        this.logger.error(
          `S3 cleanup failed for camino ${id} pictures (continuing with DB delete): ${String(err)}`,
        );
      }
    }

    // 4. Delete the camino; DB cascade removes camino_point_order and camino_pictures rows.
    //    camino_points rows are intentionally left untouched.
    await this.prisma.camino.delete({ where: { id } });
    this.logger.debug(`Camino ${id} deleted successfully`);
  }
}
