import { expect, test } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3033/api';

/**
 * E2E test for the stages API's public read access, write authorization,
 * and range validation.
 *
 * User-visible behavior under test
 * ---------------------------------
 * Not a browser flow — this verifies the backend API itself: stages are
 * publicly readable without a token, mutating a stage requires
 * authentication, and requesting a stage number outside the camino's range
 * returns 404.
 *
 * Data strategy
 * -------------
 * No fixture created — reads the first camino from GET /api/caminos to get
 * a valid, real id to target.
 *
 * Auth strategy
 * -------------
 * All requests here are intentionally unauthenticated (no Bearer token).
 */

test.describe('Stages API — read access, write authorization, and range validation', () => {
  test('stages are readable without auth, writing requires auth, and an out-of-range stage number 404s', async ({
    request,
  }) => {
    const listRes = await request.get(`${API_URL}/caminos`);
    expect(listRes.ok(), 'GET /api/caminos must succeed to obtain a real id for the checks below').toBe(
      true,
    );
    const caminos = (await listRes.json()) as Array<{ id: string }>;
    expect(caminos.length, 'at least one camino must exist to target').toBeGreaterThan(0);
    const caminoId = caminos[0].id;

    const listStagesRes = await request.get(`${API_URL}/caminos/${caminoId}/stages`);
    expect(listStagesRes.status(), 'GET stages must succeed without an auth token').toBe(200);

    const patchRes = await request.patch(`${API_URL}/caminos/${caminoId}/stages/1`, {
      headers: { 'Content-Type': 'application/json' },
      data: { distance: 10.5 },
    });
    expect(
      patchRes.status(),
      'PATCH stage without an auth token must be rejected with a 4xx status',
    ).toBeGreaterThanOrEqual(400);
    expect(patchRes.status(), 'PATCH stage rejection must not be a 5xx server error').toBeLessThan(
      500,
    );

    const outOfRangeRes = await request.get(`${API_URL}/caminos/${caminoId}/stages/9999`);
    expect(
      outOfRangeRes.status(),
      'an out-of-range stage number must return 404',
    ).toBe(404);
  });
});
