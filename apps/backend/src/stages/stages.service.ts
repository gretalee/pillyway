import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StageDetail } from './dto/stage-detail.dto';
import { StageListItem } from './dto/stage-list-item.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Describes one consecutive pair derived from the Camino's ordered point list.
 * Used to batch-fetch Stage rows without N+1 queries.
 */
interface StagePair {
  startId: string;
  endId: string;
  startName: string;
  endName: string;
  startCountry: string;
  endCountry: string;
  startSlug: string;
  endSlug: string;
  startHasAccommodation: boolean;
  endHasAccommodation: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class StagesService {
  private readonly logger = new Logger(StagesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── resolveCaminoId ───────────────────────────────────────────────────────────

  private async resolveCaminoId(slugOrId: string): Promise<string> {
    if (UUID_RE.test(slugOrId)) return slugOrId;

    const camino = await this.prisma.camino.findUnique({
      where: { slug: slugOrId },
      select: { id: true },
    });
    if (!camino) throw new NotFoundException('Camino not found.');
    return camino.id;
  }

  // ── findByCamino ─────────────────────────────────────────────────────────────

  /**
   * Returns all stages for the given Camino, ordered 1-based by position.
   * Uses a single batched Prisma query to avoid N+1 reads.
   *
   * @throws NotFoundException when the Camino does not exist.
   */
  async findByCamino(slugOrId: string): Promise<StageListItem[]> {
    const caminoId = await this.resolveCaminoId(slugOrId);
    const orderedPoints = await this.prisma.caminoPointOrder.findMany({
      where: { caminoId },
      orderBy: { position: 'asc' },
      include: {
        caminoPoint: {
          include: { _count: { select: { accommodations: true } } },
        },
      },
    });

    if (orderedPoints.length === 0) {
      // Distinguish "Camino not found" from "Camino has no points"
      const camino = await this.prisma.camino.findUnique({
        where: { id: caminoId },
        select: { id: true },
      });
      if (!camino) {
        throw new NotFoundException('Camino not found.');
      }
      return [];
    }

    if (orderedPoints.length < 2) {
      return [];
    }

    const pairs: StagePair[] = [];
    for (let i = 0; i < orderedPoints.length - 1; i++) {
      const start = orderedPoints[i].caminoPoint;
      const end = orderedPoints[i + 1].caminoPoint;
      pairs.push({
        startId: start.id,
        endId: end.id,
        startName: start.name,
        endName: end.name,
        startCountry: start.country,
        endCountry: end.country,
        startSlug: start.slug,
        endSlug: end.slug,
        startHasAccommodation: start._count.accommodations > 0,
        endHasAccommodation: end._count.accommodations > 0,
      });
    }

    // Single batched query — no N+1
    const stageRows = await this.prisma.stage.findMany({
      where: {
        OR: pairs.map((p) => ({
          startPointId: p.startId,
          endPointId: p.endId,
        })),
      },
    });

    // Build lookup keyed by "startId|endId" for O(1) access
    const stageByPair = new Map<string, (typeof stageRows)[0]>();
    for (const row of stageRows) {
      stageByPair.set(`${row.startPointId}|${row.endPointId}`, row);
    }

    const result: StageListItem[] = [];
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      const row = stageByPair.get(`${pair.startId}|${pair.endId}`);

      if (!row) {
        this.logger.error(
          `Data integrity violation: no Stage row for consecutive pair ` +
            `"${pair.startName}" → "${pair.endName}" (camino ${caminoId}, pair index ${i}). ` +
            `Re-seed the camino or create the missing Stage record.`,
        );
        throw new InternalServerErrorException(
          `Stage ${i + 1} is missing a Stage record. The camino data is inconsistent.`,
        );
      }

      result.push({
        id: row.id,
        stageNumber: i + 1,
        startPoint: {
          id: pair.startId,
          name: pair.startName,
          country: pair.startCountry,
          slug: pair.startSlug,
          hasAccommodation: pair.startHasAccommodation,
        },
        endPoint: {
          id: pair.endId,
          name: pair.endName,
          country: pair.endCountry,
          slug: pair.endSlug,
          hasAccommodation: pair.endHasAccommodation,
        },
        distance: row.distance,
        description: row.description,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    }

    return result;
  }

  // ── findOne ──────────────────────────────────────────────────────────────────

  /**
   * Returns the full detail for a single stage identified by its 1-based number
   * within the Camino, including adjacent stage summaries.
   *
   * @throws NotFoundException when the Camino does not exist or stageNumber is out of range.
   */
  async findOne(slugOrId: string, stageNumber: number): Promise<StageDetail> {
    const caminoId = await this.resolveCaminoId(slugOrId);
    const orderedPoints = await this.prisma.caminoPointOrder.findMany({
      where: { caminoId },
      orderBy: { position: 'asc' },
      include: {
        caminoPoint: {
          include: { _count: { select: { accommodations: true } } },
        },
      },
    });

    if (orderedPoints.length === 0) {
      const camino = await this.prisma.camino.findUnique({
        where: { id: caminoId },
        select: { id: true },
      });
      if (!camino) {
        throw new NotFoundException('Camino not found.');
      }
      throw new NotFoundException('Stage not found.');
    }

    const totalStages = orderedPoints.length - 1;

    if (stageNumber < 1 || stageNumber > totalStages) {
      throw new NotFoundException('Stage not found.');
    }

    // stageNumber is 1-based; index into orderedPoints is 0-based
    const startPoint = orderedPoints[stageNumber - 1].caminoPoint;
    const endPoint = orderedPoints[stageNumber].caminoPoint;

    const row = await this.prisma.stage.findUnique({
      where: {
        startPointId_endPointId: {
          startPointId: startPoint.id,
          endPointId: endPoint.id,
        },
      },
    });

    if (!row) {
      // Should not happen after the backfill migration, but guard defensively
      throw new NotFoundException('Stage not found.');
    }

    // Build adjacent stage summaries
    let previousStage = null;
    if (stageNumber > 1) {
      const prevStart = orderedPoints[stageNumber - 2].caminoPoint;
      const prevEnd = orderedPoints[stageNumber - 1].caminoPoint;
      previousStage = {
        stageNumber: stageNumber - 1,
        startPointName: prevStart.name,
        endPointName: prevEnd.name,
      };
    }

    let nextStage = null;
    if (stageNumber < totalStages) {
      const nextStart = orderedPoints[stageNumber].caminoPoint;
      const nextEnd = orderedPoints[stageNumber + 1].caminoPoint;
      nextStage = {
        stageNumber: stageNumber + 1,
        startPointName: nextStart.name,
        endPointName: nextEnd.name,
      };
    }

    return {
      id: row.id,
      stageNumber,
      startPoint: {
        id: startPoint.id,
        name: startPoint.name,
        country: startPoint.country,
        slug: startPoint.slug,
        hasAccommodation: startPoint._count.accommodations > 0,
      },
      endPoint: {
        id: endPoint.id,
        name: endPoint.name,
        country: endPoint.country,
        slug: endPoint.slug,
        hasAccommodation: endPoint._count.accommodations > 0,
      },
      distance: row.distance,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      previousStage,
      nextStage,
    };
  }

  // ── update ───────────────────────────────────────────────────────────────────

  /**
   * Updates the mutable fields (distance, description) of a stage.
   * Authorization check is performed at the service layer.
   *
   * @throws ForbiddenException when the user does not have the `pilgrim` role.
   * @throws NotFoundException when the Camino does not exist or stageNumber is out of range.
   */
  async update(
    slugOrId: string,
    stageNumber: number,
    dto: UpdateStageDto,
    userRoles: string[],
  ): Promise<StageDetail> {
    if (!userRoles.includes('pilgrim')) {
      throw new ForbiddenException(
        'You do not have permission to edit this stage. The pilgrim role is required.',
      );
    }

    const caminoId = await this.resolveCaminoId(slugOrId);
    const orderedPoints = await this.prisma.caminoPointOrder.findMany({
      where: { caminoId },
      orderBy: { position: 'asc' },
      include: { caminoPoint: true },
    });

    if (orderedPoints.length === 0) {
      const camino = await this.prisma.camino.findUnique({
        where: { id: caminoId },
        select: { id: true },
      });
      if (!camino) {
        throw new NotFoundException('Camino not found.');
      }
      throw new NotFoundException('Stage not found.');
    }

    const totalStages = orderedPoints.length - 1;

    if (stageNumber < 1 || stageNumber > totalStages) {
      throw new NotFoundException('Stage not found.');
    }

    const startPoint = orderedPoints[stageNumber - 1].caminoPoint;
    const endPoint = orderedPoints[stageNumber].caminoPoint;

    const updateData: Prisma.StageUpdateInput = {};
    if (dto.distance !== undefined) {
      updateData.distance = dto.distance;
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    // Upsert so legacy caminos (created before eager stage creation) get a row
    // on first PATCH without requiring a prior GET to trigger the lazy backfill.
    await this.prisma.stage.upsert({
      where: {
        startPointId_endPointId: {
          startPointId: startPoint.id,
          endPointId: endPoint.id,
        },
      },
      create: {
        startPointId: startPoint.id,
        endPointId: endPoint.id,
        ...(dto.distance !== undefined && { distance: dto.distance }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      update: updateData,
    });

    this.logger.debug(
      `Stage ${stageNumber} of camino ${caminoId} updated successfully`,
    );

    // Return the fresh full representation
    return this.findOne(caminoId, stageNumber);
  }

  // ── upsertStagePairs ─────────────────────────────────────────────────────────

  /**
   * Creates Stage rows for each consecutive pair in the ordered point ID list.
   * Uses the caller's transaction client — never opens its own `prisma.$transaction`
   * because nested interactive transactions are not supported by Prisma.
   *
   * Called from CaminosService.create() and CaminosService.update() inside their
   * existing transactions to ensure atomicity with the surrounding Camino write.
   *
   * @param pointIds - Ordered list of CaminoPoint UUIDs (from position 1 … N).
   * @param tx       - The outer Prisma transaction client.
   */
  async upsertStagePairs(
    pointIds: string[],
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (pointIds.length < 2) {
      return;
    }

    for (let i = 0; i < pointIds.length - 1; i++) {
      const startPointId = pointIds[i];
      const endPointId = pointIds[i + 1];

      await tx.stage.upsert({
        where: {
          startPointId_endPointId: { startPointId, endPointId },
        },
        create: {
          startPointId,
          endPointId,
          distance: null,
          description: null,
        },
        // update is intentionally a no-op — preserve existing distance/description data
        update: {},
      });
    }
  }
}
