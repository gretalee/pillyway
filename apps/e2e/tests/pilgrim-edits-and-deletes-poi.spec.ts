import { expect, test } from '@playwright/test';
import {
  createCaminoWith4Points,
  deleteCaminoViaUI,
  loginAs,
  logout,
  setLanguageToEnglish,
  uniqueName,
} from './helpers';

/**
 * E2E test for a pilgrim editing and deleting an accommodation and a sight.
 *
 * User-visible behavior under test
 * ---------------------------------
 * A pilgrim edits an accommodation's name (change visible on the waypoint
 * page), edits a sight's name (same), then deletes the accommodation and
 * the sight — each disappearing from the waypoint page after a hard reload
 * (router.refresh() alone is unreliable in headless Chromium for this).
 *
 * Data strategy
 * -------------
 * beforeAll creates a dedicated camino with 4 waypoints, resolves the first
 * waypoint's slug, and adds one accommodation and one sight to it. afterAll
 * deletes the camino (cascades to both POIs, in case the test itself
 * didn't reach the delete steps).
 *
 * Auth strategy
 * -------------
 * Requires E2E_PILGRIM_EMAIL / E2E_PILGRIM_PASSWORD throughout.
 */

test.describe('Pilgrim edits and deletes accommodation and sight', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60_000);

  let caminoId: string;
  let caminoSlug: string;
  let caminoName: string;
  let waypointSlug: string;
  let accommodationName: string;
  let sightName: string;

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(120_000);
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await setLanguageToEnglish(page);
    await loginAs(page, email!, password!);

    caminoName = uniqueName('PilgrimEditsDeletesPoi');
    const created = await createCaminoWith4Points(page, caminoName);
    caminoId = created.id;
    caminoSlug = created.slug;

    // Stage links use the camino's numeric id, not its slug.
    await page.goto(`/caminos/${caminoId}/stages/1`);
    const startLink = page.locator('dl dd a').first();
    await expect(startLink).toBeVisible({ timeout: 10_000 });
    const href = await startLink.getAttribute('href');
    expect(href, 'start point must link to /waypoints/...').toMatch(/^\/waypoints\//);
    waypointSlug = href!.replace('/waypoints/', '');

    accommodationName = uniqueName('Hostel');
    await page.goto(`/waypoints/${waypointSlug}/accommodations/new`);
    await page.getByLabel('Name').fill(accommodationName);
    await page.getByLabel('Type').selectOption('hostel');
    await page.getByRole('button', { name: 'Add accommodation' }).click();
    await page.waitForURL(`/waypoints/${waypointSlug}`, { timeout: 15_000 });

    sightName = uniqueName('Cathedral');
    await page.goto(`/waypoints/${waypointSlug}/sights/new`);
    await page.getByLabel('Name').fill(sightName);
    await page.getByRole('button', { name: 'Add sight' }).click();
    await page.waitForURL(`/waypoints/${waypointSlug}`, { timeout: 15_000 });
    await expect(
      page.getByText(sightName),
      'fixture sight must appear on the waypoint page before the test runs',
    ).toBeVisible({ timeout: 10_000 });

    await logout(page);
    await ctx.close();
  });

  test.afterAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(90_000);
    if (!caminoSlug) return;
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    if (!email || !password) return;

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await setLanguageToEnglish(page);
    await loginAs(page, email, password);
    try {
      await deleteCaminoViaUI(page, caminoSlug);
    } finally {
      await logout(page);
      await ctx.close();
    }
  });

  test('pilgrim edits the accommodation name, edits the sight name, then deletes both', async ({
    page,
  }) => {
    await setLanguageToEnglish(page);
    await loginAs(page, process.env.E2E_PILGRIM_EMAIL!, process.env.E2E_PILGRIM_PASSWORD!);

    // ─── Edit accommodation ─────────────────────────────────────────────────

    await page.goto(`/waypoints/${waypointSlug}`);
    const editAccommodationLink = page
      .locator('div')
      .filter({ has: page.getByRole('link', { name: accommodationName, exact: true }) })
      .getByRole('link', { name: 'Edit accommodation' })
      .first();
    await expect(
      editAccommodationLink,
      'Edit accommodation link must be visible for the test accommodation',
    ).toBeVisible({ timeout: 10_000 });
    await editAccommodationLink.click();
    await page.waitForURL(/\/accommodations\/[^/]+\/edit$/, { timeout: 10_000 });

    accommodationName = `${accommodationName} (edited)`;
    await page.getByLabel('Name').fill(accommodationName);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForURL(`/waypoints/${waypointSlug}`, { timeout: 30_000 });
    await expect(
      page.getByText(accommodationName),
      'edited accommodation name must appear on the waypoint page',
    ).toBeVisible({ timeout: 10_000 });

    // ─── Edit sight ──────────────────────────────────────────────────────────

    const editSightLink = page
      .locator('div')
      .filter({ has: page.getByText(sightName, { exact: true }) })
      .getByRole('link', { name: 'Edit sight' })
      .first();
    await expect(
      editSightLink,
      `Edit sight link for ${sightName} must be visible`,
    ).toBeVisible({ timeout: 10_000 });
    await editSightLink.click();
    await page.waitForURL(/\/sights\/[^/]+\/edit$/, { timeout: 10_000 });

    sightName = `${sightName} (edited)`;
    await page.getByLabel('Name').fill(sightName);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForURL(`/waypoints/${waypointSlug}`, { timeout: 15_000 });
    await expect(
      page.getByText(sightName),
      'edited sight name must appear on the waypoint page',
    ).toBeVisible({ timeout: 10_000 });

    // ─── Delete accommodation ────────────────────────────────────────────────

    const deleteAccommodationBtn = page
      .locator('div')
      .filter({ has: page.getByRole('link', { name: accommodationName, exact: true }) })
      .getByRole('button', { name: 'Delete accommodation' })
      .first();
    await expect(deleteAccommodationBtn).toBeVisible({ timeout: 10_000 });
    await deleteAccommodationBtn.click();

    const accDialog = page.getByRole('alertdialog');
    await expect(accDialog, 'delete confirmation dialog must open').toBeVisible({
      timeout: 5_000,
    });
    await accDialog.getByRole('button', { name: 'Delete' }).click();
    // Dialog closes only on DELETE success — confirms the API call completed.
    await expect(accDialog, 'dialog must close once the delete request completes').not.toBeVisible({
      timeout: 15_000,
    });

    // router.refresh() is unreliable in headless Chromium here: the RSC
    // streaming update can be silently dropped. A hard reload guarantees
    // fresh server data and is the authoritative check that it was deleted.
    await page.reload();
    await expect(
      page.getByText(accommodationName, { exact: true }),
      'deleted accommodation must no longer appear on the waypoint page',
    ).toHaveCount(0, { timeout: 10_000 });

    // ─── Delete sight ────────────────────────────────────────────────────────

    const deleteSightBtn = page
      .locator('div')
      .filter({ has: page.getByText(sightName, { exact: true }) })
      .getByRole('button', { name: 'Delete sight' })
      .first();
    await expect(deleteSightBtn).toBeVisible({ timeout: 10_000 });
    await deleteSightBtn.click();

    const sightDialog = page.getByRole('alertdialog');
    await expect(sightDialog).toBeVisible({ timeout: 5_000 });
    await sightDialog.getByRole('button', { name: 'Delete' }).click();
    await expect(sightDialog).not.toBeVisible({ timeout: 15_000 });

    await page.reload();
    await expect(
      page.getByRole('heading', { name: sightName }),
      'deleted sight must no longer appear on the waypoint page',
    ).not.toBeVisible({ timeout: 10_000 });
  });
});
