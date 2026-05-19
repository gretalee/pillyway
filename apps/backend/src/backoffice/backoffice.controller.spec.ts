import { NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import {
  CaminoVotesService,
  VoteEntry,
} from '../camino-votes/camino-votes.service';
import { BackofficeController } from './backoffice.controller';
import {
  BackofficeCaminosService,
  CaminoWithTally,
} from './backoffice-caminos.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CAMINO_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const NOW = new Date('2024-01-01T00:00:00.000Z');

const CAMINOS_WITH_TALLIES: CaminoWithTally[] = [
  {
    id: CAMINO_ID,
    name: 'Camino Frances',
    verified: true,
    yesCount: 10,
    noCount: 2,
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    name: 'Via de la Plata',
    verified: false,
    yesCount: 0,
    noCount: 0,
  },
];

const VOTE_ENTRIES: VoteEntry[] = [
  { vote: true, updatedAt: new Date('2024-01-02T00:00:00.000Z') },
  { vote: false, updatedAt: NOW },
];

// ─── Helper: create a test module with guards passed-through ─────────────────

async function createModuleWithPassThroughGuards(): Promise<TestingModule> {
  return Test.createTestingModule({
    controllers: [BackofficeController],
    providers: [
      {
        provide: BackofficeCaminosService,
        useValue: { getCaminosWithTallies: vi.fn() },
      },
      {
        provide: CaminoVotesService,
        useValue: { listVotesForOwner: vi.fn() },
      },
      Reflector,
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(RolesGuard)
    .useValue({ canActivate: () => true })
    .compile();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BackofficeController', () => {
  let controller: BackofficeController;
  let backofficeCaminosService: BackofficeCaminosService;
  let caminoVotesService: CaminoVotesService;

  beforeEach(async () => {
    const module = await createModuleWithPassThroughGuards();

    controller = module.get(BackofficeController);
    backofficeCaminosService = module.get(BackofficeCaminosService);
    caminoVotesService = module.get(CaminoVotesService);
  });

  // ── GET /backoffice/caminos ───────────────────────────────────────────────

  describe('GET /backoffice/caminos — getCaminosWithTallies', () => {
    it('returns the list of caminos with vote tallies', async () => {
      vi.mocked(
        backofficeCaminosService.getCaminosWithTallies,
      ).mockResolvedValue(CAMINOS_WITH_TALLIES);

      const result = await controller.getCaminosWithTallies();

      expect(
        backofficeCaminosService.getCaminosWithTallies,
      ).toHaveBeenCalledTimes(1);
      expect(result).toEqual(CAMINOS_WITH_TALLIES);
    });

    it('returns an empty array when no caminos exist', async () => {
      vi.mocked(
        backofficeCaminosService.getCaminosWithTallies,
      ).mockResolvedValue([]);

      const result = await controller.getCaminosWithTallies();

      expect(result).toEqual([]);
    });

    it('includes id, name, verified, yesCount, and noCount in each entry', async () => {
      vi.mocked(
        backofficeCaminosService.getCaminosWithTallies,
      ).mockResolvedValue(CAMINOS_WITH_TALLIES);

      const result = await controller.getCaminosWithTallies();

      result.forEach((entry) => {
        expect(entry).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          verified: expect.any(Boolean),
          yesCount: expect.any(Number),
          noCount: expect.any(Number),
        });
      });
    });

    it('has JwtAuthGuard and RolesGuard applied at the class level', () => {
      // Guards only execute in the HTTP pipeline, not on direct method calls.
      // Verify the class-level decorator metadata is wired correctly.
      const guards: unknown[] =
        Reflect.getMetadata('__guards__', BackofficeController) ?? [];
      expect(
        guards,
        'BackofficeController must declare JwtAuthGuard',
      ).toContain(JwtAuthGuard);
      expect(guards, 'BackofficeController must declare RolesGuard').toContain(
        RolesGuard,
      );
    });
  });

  // ── GET /backoffice/caminos/:caminoId/votes ──────────────────────────────

  describe('GET /backoffice/caminos/:caminoId/votes — listVotes', () => {
    it('returns the ordered list of vote entries for a given camino', async () => {
      vi.mocked(caminoVotesService.listVotesForOwner).mockResolvedValue(
        VOTE_ENTRIES,
      );

      const result = await controller.listVotes(CAMINO_ID);

      expect(caminoVotesService.listVotesForOwner).toHaveBeenCalledWith(
        CAMINO_ID,
      );
      expect(result).toEqual(VOTE_ENTRIES);
    });

    it('returns an empty array when the camino has no votes', async () => {
      vi.mocked(caminoVotesService.listVotesForOwner).mockResolvedValue([]);

      const result = await controller.listVotes(CAMINO_ID);

      expect(result).toEqual([]);
    });

    it('propagates NotFoundException when the camino does not exist', async () => {
      vi.mocked(caminoVotesService.listVotesForOwner).mockRejectedValue(
        new NotFoundException('Camino not found.'),
      );

      await expect(controller.listVotes(CAMINO_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('delegates to CaminoVotesService.listVotesForOwner, not a local method', async () => {
      // Confirm that the backoffice controller does NOT re-implement vote
      // listing — it reuses the shared CaminoVotesService.
      vi.mocked(caminoVotesService.listVotesForOwner).mockResolvedValue([]);

      await controller.listVotes(CAMINO_ID);

      expect(caminoVotesService.listVotesForOwner).toHaveBeenCalledTimes(1);
    });

    it('does not expose userId in any vote entry', async () => {
      vi.mocked(caminoVotesService.listVotesForOwner).mockResolvedValue(
        VOTE_ENTRIES,
      );

      const result = await controller.listVotes(CAMINO_ID);

      result.forEach((entry) => {
        expect(entry).not.toHaveProperty('userId');
      });
    });

    it('inherits class-level JwtAuthGuard and RolesGuard — same as all backoffice routes', () => {
      // listVotes inherits the class-level @UseGuards(JwtAuthGuard, RolesGuard).
      // Confirm no method-level override removes the guards.
      const classGuards: unknown[] =
        Reflect.getMetadata('__guards__', BackofficeController) ?? [];
      expect(classGuards).toContain(JwtAuthGuard);
      expect(classGuards).toContain(RolesGuard);
    });
  });
});
