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
 * E2E test for a pilgrim editing a stage's distance and description.
 *
 * User-visible behavior under test
 * ---------------------------------
 * A pilgrim opens a stage's edit page from its detail page, sets a distance
 * and description and saves (both appear on the detail page), clears the
 * distance and saves again (detail page shows "Distance not set"), and can
 * cancel an in-progress edit without it being saved.
 *
 * Data strategy
 * -------------
 * beforeAll creates a dedicated camino with 4 waypoints (3 stages), reused
 * by the single test below. afterAll deletes it.
 *
 * Auth strategy
 * -------------
 * Requires E2E_PILGRIM_EMAIL / E2E_PILGRIM_PASSWORD throughout.
 */

test.describe('Pilgrim edits stage details', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60_000);

  let caminoId: string;
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
    caminoName = uniqueName('PilgrimEditsStage');
    const created = await createCaminoWith4Points(page, caminoName);
    caminoId = created.id;
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

  test('pilgrim sets distance and description, clears the distance, then cancels an edit without saving', async ({
    page,
  }) => {
    await setLanguageToEnglish(page);
    await loginAs(page, process.env.E2E_PILGRIM_EMAIL!, process.env.E2E_PILGRIM_PASSWORD!);

    await page.goto(`/caminos/${caminoId}/stages/1`);
    await expect(
      page.getByRole('heading', { level: 1 }),
      'stage 1 detail heading must be visible',
    ).toContainText('Stage 1', { timeout: 10_000 });

    const editLink = page.getByRole('link', { name: 'Edit stage' });
    await expect(editLink, 'pilgrim must see an Edit stage link').toBeVisible({
      timeout: 10_000,
    });
    await editLink.click();
    await page.waitForURL(`/caminos/${caminoId}/stages/1/edit`, { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { level: 1 }),
      'edit page heading must mention "Edit Stage 1"',
    ).toContainText('Edit Stage 1', { timeout: 10_000 });

    // Start/end points are shown as read-only text, not editable fields.
    await expect(page.getByText('Start point'), 'start point label must be visible').toBeVisible();
    await expect(page.getByText('End point'), 'end point label must be visible').toBeVisible();
    await expect(
      page.getByLabel('Start point'),
      'start point must not be an editable field',
    ).toBeHidden();
    await expect(
      page.getByLabel('End point'),
      'end point must not be an editable field',
    ).toBeHidden();

    // ─── Save a distance and description ───────────────────────────────────

    await page.getByLabel('Distance (km)').fill('24.7');
    await page.getByLabel('Description (optional)').fill('A beautiful mountain stage.');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForURL(`/caminos/${caminoId}/stages/1`, { timeout: 15_000 });
    await expect(page.getByText('24.7 km'), 'saved distance must appear on the detail page').toBeVisible(
      { timeout: 10_000 },
    );
    await expect(
      page.getByText('A beautiful mountain stage.'),
      'saved description must appear on the detail page',
    ).toBeVisible();

    // ─── Clear the distance ─────────────────────────────────────────────────

    await editLink.click();
    await page.getByLabel('Distance (km)').fill('');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForURL(`/caminos/${caminoId}/stages/1`, { timeout: 15_000 });
    await expect(
      page.getByText('Distance not set'),
      'detail page must show "Distance not set" after clearing it',
    ).toBeVisible({ timeout: 10_000 });

    // ─── Cancel discards the edit ───────────────────────────────────────────

    await editLink.click();
    await page.getByLabel('Distance (km)').fill('99.9');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForURL(`/caminos/${caminoId}/stages/1`, { timeout: 10_000 });
    await expect(
      page.getByText('99.9 km'),
      'clicking Cancel must discard the unsaved distance change',
    ).toBeHidden();
  });
});
