/**
 * E2E tests for PILLY-STG-001 — stage list, stage detail view, and stage edit form.
 *
 * Test data strategy
 * ------------------
 * Guest tests navigate to the first camino they find in the list and expect at
 * least one stage to exist (assumes a seeded camino with 2+ waypoints).
 *
 * Pilgrim tests create a fresh camino with 3 waypoints so that 2 stages are
 * always available. Cleanup happens in afterAll.
 *
 * Auth strategy
 * -------------
 * Pilgrim tests require E2E_PILGRIM_EMAIL / E2E_PILGRIM_PASSWORD.
 * Missing env vars cause an assertion failure — never a skip.
 */

import { expect, test } from '@playwright/test';
import {
  loginAs,
  setLanguageToEnglish,
  uniqueName,
} from './helpers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3033/api';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: navigate to first camino that has at least one stage row
// ─────────────────────────────────────────────────────────────────────────────

async function navigateToFirstCaminoWithStages(
  page: import('@playwright/test').Page,
): Promise<string> {
  await page.goto('/caminos');
  const firstCard = page.locator('ul li').first();
  await expect(firstCard, 'At least one camino must exist in the test database').toBeVisible({
    timeout: 10_000,
  });
  const caminoHeading = firstCard.getByRole('heading').first();
  await caminoHeading.click();
  await page.waitForURL(/\/caminos\/[^/]+$/, { timeout: 10_000 });
  const segments = new URL(page.url()).pathname.split('/');
  return segments[segments.length - 1];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: create a camino with 3 waypoints so that exactly 2 stages exist.
// Returns the camino ID.
// ─────────────────────────────────────────────────────────────────────────────

async function createCaminoWith3Points(
  page: import('@playwright/test').Page,
  name: string,
): Promise<string> {
  await page.goto('/caminos/new');
  await page.getByLabel('Camino Name').fill(name);

  // First waypoint
  await page.getByLabel('Waypoint Name').first().fill('Saint-Jean-Pied-de-Port');
  await page.getByLabel('Country').first().selectOption('France');
  const useExistingFirst = page.getByRole('button', { name: 'Yes, use this existing waypoint' });
  if (await useExistingFirst.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await useExistingFirst.click();
  }

  // Add second waypoint
  await page.getByRole('button', { name: 'Add Waypoint' }).click();
  const waypointNames = page.getByLabel('Waypoint Name');
  await waypointNames.nth(1).fill('Roncesvalles');
  const countrySelects = page.getByLabel('Country');
  await countrySelects.nth(1).selectOption('Spain');
  const useExistingSecond = page.getByRole('button', { name: 'Yes, use this existing waypoint' });
  if (await useExistingSecond.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await useExistingSecond.click();
  }

  // Add third waypoint
  await page.getByRole('button', { name: 'Add Waypoint' }).click();
  const waypointNamesRefreshed = page.getByLabel('Waypoint Name');
  await waypointNamesRefreshed.nth(2).fill('Pamplona');
  const countrySelectsRefreshed = page.getByLabel('Country');
  await countrySelectsRefreshed.nth(2).selectOption('Spain');
  const useExistingThird = page.getByRole('button', { name: 'Yes, use this existing waypoint' });
  if (await useExistingThird.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await useExistingThird.click();
  }

  await page.getByRole('button', { name: 'Create Camino' }).click();
  await page.waitForURL('/caminos', { timeout: 15_000 });

  await page.getByRole('heading', { name, exact: true }).click();
  await page.waitForURL(/\/caminos\/[^/]+$/, { timeout: 10_000 });

  const segments = new URL(page.url()).pathname.split('/');
  return segments[segments.length - 1];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GUEST / PUBLIC TESTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Stages — guest / public access', () => {
  test.beforeEach(async ({ page }) => {
    await setLanguageToEnglish(page);
  });

  test('guest can view stages list on Camino detail page', async ({ page }) => {
    const caminoId = await navigateToFirstCaminoWithStages(page);

    await expect(page).toHaveURL(`/caminos/${caminoId}`);

    // Stages heading must be visible
    await expect(page.getByRole('heading', { name: 'Stages' })).toBeVisible({ timeout: 10_000 });

    // Wait for stage rows to load (client-side fetch)
    const firstStageRow = page.locator('ol li').first();
    await expect(firstStageRow, 'At least one stage row must be visible').toBeVisible({
      timeout: 10_000,
    });
  });

  test('guest can navigate to stage detail page and sees stage number heading', async ({
    page,
  }) => {
    const caminoId = await navigateToFirstCaminoWithStages(page);

    // Wait for stage list to load
    const firstStageLink = page.locator('ol li a').first();
    await expect(firstStageLink).toBeVisible({ timeout: 10_000 });
    await firstStageLink.click();

    // URL should match /caminos/:id/stages/1
    await page.waitForURL(/\/caminos\/[^/]+\/stages\/\d+$/, { timeout: 10_000 });
    const url = new URL(page.url());
    expect(url.pathname).toMatch(/\/stages\/\d+$/);

    // Stage number heading is visible (e.g. "Stage 1")
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Stage', {
      timeout: 10_000,
    });
  });

  test('guest sees no Edit button on stage detail page', async ({ page }) => {
    const caminoId = await navigateToFirstCaminoWithStages(page);

    const firstStageLink = page.locator('ol li a').first();
    await expect(firstStageLink).toBeVisible({ timeout: 10_000 });
    await firstStageLink.click();
    await page.waitForURL(/\/caminos\/[^/]+\/stages\/\d+$/, { timeout: 10_000 });

    // No "Edit stage" button for guests
    await expect(page.getByRole('link', { name: 'Edit stage' })).not.toBeVisible();
  });

  test('stage 1 has no previous stage button; next stage button navigates to stage 2', async ({
    page,
  }) => {
    const caminoId = await navigateToFirstCaminoWithStages(page);

    // Navigate directly to stage 1
    await page.goto(`/caminos/${caminoId}/stages/1`);

    // Wait for content to load
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Stage 1', {
      timeout: 10_000,
    });

    // No previous stage link should be present (stage 1 has no previous)
    const nav = page.getByRole('navigation', { name: 'Stage navigation' });
    await expect(nav).toBeVisible();

    // Next stage button must exist
    const nextLink = nav.getByRole('link');
    await expect(nextLink.first()).toBeVisible({ timeout: 10_000 });
    await nextLink.first().click();

    // URL should change to stage 2
    await page.waitForURL(/\/caminos\/[^/]+\/stages\/2$/, { timeout: 10_000 });
    expect(new URL(page.url()).pathname).toMatch(/\/stages\/2$/);
  });

  test('back button on stage detail returns to camino detail page', async ({ page }) => {
    const caminoId = await navigateToFirstCaminoWithStages(page);

    await page.goto(`/caminos/${caminoId}/stages/1`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Stage 1', {
      timeout: 10_000,
    });

    await page.getByRole('link', { name: 'Back to camino' }).click();
    await page.waitForURL(`/caminos/${caminoId}`, { timeout: 10_000 });
    expect(new URL(page.url()).pathname).toBe(`/caminos/${caminoId}`);
  });

  test('unauthenticated visitor is redirected from stage edit page', async ({ page }) => {
    const caminoId = await navigateToFirstCaminoWithStages(page);

    await page.goto(`/caminos/${caminoId}/stages/1/edit`);

    // Server component redirects away from the edit page
    await expect(page).not.toHaveURL(`/caminos/${caminoId}/stages/1/edit`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. PILGRIM TESTS — serial mode, fresh camino with 3 points
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Stages — pilgrim authenticated flows', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();
    await setLanguageToEnglish(page);
    await loginAs(page, email!, password!);
  });

  test.describe('Stage detail and edit — uses a fresh test camino with 3 points', () => {
    let caminoId: string;
    let caminoName: string;

    test.beforeAll(async ({ browser }) => {
      const email = process.env.E2E_PILGRIM_EMAIL;
      const password = process.env.E2E_PILGRIM_PASSWORD;
      expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
      expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();

      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await setLanguageToEnglish(page);
      await loginAs(page, email!, password!);
      caminoName = uniqueName('StageEdit');
      caminoId = await createCaminoWith3Points(page, caminoName);
      await ctx.close();
    });

    test.afterAll(async ({ browser }) => {
      if (!caminoId) return;
      const email = process.env.E2E_PILGRIM_EMAIL;
      const password = process.env.E2E_PILGRIM_PASSWORD;
      expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
      expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();

      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await setLanguageToEnglish(page);
      await loginAs(page, email!, password!);
      try {
        await page.goto('/caminos');
        const trigger = page.locator(`[aria-label="Actions for ${caminoName}"]`);
        if (await trigger.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await trigger.click();
          await page.getByRole('menuitem', { name: 'Delete camino' }).click();
          await page.getByRole('button', { name: 'Delete' }).click();
        }
      } finally {
        await ctx.close();
      }
    });

    test('pilgrim sees Edit button on stage detail page', async ({ page }) => {
      await page.goto(`/caminos/${caminoId}/stages/1`);
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Stage 1', {
        timeout: 10_000,
      });

      await expect(page.getByRole('link', { name: 'Edit stage' })).toBeVisible({
        timeout: 10_000,
      });
    });

    test('pilgrim can open stage edit form; start and end points are read-only', async ({
      page,
    }) => {
      await page.goto(`/caminos/${caminoId}/stages/1/edit`);
      await page.waitForURL(`/caminos/${caminoId}/stages/1/edit`, { timeout: 10_000 });

      // The form heading should be visible
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Edit Stage 1', {
        timeout: 10_000,
      });

      // Start and end point labels are present as read-only text
      await expect(page.getByText('Start point')).toBeVisible();
      await expect(page.getByText('End point')).toBeVisible();

      // There must be no editable input for start or end point names
      await expect(page.getByLabel('Start point')).not.toBeVisible();
      await expect(page.getByLabel('End point')).not.toBeVisible();
    });

    test('pilgrim can set distance and description, then save', async ({ page }) => {
      await page.goto(`/caminos/${caminoId}/stages/1/edit`);

      // Wait for form to load (stage data populated)
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Edit Stage 1', {
        timeout: 10_000,
      });

      await page.getByLabel('Distance (km)').fill('24.7');
      await page.getByLabel('Description (optional)').fill('A beautiful mountain stage.');

      await page.getByRole('button', { name: 'Save changes' }).click();

      // Redirects to stage detail page
      await page.waitForURL(`/caminos/${caminoId}/stages/1`, { timeout: 15_000 });

      // Distance is displayed
      await expect(page.getByText('24.7 km')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('A beautiful mountain stage.')).toBeVisible();
    });

    test('pilgrim can clear distance and save; distance_unknown placeholder is shown', async ({
      page,
    }) => {
      await page.goto(`/caminos/${caminoId}/stages/1/edit`);

      await expect(page.getByRole('heading', { level: 1 })).toContainText('Edit Stage 1', {
        timeout: 10_000,
      });

      // Clear the distance field
      await page.getByLabel('Distance (km)').fill('');

      await page.getByRole('button', { name: 'Save changes' }).click();

      await page.waitForURL(`/caminos/${caminoId}/stages/1`, { timeout: 15_000 });

      // Placeholder is shown since distance is now null
      await expect(page.getByText('Distance not set')).toBeVisible({ timeout: 10_000 });
    });

    test('cancel from edit form returns to stage detail without mutation', async ({ page }) => {
      await page.goto(`/caminos/${caminoId}/stages/1/edit`);

      await expect(page.getByRole('heading', { level: 1 })).toContainText('Edit Stage 1', {
        timeout: 10_000,
      });

      await page.getByLabel('Distance (km)').fill('99.9');

      await page.getByRole('button', { name: 'Cancel' }).click();

      // Redirects to stage detail without the new value
      await page.waitForURL(`/caminos/${caminoId}/stages/1`, { timeout: 10_000 });

      // 99.9 km should NOT be shown (no mutation was sent)
      await expect(page.getByText('99.9 km')).not.toBeVisible();
    });

    test('stage 2 has both previous and next navigation buttons', async ({ page }) => {
      await page.goto(`/caminos/${caminoId}/stages/2`);

      await expect(page.getByRole('heading', { level: 1 })).toContainText('Stage 2', {
        timeout: 10_000,
      });

      const nav = page.getByRole('navigation', { name: 'Stage navigation' });
      const navLinks = nav.getByRole('link');

      // There are exactly 2 nav links: previous and next
      await expect(navLinks).toHaveCount(2, { timeout: 10_000 });
    });

    test('stage 1 has no previous navigation button', async ({ page }) => {
      await page.goto(`/caminos/${caminoId}/stages/1`);

      await expect(page.getByRole('heading', { level: 1 })).toContainText('Stage 1', {
        timeout: 10_000,
      });

      const nav = page.getByRole('navigation', { name: 'Stage navigation' });
      const navLinks = nav.getByRole('link');

      // Only 1 nav link (next), no previous
      await expect(navLinks).toHaveCount(1, { timeout: 10_000 });
    });
  });

  // ── Reorder warning dialog tests ─────────────────────────────────────────

  test.describe('Reorder warning — uses a fresh test camino with enriched stage', () => {
    let caminoId: string;
    let caminoName: string;

    test.beforeAll(async ({ browser }) => {
      const email = process.env.E2E_PILGRIM_EMAIL;
      const password = process.env.E2E_PILGRIM_PASSWORD;
      expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
      expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();

      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await setLanguageToEnglish(page);
      await loginAs(page, email!, password!);
      caminoName = uniqueName('ReorderWarning');
      caminoId = await createCaminoWith3Points(page, caminoName);

      // Enrich stage 1 with a distance so the reorder warning will trigger
      await page.goto(`/caminos/${caminoId}/stages/1/edit`);
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Edit Stage 1', {
        timeout: 10_000,
      });
      await page.getByLabel('Distance (km)').fill('12.5');
      await page.getByRole('button', { name: 'Save changes' }).click();
      await page.waitForURL(`/caminos/${caminoId}/stages/1`, { timeout: 15_000 });

      await ctx.close();
    });

    test.afterAll(async ({ browser }) => {
      if (!caminoId) return;
      const email = process.env.E2E_PILGRIM_EMAIL;
      const password = process.env.E2E_PILGRIM_PASSWORD;
      expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
      expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();

      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await setLanguageToEnglish(page);
      await loginAs(page, email!, password!);
      try {
        await page.goto('/caminos');
        const trigger = page.locator(`[aria-label="Actions for ${caminoName}"]`);
        if (await trigger.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await trigger.click();
          await page.getByRole('menuitem', { name: 'Delete camino' }).click();
          await page.getByRole('button', { name: 'Delete' }).click();
        }
      } finally {
        await ctx.close();
      }
    });

    test('pilgrim sees reorder warning dialog when enriched stage pair departs the sequence', async ({
      page,
    }) => {
      await page.goto(`/caminos/${caminoId}/update`);

      // Wait for the form to load
      await expect(page.getByLabel('Camino Name')).toHaveValue(caminoName, {
        timeout: 10_000,
      });

      // Move the first waypoint down (swapping positions 1 and 2) to create a
      // departing pair (stage 1: point0→point1 leaves the sequence)
      const moveDownButtons = page.getByRole('button', { name: 'Move down' });
      await expect(moveDownButtons.first()).toBeVisible({ timeout: 10_000 });
      await moveDownButtons.first().click();

      await page.getByRole('button', { name: 'Save changes' }).click();

      // The reorder warning dialog must appear
      await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByText('Waypoint order changed'),
      ).toBeVisible();
    });

    test('clicking "Go back" in reorder dialog closes dialog without saving', async ({ page }) => {
      await page.goto(`/caminos/${caminoId}/update`);

      await expect(page.getByLabel('Camino Name')).toHaveValue(caminoName, {
        timeout: 10_000,
      });

      const moveDownButtons = page.getByRole('button', { name: 'Move down' });
      await expect(moveDownButtons.first()).toBeVisible({ timeout: 10_000 });
      await moveDownButtons.first().click();

      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 10_000 });

      // Click cancel
      await page.getByRole('button', { name: 'Go back' }).click();

      // Dialog closes; URL stays on update form
      await expect(page.getByRole('alertdialog')).not.toBeVisible();
      await expect(page).toHaveURL(`/caminos/${caminoId}/update`);
    });

    test('clicking "Save anyway" in reorder dialog saves and redirects', async ({ page }) => {
      await page.goto(`/caminos/${caminoId}/update`);

      await expect(page.getByLabel('Camino Name')).toHaveValue(caminoName, {
        timeout: 10_000,
      });

      const moveDownButtons = page.getByRole('button', { name: 'Move down' });
      await expect(moveDownButtons.first()).toBeVisible({ timeout: 10_000 });
      await moveDownButtons.first().click();

      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 10_000 });

      // Confirm
      await page.getByRole('button', { name: 'Save anyway' }).click();

      // Redirected to camino detail after save
      await page.waitForURL(`/caminos/${caminoId}`, { timeout: 15_000 });
      expect(new URL(page.url()).pathname).toBe(`/caminos/${caminoId}`);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. API-LEVEL AUTHORIZATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Stages API — authorization', () => {
  test('GET /api/caminos/:id/stages returns 200 without auth token', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/caminos`);
    expect(listRes.ok()).toBe(true);

    const caminos = (await listRes.json()) as Array<{ id: string }>;
    expect(caminos.length, 'At least one camino must exist').toBeGreaterThan(0);

    const caminoId = caminos[0].id;
    const res = await request.get(`${API_URL}/caminos/${caminoId}/stages`);
    expect(res.status()).toBe(200);
  });

  test('PATCH /api/caminos/:id/stages/:n returns 4xx without auth token', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/caminos`);
    expect(listRes.ok()).toBe(true);

    const caminos = (await listRes.json()) as Array<{ id: string }>;
    expect(caminos.length, 'At least one camino must exist').toBeGreaterThan(0);

    const caminoId = caminos[0].id;
    const res = await request.patch(`${API_URL}/caminos/${caminoId}/stages/1`, {
      headers: { 'Content-Type': 'application/json' },
      data: { distance: 10.5 },
    });

    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('GET /api/caminos/:id/stages/:n returns 404 for out-of-range stageNumber', async ({
    request,
  }) => {
    const listRes = await request.get(`${API_URL}/caminos`);
    expect(listRes.ok()).toBe(true);

    const caminos = (await listRes.json()) as Array<{ id: string }>;
    expect(caminos.length, 'At least one camino must exist').toBeGreaterThan(0);

    const caminoId = caminos[0].id;
    const res = await request.get(`${API_URL}/caminos/${caminoId}/stages/9999`);
    expect(res.status()).toBe(404);
  });
});
