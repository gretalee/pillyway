import { expect, test } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3033/api';

/**
 * E2E test for camino API-level authorization and input validation.
 *
 * User-visible behavior under test
 * ---------------------------------
 * Not a browser flow — this verifies the backend API itself rejects
 * unauthenticated mutation requests and handles invalid/non-existent camino
 * IDs correctly, independent of any UI.
 *
 * Data strategy
 * -------------
 * No fixture created — reads the first camino from GET /api/caminos to get
 * a valid, real ID to target with the unauthenticated PATCH/DELETE checks.
 *
 * Auth strategy
 * -------------
 * All requests here are intentionally unauthenticated (no Bearer token) —
 * that's exactly what's under test.
 */

test.describe('Camino API — authorization and validation', () => {
  test('rejects unauthenticated PATCH/DELETE, and returns correct status codes for bad camino IDs', async ({
    request,
  }) => {
    const listRes = await request.get(`${API_URL}/caminos`);
    expect(listRes.ok(), 'GET /api/caminos must succeed to obtain a real id for the checks below').toBe(
      true,
    );
    const caminos = (await listRes.json()) as Array<{ id: string }>;
    expect(caminos.length, 'at least one camino must exist to target').toBeGreaterThan(0);
    const targetId = caminos[0].id;

    // An unauthenticated PATCH must be rejected as a 4xx (401 for "no
    // token", 403 for "not permitted" — either is an acceptable rejection).
    const patchRes = await request.patch(`${API_URL}/caminos/${targetId}`, {
      headers: { 'Content-Type': 'application/json' },
      data: { name: 'Unauthorized Rename Attempt' },
    });
    expect(patchRes.status(), 'unauthenticated PATCH must be rejected with a 4xx status').toBeGreaterThanOrEqual(
      400,
    );
    expect(patchRes.status(), 'unauthenticated PATCH must not be a 5xx server error').toBeLessThan(
      500,
    );

    // An unauthenticated DELETE must likewise be rejected.
    const deleteRes = await request.delete(`${API_URL}/caminos/${targetId}`);
    expect(
      deleteRes.status(),
      'unauthenticated DELETE must be rejected with a 4xx status',
    ).toBeGreaterThanOrEqual(400);
    expect(deleteRes.status(), 'unauthenticated DELETE must not be a 5xx server error').toBeLessThan(
      500,
    );

    // A well-formed but non-existent UUID must 404.
    const notFoundRes = await request.get(
      `${API_URL}/caminos/00000000-0000-0000-0000-000000000000`,
    );
    expect(
      notFoundRes.status(),
      'a non-existent (but valid-UUID) camino id must return 404',
    ).toBe(404);

    // A malformed (non-UUID) id must 400, not 404 or 500.
    const badRequestRes = await request.get(`${API_URL}/caminos/not-a-uuid`);
    expect(badRequestRes.status(), 'a non-UUID path parameter must return 400').toBe(400);
  });
});
