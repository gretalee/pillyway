import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { getAccessToken, uniqueName } from './login-helpers';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3033/api';

/** A waypoint as returned by the create-camino API response — real backend
 * identifiers, distinct from CaminoSeedPoint (which is just the data a test
 * submits). Used to delete mock waypoints in afterAll (see
 * deleteMockWaypoints below). */
export interface CreatedCaminoPoint {
  id: string;
  name: string;
  country: string;
  slug: string;
  position: number;
}

export interface CreatedCamino {
  id: string;
  slug: string;
  caminoPoints: CreatedCaminoPoint[];
}

/**
 * One waypoint in a mock camino's seed data — deliberately shaped like a
 * point entry in the seed JSON files under scripts/data/ (see the
 * camino-seed-generator skill), not like a Playwright-specific fixture.
 * `country` is the full lowercase English country name (e.g. "france"),
 * matching both the DB/seed-file convention (CLAUDE.md) and the `value`
 * attribute the Country <select> actually renders — filling it via
 * `selectOption({ value: ... })` this way is immune to locale/label text.
 */
export interface CaminoSeedPoint {
  name: string;
  /** Full lowercase English country name, e.g. "france" — never an ISO code. */
  country: string;
  /** ISO country code, for asserting against UI elements that show codes
   * (e.g. the "FR · ES" countries-passed-through row, the country filter). */
  countryCode: string;
  description?: string;
  /**
   * Real-world coordinates. Required so CaminoRouteMap (which needs >=2
   * points with coordinates) actually renders for a mock camino — see the
   * comment on fillWaypointRow below for why this matters even for reused
   * waypoints.
   */
  lat: number;
  lng: number;
}

/**
 * A mock camino's seed data — the shape createMockCamino() consumes and
 * (with `camino.name` resolved to a unique value) returns. Mirrors the
 * `camino`/`points` shape of the real seed JSON files, trimmed to only the
 * fields the create-camino form actually has inputs for (no `stages` or
 * per-point `accommodations` — those aren't part of camino creation; add
 * them afterward via the waypoint/stage pages, as
 * caminos-loggedIn.spec.ts does).
 */
export interface CaminoSeedData {
  camino: {
    /**
     * Used as the label passed to uniqueName() — createMockCamino always
     * appends a fresh timestamp, so this itself never needs to be unique,
     * and the resolved (unique) name is what comes back on the return
     * value's `camino.name`.
     */
    name: string;
    description: string;
  };
  points: CaminoSeedPoint[];
}

export type CreatedMockCamino = CaminoSeedData & CreatedCamino;

/**
 * Default seed data for createMockCamino() — a 4-waypoint camino across
 * France and Spain. Tests that need a different shape import this and
 * override only what they need, e.g.:
 *
 *   createMockCamino(page, {
 *     ...DEFAULT_CAMINO_SEED_DATA,
 *     camino: { ...DEFAULT_CAMINO_SEED_DATA.camino, name: 'MyTestCamino' },
 *     points: [ITALY_SEED_POINT],
 *   })
 */
export const DEFAULT_CAMINO_SEED_DATA: CaminoSeedData = {
  camino: {
    name: 'MockCamino',
    description: 'A fixture camino created for E2E tests.',
  },
  points: [
    { name: 'Saint-Jean-Pied-de-Port', country: 'france', countryCode: 'FR', lat: 43.1634, lng: -1.2377 },
    { name: 'Roncesvalles', country: 'spain', countryCode: 'ES', lat: 43.0097, lng: -1.3197 },
    { name: 'Pamplona', country: 'spain', countryCode: 'ES', lat: 42.8125, lng: -1.6458 },
    { name: 'Logroño', country: 'spain', countryCode: 'ES', lat: 42.4627, lng: -2.4449 },
  ],
};

/** A single waypoint in a country distinct from DEFAULT_CAMINO_SEED_DATA,
 * for tests that need a camino outside the France/Spain fixture (e.g.
 * country filter tests): `points: [ITALY_SEED_POINT]`. */
export const ITALY_SEED_POINT: CaminoSeedPoint = {
  name: 'Assisi',
  country: 'italy',
  countryCode: 'IT',
  lat: 43.0707,
  lng: 12.6197,
};

/** Derives the "FR · ES"-style countries-passed-through string from a seed's
 * points — don't hand-type this in a test, since it must stay in sync with
 * whichever points a given mock camino actually used. */
export function countryCodesOf(points: readonly CaminoSeedPoint[]): string {
  return [...new Set(points.map((p) => p.countryCode))].join(' · ');
}

/**
 * Clicks "Create Camino" and captures the created camino's id/slug directly
 * from the create API response — NOT from any later UI navigation, and NOT
 * gated behind any subsequent UI assertion.
 *
 * Why this matters: the form no longer redirects on success — it swaps in a
 * second "Add pictures (optional)" step within the same page, and only
 * pushes to the detail page once "View camino" is clicked. If this function
 * captured the id/slug but then threw before returning it (e.g. an
 * additional UI sanity check that turned out flaky), the camino would
 * already exist in the database but the caller would never receive its
 * identity — leaving it permanently orphaned, since afterAll cleanup can
 * only target a camino it knows the id/slug of. Returning immediately after
 * validating/parsing the response — with no UI assertion in between — is
 * what keeps cleanup possible no matter what happens afterward. Callers that
 * want to assert the post-creation UI state do so themselves, after they
 * already have `created` in hand.
 */
export async function submitCaminoCreateForm(page: Page): Promise<CreatedCamino> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        new URL(res.url()).pathname === '/api/caminos',
      { timeout: 15_000 },
    ),
    page.getByRole('button', { name: 'Create Camino' }).click(),
  ]);
  expect(response.ok(), 'camino creation request must succeed').toBe(true);
  return (await response.json()) as CreatedCamino;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Fills one waypoint row's name, country, description, and coordinates,
 * accepting the "reuse existing waypoint" suggestion if it appears.
 *
 * The suggestion button's accessible name interpolates the waypoint name
 * (e.g. "Yes, use this existing waypoint: Roncesvalles"), and matching on
 * that specific name — not just the shared prefix — is required, not
 * cosmetic: each waypoint row runs its own independently-debounced search,
 * so with several rows on the page at once, more than one row's suggestion
 * card can be visible simultaneously. A `.first()` match against the whole
 * page (this helper's original approach) doesn't target "this row's"
 * suggestion — it targets whichever row's card happens to render first,
 * which can silently confirm the wrong row.
 *
 * Coordinates are filled even when a suggestion is accepted. The create
 * form always renders editable Latitude/Longitude inputs — unlike the
 * update form, it never passes a `waypointSlug` prop to CaminoPointRow,
 * which is what would switch them to a read-only display — and the search
 * suggestion never carries coordinates to begin with (the
 * /camino-points/search response has no lat/lng field, so a linked point
 * keeps whatever coordinates it already had). Without this, a fixture
 * waypoint created once without coordinates (e.g. by an older version of
 * this helper) would stay coordinate-less forever: every later run's
 * exact-name-match search just re-links to that same shared record. Filling
 * coordinates here both seeds new waypoints correctly and self-heals any
 * already-broken shared ones — confirmed via the backend's create-camino
 * logic, which updates an existing point's lat/lng whenever both are
 * provided in the request.
 *
 * Country is selected by its `value` (the raw lowercase country name, e.g.
 * "france"), not by the translated display label — that keeps this helper
 * correct regardless of which locale the page happens to be in.
 */
export async function fillWaypointRow(
  page: Page,
  index: number,
  point: CaminoSeedPoint,
): Promise<void> {
  await page.getByLabel('Waypoint Name').nth(index).fill(point.name);
  await page.getByLabel('Country').nth(index).selectOption({ value: point.country });

  const useExisting = page.getByRole('button', {
    name: new RegExp(`Yes, use this existing waypoint.*${escapeRegExp(point.name)}`),
  });
  if (await useExisting.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await useExisting.click();
    await useExisting.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  }

  if (point.description) {
    await page.getByLabel('Waypoint Description (optional)').nth(index).fill(point.description);
  }
  await page.getByLabel('Latitude (optional)').nth(index).fill(String(point.lat));
  await page.getByLabel('Longitude (optional)').nth(index).fill(String(point.lng));
}

/**
 * Creates a camino through the real UI form, driven entirely by seed data
 * shaped like the repo's seed JSON files (see camino-seed-generator).
 *
 * `seedData` defaults to DEFAULT_CAMINO_SEED_DATA. Its `camino.name` is
 * treated as a uniqueName() label, not a final name — this function always
 * resolves it to a fresh unique value before filling the form, so callers
 * never need to remember to uniquify it themselves and can't accidentally
 * collide across runs. The full resolved seed data (unique name included)
 * is returned, augmented with the created camino's `id`/`slug`, so a test
 * can assert against e.g. `created.camino.name` or `created.points[0].name`
 * without re-typing what was actually submitted.
 *
 * A test that needs different data imports DEFAULT_CAMINO_SEED_DATA (or
 * ITALY_SEED_POINT) and overrides only what it needs:
 *
 *   await createMockCamino(page, {
 *     ...DEFAULT_CAMINO_SEED_DATA,
 *     points: [ITALY_SEED_POINT],
 *   });
 *
 * Leaves the page on the post-creation "Add pictures (optional)" step —
 * same as submitCaminoCreateForm — so callers that want to assert that step
 * or click "View camino" do so themselves with `created` already in hand.
 */
export async function createMockCamino(
  page: Page,
  seedData: CaminoSeedData = DEFAULT_CAMINO_SEED_DATA,
): Promise<CreatedMockCamino> {
  const resolved: CaminoSeedData = {
    camino: { ...seedData.camino, name: uniqueName(seedData.camino.name) },
    points: seedData.points.map((point) => ({ ...point })),
  };

  await page.goto('/caminos/new');
  await page.getByLabel('Camino Name').fill(resolved.camino.name);
  if (resolved.camino.description) {
    await page.getByLabel('Description (optional)', { exact: true }).fill(resolved.camino.description);
  }

  for (let i = 0; i < resolved.points.length; i++) {
    if (i > 0) {
      await page.getByRole('button', { name: 'Add Waypoint' }).click();
    }
    await fillWaypointRow(page, i, resolved.points[i]);
  }

  const createButton = page.getByRole('button', { name: 'Create Camino' });
  await expect(createButton, 'Create Camino button must become enabled').toBeEnabled({
    timeout: 15_000,
  });

  const created = await submitCaminoCreateForm(page);
  return {
    ...resolved,
    id: created.id,
    slug: created.slug,
    caminoPoints: created.caminoPoints,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: set a camino's verified flag via the backoffice toggle. Setting
// `verified` requires the owner role (PATCH /caminos/:id/verified is
// @Roles('owner') only — CLAUDE.md: "owner role is reserved exclusively for
// backoffice features"). Camino votes have no automatic effect on
// `verified`; this backoffice toggle is the only way to set it. The `page`
// passed in must already be authenticated as an owner.
// ─────────────────────────────────────────────────────────────────────────────

export async function setCaminoVerified(page: Page, caminoName: string): Promise<void> {
  await page.goto('/backoffice/caminos');

  const toggle = page.getByRole('switch', {
    name: `Toggle verification status for ${caminoName}`,
    exact: true,
  });
  await expect(
    toggle,
    `verified toggle for camino "${caminoName}" must be visible in the backoffice`,
  ).toBeVisible({ timeout: 10_000 });
  await toggle.click();
  await expect(
    toggle,
    `verified toggle for camino "${caminoName}" must be checked after clicking`,
  ).toHaveAttribute('aria-checked', 'true', { timeout: 10_000 });
}

export async function deleteCaminoViaUI(page: Page, caminoSlug: string): Promise<void> {
  await page.goto('/caminos');

  const card = page.locator(`li:has(a[href="/caminos/${caminoSlug}"])`);
  if (!(await card.isVisible({ timeout: 5_000 }).catch(() => false))) {
    console.error(
      `[cleanup] could not find camino card for slug "${caminoSlug}" — it may need manual deletion`,
    );
    return;
  }

  // Opening the actions menu right after a fresh Kinde login (the common
  // case here — afterAll logs in on a brand-new context solely to clean up)
  // was observed to occasionally not register the click on the very first
  // attempt, even though the trigger was already visible — a transient
  // settling issue right after the login redirect, not a real permissions
  // or timing problem (confirmed: retrying once always succeeds). One
  // reload-and-retry is a reasonable allowance for best-effort cleanup code
  // (unlike a test assertion, its job is to keep trying to succeed, not to
  // faithfully report a single attempt).
  const trigger = card.locator('[aria-label*="Actions for"]');
  const deleteMenuItem = page.getByRole('menuitem', { name: 'Delete camino' });
  let menuOpened = false;
  for (let attempt = 1; attempt <= 2 && !menuOpened; attempt++) {
    if (attempt > 1) await page.reload();
    if (!(await trigger.isVisible({ timeout: 3_000 }).catch(() => false))) continue;
    await trigger.click();
    menuOpened = await deleteMenuItem.isVisible({ timeout: 3_000 }).catch(() => false);
  }
  if (!menuOpened) {
    console.error(
      `[cleanup] "Delete camino" menu item not found for slug "${caminoSlug}" after retrying — it may need manual deletion`,
    );
    return;
  }
  await deleteMenuItem.click();

  const confirmBtn = page.getByRole('button', { name: 'Delete' });
  if (!(await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
    console.error(
      `[cleanup] delete confirmation dialog did not appear for slug "${caminoSlug}" — it may need manual deletion`,
    );
    return;
  }
  await confirmBtn.click();
  await confirmBtn.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});

  // router.refresh() (called by the list after a successful delete) is
  // unreliable in headless Chromium — the RSC streaming update can be
  // silently dropped, leaving the just-deleted card visible in the DOM even
  // though the backend record is already gone. A hard reload guarantees
  // fresh server data before this final, purely-informational check.
  await page.reload();
  const stillThere = await card.isVisible({ timeout: 3_000 }).catch(() => false);
  if (stillThere) {
    console.error(
      `[cleanup] camino for slug "${caminoSlug}" still appears in the list after confirming delete — verify manually`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: delete the mock waypoints a test created, via the backend API
// (there is no UI for this — waypoints have no delete button anywhere in the
// app). Call this AFTER deleteCaminoViaUI, not before: deleting the camino
// first removes its camino_point_order rows, which is what lets the backend
// confirm each waypoint is genuinely unused before allowing its deletion —
// camino deletion intentionally never touches camino_points itself (a
// waypoint can be shared by other caminos), so without this, every mock
// camino's waypoints (and the Stage/Accommodation rows attached to them)
// would silently accumulate forever. Best-effort: never throws, logs and
// moves on — a failed cleanup must not fail a test run.
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteMockWaypoints(
  page: Page,
  caminoPoints: readonly CreatedCaminoPoint[],
): Promise<void> {
  const accessToken = await getAccessToken(page);
  if (!accessToken) {
    console.error(
      '[cleanup] could not obtain an access token — mock waypoints may need manual deletion',
    );
    return;
  }

  for (const point of caminoPoints) {
    const res = await page.request
      .delete(`${API_URL}/camino-points/${point.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .catch(() => null);
    if (!res || !res.ok()) {
      console.error(
        `[cleanup] could not delete mock waypoint "${point.name}" (${point.id}), status ${
          res ? res.status() : 'request failed'
        } — it may need manual deletion`,
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: navigate to a camino by name from the caminos list.
// ─────────────────────────────────────────────────────────────────────────────

export async function navigateToCaminoWithName(
  caminoName: string,
  page: Page,
): Promise<string> {
  await page.goto('/caminos');

  const caminoCard = page.getByRole('heading', { name: caminoName, exact: true });
  await expect(caminoCard, `Camino with name "${caminoName}" must exist`).toBeVisible({
    timeout: 10_000,
  });
  await caminoCard.click();

  await page.waitForURL(
    (url) => /\/caminos\/[^/]+$/.test(url.pathname) && url.pathname !== '/caminos/new',
    { timeout: 10_000 },
  );
  return new URL(page.url()).pathname.split('/').pop()!;
}
