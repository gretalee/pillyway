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
 * E2E test for viewing an accommodation detail page as guest vs. pilgrim.
 *
 * User-visible behavior under test
 * ---------------------------------
 * A guest can view an accommodation's detail page (name, type badge, a Back
 * link) but sees no "Edit accommodation" link. A logged-in pilgrim, viewing
 * the same page, does see the edit link.
 *
 * Data strategy
 * -------------
 * beforeAll creates a dedicated camino with 4 waypoints, resolves the first
 * waypoint's slug, and adds one accommodation to it. afterAll deletes the
 * camino (cascades to the accommodation).
 *
 * Auth strategy
 * -------------
 * The single test covers both an unauthenticated view and a pilgrim view.
 * Fixture setup and cleanup require E2E_PILGRIM_EMAIL / E2E_PILGRIM_PASSWORD.
 */

test.describe('View accommodation detail page', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60_000);

  let caminoId: string;
  let caminoName: string;
  let waypointSlug: string;
  let accommodationId: string;
  let accommodationName: string;

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

    caminoName = uniqueName('ViewAccommodationDetail');
    caminoId = await createCaminoWith4Points(page, caminoName);

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

    const accLink = page.getByRole('link', { name: accommodationName });
    await expect(accLink).toBeVisible({ timeout: 10_000 });
    const accHref = await accLink.getAttribute('href');
    expect(accHref, 'accommodation card must link to /accommodations/:id').toMatch(
      /^\/accommodations\//,
    );
    accommodationId = accHref!.replace('/accommodations/', '');

    await logout(page);
    await ctx.close();
  });

  test.afterAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(90_000);
    if (!caminoId) return;
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    if (!email || !password) return;

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await setLanguageToEnglish(page);
    await loginAs(page, email, password);
    try {
      await deleteCaminoViaUI(page, caminoId);
    } finally {
      await logout(page);
      await ctx.close();
    }
  });

  test('guest sees the accommodation but no edit link; a logged-in pilgrim does see the edit link', async ({
    page,
  }) => {
    await setLanguageToEnglish(page);
    const pageUrl = `/accommodations/${accommodationId}`;
    await page.goto(pageUrl);

    await expect(
      page.getByRole('heading', { name: accommodationName }),
      'accommodation name must be shown as the page heading',
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Hostel', { exact: true }), 'type badge must be visible').toBeVisible();
    await expect(page.getByRole('link', { name: 'Back' }), 'a Back link must be visible').toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Edit accommodation' }),
      'guest must see no Edit accommodation link',
    ).toBeHidden();

    await loginAs(page, process.env.E2E_PILGRIM_EMAIL!, process.env.E2E_PILGRIM_PASSWORD!);
    await page.goto(pageUrl);
    await expect(
      page.getByRole('link', { name: 'Edit accommodation' }),
      'a logged-in pilgrim must see the Edit accommodation link',
    ).toBeVisible({ timeout: 10_000 });
  });
});
