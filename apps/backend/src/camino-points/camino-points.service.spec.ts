import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';

import { SupabaseService } from '../supabase/supabase.service';
import { CaminoPointsService } from './camino-points.service';

// ─── Proxy stub ──────────────────────────────────────────────────────────────

/**
 * Returns a Proxy object that accepts any chain of method calls and,
 * when the resulting promise is awaited, resolves with `result`.
 *
 * This avoids enumerating every Supabase query-builder method by name.
 */
function makeQueryStub(result: { data: unknown; error: unknown }): object {
  function makeProxy(): object {
    return new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'then') {
            return (
              resolve: (v: unknown) => void,
              _reject: (r?: unknown) => void,
            ) => resolve(result);
          }
          return (..._args: unknown[]) => makeProxy();
        },
      },
    );
  }
  return makeProxy();
}

async function buildModule(clientStub: object): Promise<CaminoPointsService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CaminoPointsService,
      {
        provide: SupabaseService,
        useValue: { client: clientStub },
      },
    ],
  }).compile();
  return module.get(CaminoPointsService);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CaminoPointsService.search()', () => {
  // CAM-BE-18/19: short-circuit — must not hit DB when both params absent
  it('CAM-BE-18: returns [] immediately when both name and country are absent', async () => {
    const fromMock = vi.fn();
    const service = await buildModule({ from: fromMock });

    const result = await service.search(undefined, undefined);

    expect(result).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('CAM-BE-19: returns [] immediately when name is empty string and country absent', async () => {
    const fromMock = vi.fn();
    const service = await buildModule({ from: fromMock });

    const result = await service.search('', undefined);

    expect(result).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  // CAM-BE-17: no matches → empty array (not null, not undefined)
  it('CAM-BE-17: returns empty array when search finds no results', async () => {
    const stub = makeQueryStub({ data: [], error: null });
    const service = await buildModule({ from: () => stub });

    const result = await service.search('xyz', 'Spain');

    expect(result).toEqual([]);
  });

  // CAM-BE-16: returns matching records
  it('CAM-BE-16: returns matching records for name + country search', async () => {
    const records = [
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Santiago',
        country: 'Spain',
        description: null,
      },
      {
        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        name: 'Santillana',
        country: 'Spain',
        description: null,
      },
      {
        id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
        name: 'Santoña',
        country: 'Spain',
        description: null,
      },
    ];
    const stub = makeQueryStub({ data: records, error: null });
    const service = await buildModule({ from: () => stub });

    const result = await service.search('santi', 'Spain');

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Santiago');
  });

  // CAM-BE-20: limit enforced at DB query level — service returns what DB returns
  it('CAM-BE-20: returns exactly 5 records when DB returns 5 (limit enforced in query)', async () => {
    const fiveRecords = Array.from({ length: 5 }, (_, i) => ({
      id: `id-${i}`,
      name: `Point ${i}`,
      country: 'Spain',
      description: null,
    }));
    const stub = makeQueryStub({ data: fiveRecords, error: null });
    const service = await buildModule({ from: () => stub });

    const result = await service.search('point', 'Spain');

    expect(result).toHaveLength(5);
  });

  // name-only search (no country)
  it('returns results when only name is provided', async () => {
    const records = [
      { id: 'id-1', name: 'Saint-Jean', country: 'France', description: null },
    ];
    const stub = makeQueryStub({ data: records, error: null });
    const service = await buildModule({ from: () => stub });

    const result = await service.search('saint', undefined);

    expect(result).toHaveLength(1);
  });

  // country-only search
  it('returns results when only country is provided', async () => {
    const records = [
      { id: 'id-1', name: 'Pamplona', country: 'Spain', description: null },
    ];
    const stub = makeQueryStub({ data: records, error: null });
    const service = await buildModule({ from: () => stub });

    const result = await service.search(undefined, 'Spain');

    expect(result).toHaveLength(1);
  });

  // DB error → InternalServerErrorException
  it('throws InternalServerErrorException when DB query fails', async () => {
    const stub = makeQueryStub({
      data: null,
      error: { message: 'connection timeout' },
    });
    const service = await buildModule({ from: () => stub });

    await expect(service.search('saint', 'France')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  // null data with no error → empty array (defensive null-safety)
  it('returns [] when DB returns null data without an error', async () => {
    const stub = makeQueryStub({ data: null, error: null });
    const service = await buildModule({ from: () => stub });

    const result = await service.search('any', 'Spain');

    expect(result).toEqual([]);
  });
});
