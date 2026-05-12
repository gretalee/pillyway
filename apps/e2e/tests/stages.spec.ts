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
  createCaminoWith4Points,
  loginAs,
  logout,
  navigateToCaminoWithName,
  setLanguageToEnglish,
  uniqueName,
} from './helpers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3033/api';

test.describe('Stages — E2E tests for stage list, detail, and edit flows', () => {
  let caminoName: string;
  let caminoId: string;

  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ browser }, testInfo) => {
    // Create a fresh camino with 4 points (3 stages) for the pilgrim tests.
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await setLanguageToEnglish(page);
    await loginAs(page, email!, password!);
    caminoName = uniqueName('StageEdit');
    caminoId = await createCaminoWith4Points(page, caminoName);
    await logout(page);
    await ctx.close();
  });

  test.afterAll(async ({ browser }, testInfo) => {
    // Cleanup the test camino created in beforeAll.
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
        const deleteMenuItem = page.getByRole('menuitem', { name: 'Delete camino' });
        if (await deleteMenuItem.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await deleteMenuItem.click();
          await page.getByRole('button', { name: 'Delete' }).click();
        }
      }
    } finally {
      await logout(page);
      await ctx.close();
    }
  });

  test('guest can view stages list on Camino detail page', async ({ page }) => {
    const caminoId = await navigateToCaminoWithName(caminoName, page);

    await expect(page).toHaveURL(`/caminos/${caminoId}`);
    await expect(page.getByRole('heading', { name: 'Stages' })).toBeVisible({
      timeout: 10_000,
    });
    const firstStageRow = page.locator('ol li').first();
    await expect(firstStageRow, 'At least one stage row must be visible').toBeVisible({
      timeout: 10_000,
    });

    const firstStageLink = page.locator('ol li a').first();
    await expect(firstStageLink).toBeVisible({ timeout: 10_000 });
    await firstStageLink.click();
    await page.waitForURL(/\/caminos\/[^/]+\/stages\/\d+$/, { timeout: 10_000 });
    const url = new URL(page.url());
    expect(url.pathname).toMatch(/\/stages\/\d+$/);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Stage', {
      timeout: 10_000,
    });

    // no Edit button for guests
    await expect(page.getByRole('link', { name: 'Edit stage' })).not.toBeVisible();

    // back stage button should be disabled or not a link
    const nav = page.getByRole('navigation', { name: 'Stage navigation' });
    await expect(nav).toBeVisible();
    const prevLink = nav
      .getByRole('button', { name: 'This is the starting point', disabled: true })
      .first();
    await expect(prevLink).toBeVisible();

    // Next stage button must exist
    const nextLink = nav.getByRole('link');
    await expect(nextLink.first()).toBeVisible({ timeout: 10_000 });
    await nextLink.first().click();

    // URL should change to stage 2
    await page.waitForURL(/\/caminos\/[^/]+\/stages\/2$/, { timeout: 10_000 });
    expect(new URL(page.url()).pathname).toMatch(/\/stages\/2$/);

    const navLinks = nav.getByRole('link');
    await expect(navLinks).toHaveCount(2, { timeout: 10_000 });

    // Back to camino detail page via back button
    await page.getByRole('link', { name: 'Back to camino' }).click();
    await page.waitForURL(`/caminos/${caminoId}`, { timeout: 10_000 });
    expect(new URL(page.url()).pathname).toBe(`/caminos/${caminoId}`);
  });

  test('unauthenticated visitor is redirected from stage edit page', async ({ page }) => {
    const caminoId = await navigateToCaminoWithName(caminoName, page);
    await page.goto(`/caminos/${caminoId}/stages/1/edit`);
    await expect(page).not.toHaveURL(`/caminos/${caminoId}/stages/1/edit`);
  });

  // Logged-in tests
  // =================
  test('logged-in pilgrim can navigate to stage edit page from stage detail page', async ({
    page,
  }) => {
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();
    await setLanguageToEnglish(page);
    await loginAs(page, email!, password!);

    await page.goto(`/caminos/${caminoId}/stages/1`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Stage 1', {
      timeout: 10_000,
    });

    const editLink = page.getByRole('link', { name: 'Edit stage' });
    await expect(editLink).toBeVisible({
      timeout: 10_000,
    });
    await editLink.click();
    await page.waitForURL(`/caminos/${caminoId}/stages/1/edit`, { timeout: 10_000 });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Edit Stage 1', {
      timeout: 10_000,
    });

    await expect(page.getByText('Start point')).toBeVisible();
    await expect(page.getByText('End point')).toBeVisible();
    await expect(page.getByLabel('Start point')).not.toBeVisible();
    await expect(page.getByLabel('End point')).not.toBeVisible();

    await page.getByLabel('Distance (km)').fill('24.7');
    await page.getByLabel('Description (optional)').fill('A beautiful mountain stage.');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await page.waitForURL(`/caminos/${caminoId}/stages/1`, { timeout: 15_000 });
    await expect(page.getByText('24.7 km')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('A beautiful mountain stage.')).toBeVisible();

    // Clear the distance field
    await editLink.click();
    await page.getByLabel('Distance (km)').fill('');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForURL(`/caminos/${caminoId}/stages/1`, { timeout: 15_000 });
    await expect(page.getByText('Distance not set')).toBeVisible({ timeout: 10_000 });

    // Test cancel button
    await editLink.click();
    await page.getByLabel('Distance (km)').fill('99.9');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForURL(`/caminos/${caminoId}/stages/1`, { timeout: 10_000 });
    await expect(page.getByText('99.9 km')).not.toBeVisible();
  });

  test('pilgrim sees reorder warning dialog when enriched stage pair departs the sequence', async ({
    page,
  }) => {
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();
    await setLanguageToEnglish(page);
    await loginAs(page, email!, password!);
    await page.goto(`/caminos/${caminoId}/update`);
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
    await expect(page.getByText('Waypoint order changed')).toBeVisible();
  });

  test('clicking "Go back" in reorder dialog closes dialog without saving', async ({
    page,
  }) => {
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();
    await setLanguageToEnglish(page);
    await loginAs(page, email!, password!);
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

  test('clicking "Save anyway" in reorder dialog saves and redirects', async ({
    page,
  }) => {
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();
    await setLanguageToEnglish(page);
    await loginAs(page, email!, password!);
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

// ─────────────────────────────────────────────────────────────────────────────
// API-LEVEL AUTHORIZATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Stages API — authorization', () => {
  test('GET /api/caminos/:id/stages returns 200 without auth token', async ({
    request,
  }) => {
    const listRes = await request.get(`${API_URL}/caminos`);
    expect(listRes.ok()).toBe(true);

    const caminos = (await listRes.json()) as Array<{ id: string }>;
    expect(caminos.length, 'At least one camino must exist').toBeGreaterThan(0);

    const caminoId = caminos[0].id;
    const res = await request.get(`${API_URL}/caminos/${caminoId}/stages`);
    expect(res.status()).toBe(200);
  });

  test('PATCH /api/caminos/:id/stages/:n returns 4xx without auth token', async ({
    request,
  }) => {
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
