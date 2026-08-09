import { expect, test } from '@playwright/test';
import {
  createCaminoWith4Points,
  deleteCaminoViaUI,
  loginAs,
  logout,
  navigateToCaminoWithName,
  setLanguageToEnglish,
  uniqueName,
} from './helpers';

/**
 * E2E test for viewing camino stages as an unauthenticated guest.
 *
 * User-visible behavior under test
 * ---------------------------------
 * A guest can open a camino's stage list, click into a stage's detail page,
 * see no "Edit stage" link, navigate forward via the stage navigation
 * (previous disabled on stage 1, next available), and go back to the camino
 * detail page. Direct navigation to a stage's edit page redirects them away.
 *
 * Data strategy
 * -------------
 * beforeAll creates a dedicated camino with 4 waypoints (3 stages), so this
 * test never depends on whatever happens to already be seeded. afterAll
 * deletes it.
 *
 * Auth strategy
 * -------------
 * The test itself runs unauthenticated. Camino creation in beforeAll and
 * cleanup in afterAll require E2E_PILGRIM_EMAIL / E2E_PILGRIM_PASSWORD.
 */

test.describe('View stage as guest', () => {
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
    caminoName = uniqueName('ViewStageAsGuest');
    caminoSlug = (await createCaminoWith4Points(page, caminoName)).slug;
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

  test('guest views the stage list, opens a stage, sees no edit link, navigates via next/prev, and is redirected away from the edit page', async ({
    page,
  }) => {
    await setLanguageToEnglish(page);
    const id = await navigateToCaminoWithName(caminoName, page);
    await expect(page, 'must land on the camino detail page').toHaveURL(`/caminos/${id}`);

    await expect(
      page.getByRole('heading', { name: 'Stages' }),
      'detail page must show a Stages heading',
    ).toBeVisible({ timeout: 10_000 });
    const firstStageRow = page.locator('ol li').first();
    await expect(firstStageRow, 'at least one stage row must be visible').toBeVisible({
      timeout: 10_000,
    });

    const firstStageLink = page.locator('ol li a').first();
    await expect(firstStageLink, 'first stage row must be a link').toBeVisible({
      timeout: 10_000,
    });
    await firstStageLink.click();
    await page.waitForURL(/\/caminos\/[^/]+\/stages\/\d+$/, { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { level: 1 }),
      'stage detail heading must mention "Stage"',
    ).toContainText('Stage', { timeout: 10_000 });

    await expect(
      page.getByRole('link', { name: 'Edit stage' }),
      'guest must see no Edit stage link',
    ).toBeHidden();

    const nav = page.getByRole('navigation', { name: 'Stage navigation' });
    await expect(nav, 'stage navigation region must be visible').toBeVisible();
    await expect(
      nav.getByRole('button', { name: 'This is the starting point', disabled: true }).first(),
      'previous-stage control must be disabled on stage 1',
    ).toBeVisible();

    const nextLink = nav.getByRole('link');
    await expect(nextLink.first(), 'a next-stage link must be available').toBeVisible({
      timeout: 10_000,
    });
    await nextLink.first().click();
    await page.waitForURL(/\/caminos\/[^/]+\/stages\/2$/, { timeout: 10_000 });
    await expect(
      nav.getByRole('link'),
      'stage 2 navigation must offer both previous and next links',
    ).toHaveCount(2, { timeout: 10_000 });

    await page.getByRole('link', { name: 'Back to camino' }).click();
    await page.waitForURL(`/caminos/${id}`, { timeout: 10_000 });

    await page.goto(`/caminos/${id}/stages/1/edit`);
    await expect(
      page,
      'an unauthenticated visitor must be redirected away from the stage edit page',
    ).not.toHaveURL(`/caminos/${id}/stages/1/edit`);
  });
});
