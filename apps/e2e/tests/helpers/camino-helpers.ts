import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export interface CreatedCamino {
  id: string;
  slug: string;
}

export interface CaminoWaypointFixture {
  /** Waypoint name as typed into the "Waypoint Name" field. */
  name: string;
  /** Country display name, as shown in the "Country" <select>. */
  country: string;
  /** ISO country code, as rendered in the UI's countries-passed-through row. */
  countryCode: string;
  /**
   * Real-world coordinates, filled into the "Latitude"/"Longitude" fields on
   * creation. Required so CaminoRouteMap (which needs >=2 points with
   * coordinates) actually renders for fixture caminos — see the comment on
   * fillWaypointRow below for why this matters even for reused waypoints.
   */
  lat: number;
  lng: number;
}

export const CAMINO_FIXTURE_WAYPOINTS: readonly CaminoWaypointFixture[] = [
  { name: 'Saint-Jean-Pied-de-Port', country: 'France', countryCode: 'FR', lat: 43.1634, lng: -1.2377 },
  { name: 'Roncesvalles', country: 'Spain', countryCode: 'ES', lat: 43.0097, lng: -1.3197 },
  { name: 'Pamplona', country: 'Spain', countryCode: 'ES', lat: 42.8125, lng: -1.6458 },
  { name: 'Logroño', country: 'Spain', countryCode: 'ES', lat: 42.4627, lng: -2.4449 },
];

/** Matches the "FR · ES" countries-passed-through row for CAMINO_FIXTURE_WAYPOINTS. */
export const CAMINO_FIXTURE_COUNTRY_CODES = [
  ...new Set(CAMINO_FIXTURE_WAYPOINTS.map((wp) => wp.countryCode)),
].join(' · ');

/**
 * Clicks "Create Camino" and captures the created camino's id/slug directly
 * from the create API response — NOT from any later UI navigation.
 *
 * Why this matters: the form no longer redirects on success — it swaps in a
 * second "Add pictures (optional)" step within the same page, and only
 * pushes to the detail page once "View camino" is clicked. If a test's
 * beforeAll captured the id/slug only after that later navigation and
 * anything after creation failed (a flaky click, a slow page), the camino
 * would already exist in the database but the test would never learn its
 * identity — leaving it permanently orphaned, since afterAll cleanup can
 * only target a camino it knows the id/slug of. Capturing at the API-response
 * moment means cleanup stays possible no matter what happens afterward.
 */
async function submitCaminoCreateForm(page: Page): Promise<CreatedCamino> {
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
  const created = (await response.json()) as CreatedCamino;

  // Sanity check that the UI itself also recognizes the creation succeeded.
  await expect(
    page.getByRole('heading', { name: 'Add pictures (optional)' }),
    'the "Add pictures" step must appear after a successful camino creation',
  ).toBeVisible({ timeout: 15_000 });

  return created;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Fills one waypoint row's name, country, and coordinates, accepting the
 * "reuse existing waypoint" suggestion if it appears.
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
 */
async function fillWaypointRow(
  page: Page,
  index: number,
  waypoint: CaminoWaypointFixture,
): Promise<void> {
  await page.getByLabel('Waypoint Name').nth(index).fill(waypoint.name);
  await page.getByLabel('Country').nth(index).selectOption(waypoint.country);

  const useExisting = page.getByRole('button', {
    name: new RegExp(`Yes, use this existing waypoint.*${escapeRegExp(waypoint.name)}`),
  });
  if (await useExisting.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await useExisting.click();
    await useExisting.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  }

  await page.getByLabel('Latitude (optional)').nth(index).fill(String(waypoint.lat));
  await page.getByLabel('Longitude (optional)').nth(index).fill(String(waypoint.lng));
}

// ─── Helper: fill and submit the camino creation form ────────────────────────
// Uses a single waypoint (the first CAMINO_FIXTURE_WAYPOINTS entry) to keep
// setup minimal.
export async function createCaminoViaForm(
  page: Page,
  name: string,
): Promise<CreatedCamino> {
  await page.goto('/caminos/new');
  await page.getByLabel('Camino Name').fill(name);

  await fillWaypointRow(page, 0, CAMINO_FIXTURE_WAYPOINTS[0]);

  return submitCaminoCreateForm(page);
}

export async function createCaminoWith4Points(
  page: Page,
  name: string,
): Promise<CreatedCamino> {
  await page.goto('/caminos/new');
  await page.getByLabel('Camino Name').fill(name);

  for (let i = 0; i < CAMINO_FIXTURE_WAYPOINTS.length; i++) {
    if (i > 0) {
      await page.getByRole('button', { name: 'Add Waypoint' }).click();
    }
    await fillWaypointRow(page, i, CAMINO_FIXTURE_WAYPOINTS[i]);
  }

  // Wait for the form to be in a submittable state (background waypoint lookups finish)
  const createButton = page.getByRole('button', { name: 'Create Camino' });
  await expect(createButton).toBeEnabled({ timeout: 15_000 });

  return submitCaminoCreateForm(page);
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
