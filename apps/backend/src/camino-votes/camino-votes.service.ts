import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../event-log/event-type.enum';
import { PrismaService } from '../prisma/prisma.service';

export interface VoteResult {
  caminoId: string;
  vote: boolean;
  updatedAt: Date;
}

export interface VoteSummary {
  caminoId: string;
  yesCount: number;
  noCount: number;
  total: number;
}

export interface VoteEntry {
  vote: boolean;
  updatedAt: Date;
}

@Injectable()
export class CaminoVotesService {
  private readonly logger = new Logger(CaminoVotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventLog: EventLogService,
  ) {}

  async castVote(
    caminoId: string,
    userId: string,
    vote: boolean,
  ): Promise<VoteResult> {
    this.logger.debug(`castVote caminoId=${caminoId} vote=${vote}`);

    const camino = await this.prisma.camino.findUnique({
      where: { id: caminoId },
    });
    if (!camino) throw new NotFoundException('Camino not found.');

    const now = new Date();
    const result = await this.prisma.caminoVote.upsert({
      where: { caminoId_userId: { caminoId, userId } },
      create: { caminoId, userId, vote, updatedAt: now },
      update: { vote, updatedAt: now },
      select: { caminoId: true, vote: true, updatedAt: true },
    });

    this.eventLog.logEvent(EventType.CAMINO_VOTED, userId, {
      camino_id: caminoId,
      vote,
    });

    return result;
  }

  async getMyVote(caminoId: string, userId: string): Promise<VoteResult> {
    this.logger.debug(`getMyVote caminoId=${caminoId}`);

    const record = await this.prisma.caminoVote.findUnique({
      where: { caminoId_userId: { caminoId, userId } },
      select: { caminoId: true, vote: true, updatedAt: true },
    });

    if (!record)
      throw new NotFoundException(
        'No vote exists for this user and camino combination.',
      );

    return record;
  }

  async getVoteSummary(caminoId: string): Promise<VoteSummary> {
    this.logger.debug(`getVoteSummary caminoId=${caminoId}`);

    const camino = await this.prisma.camino.findUnique({
      where: { id: caminoId },
    });
    if (!camino) throw new NotFoundException('Camino not found.');

    const tallies = await this.prisma.caminoVote.groupBy({
      by: ['vote'],
      where: { caminoId },
      _count: { vote: true },
    });

    let yesCount = 0;
    let noCount = 0;
    for (const t of tallies) {
      if (t.vote) yesCount = t._count.vote;
      else noCount = t._count.vote;
    }

    return { caminoId, yesCount, noCount, total: yesCount + noCount };
  }

  async listVotesForOwner(caminoId: string): Promise<VoteEntry[]> {
    this.logger.debug(`listVotesForOwner caminoId=${caminoId}`);

    const camino = await this.prisma.camino.findUnique({
      where: { id: caminoId },
    });
    if (!camino) throw new NotFoundException('Camino not found.');

    return this.prisma.caminoVote.findMany({
      where: { caminoId },
      select: { vote: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
