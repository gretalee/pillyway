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
 * E2E test for a pilgrim adding an accommodation and a sight to a waypoint.
 *
 * User-visible behavior under test
 * ---------------------------------
 * A pilgrim sees "Add accommodation"/"Add sight" links on a waypoint page,
 * fills and submits each form, and the new entry appears on the waypoint
 * page after redirecting back.
 *
 * Data strategy
 * -------------
 * beforeAll creates a dedicated camino with 4 waypoints and reads the first
 * stage's start-point link to get a real waypoint slug. afterAll deletes
 * the camino (which cascades to any accommodation/sight added by the test).
 *
 * Auth strategy
 * -------------
 * Requires E2E_PILGRIM_EMAIL / E2E_PILGRIM_PASSWORD throughout.
 */

test.describe('Pilgrim adds accommodation and sight to a waypoint', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60_000);

  let caminoId: string;
  let caminoSlug: string;
  let caminoName: string;
  let waypointSlug: string;

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
    caminoName = uniqueName('PilgrimAddsPoi');
    const created = await createCaminoWith4Points(page, caminoName);
    caminoId = created.id;
    caminoSlug = created.slug;

    // Stage links use the camino's numeric id, not its slug.
    await page.goto(`/caminos/${caminoId}/stages/1`);
    const startLink = page.locator('dl dd a').first();
    await expect(startLink, 'stage 1 start point must be a link').toBeVisible({ timeout: 10_000 });
    const href = await startLink.getAttribute('href');
    expect(href, 'start point link must point to /waypoints/...').toMatch(/^\/waypoints\//);
    waypointSlug = href!.replace('/waypoints/', '');

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

  test('pilgrim adds an accommodation and a sight, both appearing on the waypoint page', async ({
    page,
  }) => {
    await setLanguageToEnglish(page);
    await loginAs(page, process.env.E2E_PILGRIM_EMAIL!, process.env.E2E_PILGRIM_PASSWORD!);

    // ─── Add accommodation ──────────────────────────────────────────────────

    await page.goto(`/waypoints/${waypointSlug}`);
    await expect(
      page.getByRole('link', { name: 'Add accommodation' }),
      'pilgrim must see an Add accommodation link',
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('link', { name: 'Add accommodation' }).click();
    await page.waitForURL(`/waypoints/${waypointSlug}/accommodations/new`, { timeout: 10_000 });

    const accName = `Test Hostel ${Date.now()}`;
    await page.getByLabel('Name').fill(accName);
    await page.getByLabel('Type').selectOption('hostel');
    await page.getByRole('button', { name: 'Add accommodation' }).click();
    await page.waitForURL(`/waypoints/${waypointSlug}`, { timeout: 15_000 });
    await expect(
      page.getByText(accName),
      'new accommodation must appear on the waypoint page',
    ).toBeVisible({ timeout: 10_000 });

    // ─── Add sight ───────────────────────────────────────────────────────────

    await page.getByRole('link', { name: 'Add sight' }).click();
    await page.waitForURL(`/waypoints/${waypointSlug}/sights/new`, { timeout: 10_000 });

    const sightName = `Test Sight ${Date.now()}`;
    await page.getByLabel('Name').fill(sightName);
    await page.getByRole('button', { name: 'Add sight' }).click();
    await page.waitForURL(`/waypoints/${waypointSlug}`, { timeout: 30_000 });
    await expect(
      page.getByText(sightName),
      'new sight must appear on the waypoint page',
    ).toBeVisible({ timeout: 10_000 });
  });
});
