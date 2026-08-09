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
 * E2E test for viewing a waypoint detail page as an unauthenticated guest.
 *
 * User-visible behavior under test
 * ---------------------------------
 * A guest can open a waypoint's detail page and sees empty Accommodations
 * and Sights sections with no "Add" links, a stage's start/end points link
 * to their waypoint pages, and direct navigation to the add-accommodation
 * page redirects them away.
 *
 * Data strategy
 * -------------
 * beforeAll creates a dedicated camino with 4 waypoints and reads the first
 * stage's start-point link to get a real waypoint slug. afterAll deletes
 * the camino.
 *
 * Auth strategy
 * -------------
 * The test itself runs unauthenticated. Camino creation in beforeAll and
 * cleanup in afterAll require E2E_PILGRIM_EMAIL / E2E_PILGRIM_PASSWORD.
 */

test.describe('View waypoint as guest', () => {
  test.describe.configure({ mode: 'serial' });

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
    caminoName = uniqueName('ViewWaypointAsGuest');
    caminoSlug = (await createCaminoWith4Points(page, caminoName)).slug;

    await page.goto(`/caminos/${caminoSlug}/stages/1`);
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

  test('guest views an empty waypoint page, follows a stage link to it, and is redirected from the add-accommodation page', async ({
    page,
  }) => {
    await setLanguageToEnglish(page);

    await page.goto(`/waypoints/${waypointSlug}`);
    await expect(
      page.getByRole('heading', { level: 1 }),
      'waypoint page must show a heading',
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: 'Accommodations' }),
      'waypoint page must show an Accommodations section',
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Sights' }),
      'waypoint page must show a Sights section',
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Add accommodation' }),
      'guest must see no Add accommodation link',
    ).toBeHidden();
    await expect(
      page.getByRole('link', { name: 'Add sight' }),
      'guest must see no Add sight link',
    ).toBeHidden();

    await page.goto(`/caminos/${caminoSlug}/stages/1`);
    const startLink = page.locator('dl dd a').first();
    await expect(startLink, 'stage detail start point must be a link').toBeVisible({
      timeout: 10_000,
    });
    await expect(
      startLink,
      'stage detail start/end points must link to a waypoint page',
    ).toHaveAttribute('href', /^\/waypoints\//);

    await page.goto(`/waypoints/${waypointSlug}/accommodations/new`);
    await expect(
      page,
      'an unauthenticated visitor must be redirected away from the add-accommodation page',
    ).not.toHaveURL(`/waypoints/${waypointSlug}/accommodations/new`, { timeout: 10_000 });
  });
});
