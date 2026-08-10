import { expect, test } from '@playwright/test';
import {
  CAMINO_FIXTURE_COUNTRY_CODES,
  CAMINO_FIXTURE_WAYPOINTS,
  createCaminoWith4Points,
  deleteCaminoViaUI,
  loginAs,
  logout,
  setLanguageToEnglish,
  uniqueName,
} from './helpers';

/**
 * E2E test for viewing a camino as an unauthenticated guest.
 *
 * User-visible behavior under test
 * ---------------------------------
 * A guest can open a camino's detail page and see: the name, the countries
 * it passes through, its description (or the fallback text when none is
 * set), the stage list, the GPX data section (with its own empty-state and
 * no upload affordance), and the verification/voting section (with a
 * prompt to log in before voting) — but no edit affordances anywhere
 * (no action menu on the list, no "Edit waypoints" link, no GPX upload
 * button), and direct navigation to the update page redirects them away.
 *
 * Data strategy
 * -------------
 * beforeAll logs in as a pilgrim ONLY to create the fixture — guests can't
 * create caminos themselves, so a pilgrim session is unavoidable for setup.
 * The test body itself runs fully logged out. createCaminoWith4Points is
 * used (not the single-waypoint createCaminoViaForm) specifically so the
 * fixture has 2 countries, 3 real stages, and enough points to render the
 * verification section — the richer content this test needs to check.
 * afterAll deletes it via the UI (best-effort, but logs loudly on failure —
 * see deleteCaminoViaUI).
 *
 * The route map (`getByRole('img', { name: 'Routenkarte' })`) is asserted
 * too. It renders once a camino has >=2 points with coordinates, which
 * CAMINO_FIXTURE_WAYPOINTS' lat/lng values (filled by
 * createCaminoWith4Points) guarantee.
 *
 * Auth strategy
 * -------------
 * The test itself runs unauthenticated. Camino creation in beforeAll and
 * cleanup in afterAll require E2E_PILGRIM_EMAIL / E2E_PILGRIM_PASSWORD.
 */

test.describe('View camino as guest', () => {
  test.describe.configure({ mode: 'serial' });

  let caminoSlug: string;
  let caminoName: string;

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(90_000);
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await setLanguageToEnglish(page);
    await loginAs(page, email!, password!);
    caminoName = uniqueName('ViewAsGuest');
    const created = await createCaminoWith4Points(page, caminoName);
    caminoSlug = created.slug;
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

  test('guest sees full camino detail content but no edit affordances, and is redirected away from the update page', async ({
    page,
  }) => {
    await setLanguageToEnglish(page);

    // ─── No action menu anywhere on the caminos list ───────────────────────

    await page.goto('/caminos');
    const card = page
      .locator('ul li')
      .filter({ has: page.getByRole('heading', { name: caminoName, exact: true }) });
    await expect(card, 'the test camino must appear in the caminos list').toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.locator('[aria-label*="Actions for"]'),
      'guest must see no three-dots action menu on any camino card',
    ).toHaveCount(0);

    await card.getByRole('heading').first().click();
    await page.waitForURL(`/caminos/${caminoSlug}`, { timeout: 10_000 });

    // ─── Name, countries, description ──────────────────────────────────────

    await expect(
      page.getByRole('heading', { level: 1 }),
      'detail page heading must show the camino name',
    ).toContainText(caminoName);
    await expect(
      page.getByText(CAMINO_FIXTURE_COUNTRY_CODES),
      'countries row must list the two countries the camino passes through',
    ).toBeVisible();
    await expect(
      page.getByText('No description provided.'),
      'description section must show the fallback text when no description is set',
    ).toBeVisible();

    // ─── Stages: heading, map, and the full stage list ─────────────────────

    await expect(
      page.getByRole('heading', { name: 'Stages' }),
      'detail page must show a Stages heading',
    ).toBeVisible();
    await expect(
      page.getByRole('img', { name: 'Routenkarte' }),
      'route map must render for a camino with >=2 waypoints that have coordinates',
    ).toBeVisible({ timeout: 10_000 });
    const stageRows = page.locator('ol li');
    await expect(
      stageRows,
      'all 3 stages between the 4 waypoints must be listed',
    ).toHaveCount(3);
    for (const { name: waypointName } of CAMINO_FIXTURE_WAYPOINTS) {
      await expect(
        page.locator('ol').getByText(waypointName, { exact: false }).first(),
        `stage list must mention waypoint "${waypointName}"`,
      ).toBeVisible();
    }
    await expect(
      page.getByRole('link', { name: 'Edit waypoints' }),
      'guest must see no Edit waypoints link',
    ).toBeHidden();

    // ─── GPX data section ───────────────────────────────────────────────────

    const gpxButton = page.getByRole('button', { name: 'GPX Data' });
    await expect(gpxButton, 'GPX Data button must be visible').toBeVisible();
    await gpxButton.click();
    const gpxDialog = page.getByRole('dialog');
    await expect(gpxDialog, 'GPX modal must open').toBeVisible();
    await expect(
      gpxDialog.getByText('No GPX files uploaded yet.'),
      'GPX modal must show its empty state for a camino with no GPX files',
    ).toBeVisible();
    await expect(
      gpxDialog.getByRole('button', { name: 'Upload GPX' }),
      'guest must see no GPX upload button',
    ).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(gpxDialog, 'GPX modal must close').toBeHidden();

    // ─── Verification / voting section ──────────────────────────────────────

    await expect(
      page.getByRole('heading', { name: 'Verified Route' }),
      'Verified Route section heading must be visible',
    ).toBeVisible();
    await expect(
      page.getByText('0 Yes'),
      'vote count must show 0 Yes for a fresh camino',
    ).toBeVisible();
    await expect(
      page.getByText('0 No'),
      'vote count must show 0 No for a fresh camino',
    ).toBeVisible();
    await expect(
      page.getByText('Log in to verify this route.'),
      'guest must be prompted to log in before voting',
    ).toBeVisible();

    // ─── Direct navigation to the update page redirects a guest away ──────

    await page.goto(`/caminos/${caminoSlug}/update`);
    await expect(
      page,
      'an unauthenticated visitor must be redirected away from the update page',
    ).not.toHaveURL(`/caminos/${caminoSlug}/update`);
  });
});
