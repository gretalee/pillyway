import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

/**
 * Sets the locale cookie to English before any navigation so that all
 * subsequent page loads render in English, regardless of browser defaults.
 */
export async function setLanguageToEnglish(page: Page): Promise<void> {
  await page
    .context()
    .addCookies([{ name: 'pillyway-locale', value: 'en', url: BASE_URL }]);
}

/**
 * Logs in via Kinde from any test that needs an authenticated session.
 * Handles both the single-screen (email + password visible at once) and the
 * two-step (email → Continue → password) Kinde login flows.
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await setLanguageToEnglish(page);
  await page.goto('/api/auth/login');
  await page.waitForURL(/kinde\.com/, { timeout: 15_000 });

  const emailInput = page
    .getByRole('textbox', { name: /email/i })
    .or(page.locator('input[type="email"]'))
    .or(page.locator('input[name="email"]'))
    .first();
  await emailInput.fill(email);

  const passwordInput = page
    .getByRole('textbox', { name: /password/i })
    .or(page.locator('input[type="password"]'));

  const passwordVisible = await passwordInput
    .first()
    .isVisible()
    .catch(() => false);

  if (!passwordVisible) {
    const continueButton = page
      .getByRole('button', { name: /continue/i })
      .or(page.getByRole('button', { name: /next/i }))
      .first();
    await continueButton.click();
    await passwordInput.first().waitFor({ state: 'visible', timeout: 10_000 });
  }

  await passwordInput.first().fill(password);

  await page
    .getByRole('button', { name: /sign in|log in|continue/i })
    .last()
    .click();

  await page.waitForURL('/', { timeout: 20_000 });
}

export async function logout(page: Page): Promise<void> {
  await page.goto('/api/auth/logout');
  await page.waitForURL('/', { timeout: 10_000 });
}

// ─── Helper: unique test camino name ─────────────────────────────────────────
export function uniqueName(label: string): string {
  return `[E2E-${label}] ${Date.now()}`;
}

export interface CreatedCamino {
  id: string;
  slug: string;
}

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
      (res) => res.request().method() === 'POST' && new URL(res.url()).pathname === '/api/caminos',
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

// ─── Helper: fill and submit the camino creation form ────────────────────────
// Uses a single waypoint (the first CAMINO_FIXTURE_WAYPOINTS entry) to keep
// setup minimal.
export async function createCaminoViaForm(page: Page, name: string): Promise<CreatedCamino> {
  await page.goto('/caminos/new');
  await page.getByLabel('Camino Name').fill(name);

  const [firstWaypoint] = CAMINO_FIXTURE_WAYPOINTS;
  const waypointNameInput = page.getByLabel('Waypoint Name').first();
  await waypointNameInput.fill(firstWaypoint.name);
  const countrySelect = page.getByLabel('Country').first();
  await countrySelect.selectOption(firstWaypoint.country);

  const useExistingButton = page
    .getByRole('button', { name: /Yes, use this existing waypoint/ })
    .first();
  if (await useExistingButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await useExistingButton.click();
  }

  return submitCaminoCreateForm(page);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared fixture data for camino creation. Exported so tests can assert
// against the exact same values used to create the fixture (waypoint names,
// country codes) instead of re-typing them — a mismatch here would mean the
// helper and the test silently drift apart.
//
// 4 waypoints across 2 countries: exactly 3 stages exist, a route map
// renders (needs >=2 coordinates), and the verification section renders
// (needs >=3 points). Stage 2 is then a middle stage with both previous and
// next navigation links.
// ─────────────────────────────────────────────────────────────────────────────

export interface CaminoWaypointFixture {
  /** Waypoint name as typed into the "Waypoint Name" field. */
  name: string;
  /** Country display name, as shown in the "Country" <select>. */
  country: string;
  /** ISO country code, as rendered in the UI's countries-passed-through row. */
  countryCode: string;
}

export const CAMINO_FIXTURE_WAYPOINTS: readonly CaminoWaypointFixture[] = [
  { name: 'Saint-Jean-Pied-de-Port', country: 'France', countryCode: 'FR' },
  { name: 'Roncesvalles', country: 'Spain', countryCode: 'ES' },
  { name: 'Pamplona', country: 'Spain', countryCode: 'ES' },
  { name: 'Logroño', country: 'Spain', countryCode: 'ES' },
];

/** Matches the "FR · ES" countries-passed-through row for CAMINO_FIXTURE_WAYPOINTS. */
export const CAMINO_FIXTURE_COUNTRY_CODES = [
  ...new Set(CAMINO_FIXTURE_WAYPOINTS.map((wp) => wp.countryCode)),
].join(' · ');

export async function createCaminoWith4Points(page: Page, name: string): Promise<CreatedCamino> {
  await page.goto('/caminos/new');
  await page.getByLabel('Camino Name').fill(name);

  for (let i = 0; i < CAMINO_FIXTURE_WAYPOINTS.length; i++) {
    if (i > 0) {
      await page.getByRole('button', { name: 'Add Waypoint' }).click();
    }

    const { name: wpName, country } = CAMINO_FIXTURE_WAYPOINTS[i];
    await page.getByLabel('Waypoint Name').nth(i).fill(wpName);
    await page.getByLabel('Country').nth(i).selectOption(country);

    // Accept an existing waypoint if the suggestion card appears. Its
    // accessible name interpolates the waypoint name (e.g. "Yes, use this
    // existing waypoint: Roncesvalles"), so match by substring, not exact.
    const useExisting = page
      .getByRole('button', { name: /Yes, use this existing waypoint/ })
      .first();
    if (await useExisting.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await useExisting.click();
      await useExisting.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    }
  }

  // Wait for the form to be in a submittable state (background waypoint lookups finish)
  const createButton = page.getByRole('button', { name: 'Create Camino' });
  await expect(createButton).toBeEnabled({ timeout: 15_000 });

  return submitCaminoCreateForm(page);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: delete a test camino via the UI, identified by slug (matches the
// list page's card hrefs, /caminos/<slug> — camino detail pages route by
// slug, not id). Using the slug (not the name) makes cleanup robust even
// when the camino's name was changed during the test run, or a test failed
// mid-rename.
//
// All interactions are soft (never throws) — a failed cleanup must not fail
// a test run — but every failure point logs loudly via console.error, so an
// orphaned test camino is at least visible for manual follow-up rather than
// silently lost.
// ─────────────────────────────────────────────────────────────────────────────
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

export async function navigateToCaminoWithName(caminoName: string, page: Page): Promise<string> {
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
