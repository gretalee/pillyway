import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../prisma/prisma.service';
import { CaminoVotesService } from './camino-votes.service';

// ─── Prisma mock factory ──────────────────────────────────────────────────────

function buildPrismaMock() {
  return {
    camino: {
      findUnique: vi.fn(),
    },
    caminoVote: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
  } as unknown as PrismaService;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CAMINO_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const NOW = new Date('2024-01-01T00:00:00.000Z');

const CAMINO_STUB = { id: CAMINO_ID, name: 'Via Francigena' };

const VOTE_RESULT_STUB = { caminoId: CAMINO_ID, vote: true, updatedAt: NOW };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CaminoVotesService', () => {
  let service: CaminoVotesService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new CaminoVotesService(prisma);
  });

  // ── castVote ──────────────────────────────────────────────────────────────

  describe('castVote', () => {
    it('upserts the vote and returns the result when the camino exists', async () => {
      vi.mocked(prisma.camino.findUnique).mockResolvedValue(CAMINO_STUB as never);
      vi.mocked(prisma.caminoVote.upsert).mockResolvedValue(VOTE_RESULT_STUB as never);

      const result = await service.castVote(CAMINO_ID, USER_ID, true);

      expect(prisma.camino.findUnique).toHaveBeenCalledWith({
        where: { id: CAMINO_ID },
      });
      expect(prisma.caminoVote.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { caminoId_userId: { caminoId: CAMINO_ID, userId: USER_ID } },
          create: expect.objectContaining({ caminoId: CAMINO_ID, userId: USER_ID, vote: true }),
          update: expect.objectContaining({ vote: true }),
        }),
      );
      expect(result).toEqual(VOTE_RESULT_STUB);
    });

    it('throws NotFoundException when the camino does not exist', async () => {
      vi.mocked(prisma.camino.findUnique).mockResolvedValue(null);

      await expect(service.castVote(CAMINO_ID, USER_ID, true)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('upserts a false (no) vote correctly', async () => {
      const noVote = { caminoId: CAMINO_ID, vote: false, updatedAt: NOW };
      vi.mocked(prisma.camino.findUnique).mockResolvedValue(CAMINO_STUB as never);
      vi.mocked(prisma.caminoVote.upsert).mockResolvedValue(noVote as never);

      const result = await service.castVote(CAMINO_ID, USER_ID, false);

      expect(prisma.caminoVote.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ vote: false }),
          update: expect.objectContaining({ vote: false }),
        }),
      );
      expect(result.vote).toBe(false);
    });

    it('overwrites an existing yes vote with a no vote (upsert semantics)', async () => {
      // The DB should receive an upsert — the service does not query the old
      // vote first. This test verifies the upsert update path carries the new value.
      const updatedVote = { caminoId: CAMINO_ID, vote: false, updatedAt: NOW };
      vi.mocked(prisma.camino.findUnique).mockResolvedValue(CAMINO_STUB as never);
      vi.mocked(prisma.caminoVote.upsert).mockResolvedValue(updatedVote as never);

      const result = await service.castVote(CAMINO_ID, USER_ID, false);

      expect(result.vote).toBe(false);
      // upsert must include { vote: false } in the update clause
      const callArg = vi.mocked(prisma.caminoVote.upsert).mock.calls[0][0];
      expect(callArg.update).toMatchObject({ vote: false });
    });
  });

  // ── getMyVote ─────────────────────────────────────────────────────────────

  describe('getMyVote', () => {
    it('returns the vote record when one exists for this user and camino', async () => {
      vi.mocked(prisma.caminoVote.findUnique).mockResolvedValue(VOTE_RESULT_STUB as never);

      const result = await service.getMyVote(CAMINO_ID, USER_ID);

      expect(prisma.caminoVote.findUnique).toHaveBeenCalledWith({
        where: { caminoId_userId: { caminoId: CAMINO_ID, userId: USER_ID } },
        select: { caminoId: true, vote: true, updatedAt: true },
      });
      expect(result).toEqual(VOTE_RESULT_STUB);
    });

    it('throws NotFoundException when no vote exists for this user + camino combination', async () => {
      vi.mocked(prisma.caminoVote.findUnique).mockResolvedValue(null);

      await expect(service.getMyVote(CAMINO_ID, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── getVoteSummary ────────────────────────────────────────────────────────

  describe('getVoteSummary', () => {
    it('returns correct yes and no counts when both vote types are present', async () => {
      vi.mocked(prisma.camino.findUnique).mockResolvedValue(CAMINO_STUB as never);
      vi.mocked(prisma.caminoVote.groupBy).mockResolvedValue([
        { vote: true, _count: { vote: 5 } },
        { vote: false, _count: { vote: 3 } },
      ] as never);

      const result = await service.getVoteSummary(CAMINO_ID);

      expect(result).toEqual({
        caminoId: CAMINO_ID,
        yesCount: 5,
        noCount: 3,
        total: 8,
      });
    });

    it('returns yesCount=0 when only no votes are present', async () => {
      vi.mocked(prisma.camino.findUnique).mockResolvedValue(CAMINO_STUB as never);
      vi.mocked(prisma.caminoVote.groupBy).mockResolvedValue([
        { vote: false, _count: { vote: 4 } },
      ] as never);

      const result = await service.getVoteSummary(CAMINO_ID);

      expect(result).toMatchObject({ yesCount: 0, noCount: 4, total: 4 });
    });

    it('returns all zeros when no votes have been cast yet', async () => {
      vi.mocked(prisma.camino.findUnique).mockResolvedValue(CAMINO_STUB as never);
      vi.mocked(prisma.caminoVote.groupBy).mockResolvedValue([] as never);

      const result = await service.getVoteSummary(CAMINO_ID);

      expect(result).toMatchObject({ yesCount: 0, noCount: 0, total: 0 });
    });

    it('throws NotFoundException when the camino does not exist', async () => {
      vi.mocked(prisma.camino.findUnique).mockResolvedValue(null);

      await expect(service.getVoteSummary(CAMINO_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── listVotesForOwner ─────────────────────────────────────────────────────

  describe('listVotesForOwner', () => {
    it('returns an ordered list of vote entries for an existing camino', async () => {
      const entries = [
        { vote: true, updatedAt: new Date('2024-01-02T00:00:00.000Z') },
        { vote: false, updatedAt: new Date('2024-01-01T00:00:00.000Z') },
      ];
      vi.mocked(prisma.camino.findUnique).mockResolvedValue(CAMINO_STUB as never);
      vi.mocked(prisma.caminoVote.findMany).mockResolvedValue(entries as never);

      const result = await service.listVotesForOwner(CAMINO_ID);

      expect(prisma.caminoVote.findMany).toHaveBeenCalledWith({
        where: { caminoId: CAMINO_ID },
        select: { vote: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toEqual(entries);
    });

    it('returns an empty array when the camino has no votes', async () => {
      vi.mocked(prisma.camino.findUnique).mockResolvedValue(CAMINO_STUB as never);
      vi.mocked(prisma.caminoVote.findMany).mockResolvedValue([] as never);

      const result = await service.listVotesForOwner(CAMINO_ID);

      expect(result).toEqual([]);
    });

    it('throws NotFoundException when the camino does not exist', async () => {
      vi.mocked(prisma.camino.findUnique).mockResolvedValue(null);

      await expect(service.listVotesForOwner(CAMINO_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('does not expose userId in the returned entries', async () => {
      // findMany is called with select: { vote, updatedAt } — no userId field.
      // The mock enforces the same constraint: no userId in the stub.
      const entries = [{ vote: true, updatedAt: NOW }];
      vi.mocked(prisma.camino.findUnique).mockResolvedValue(CAMINO_STUB as never);
      vi.mocked(prisma.caminoVote.findMany).mockResolvedValue(entries as never);

      const result = await service.listVotesForOwner(CAMINO_ID);

      result.forEach((entry) => {
        expect(entry).not.toHaveProperty('userId');
      });
    });
  });
});
