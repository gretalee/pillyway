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
 * E2E test for the reorder-conflict warning dialog on the camino update form.
 *
 * User-visible behavior under test
 * ---------------------------------
 * When a pilgrim reorders waypoints in a way that changes an existing,
 * already-enriched stage pairing, saving shows a warning dialog rather than
 * saving silently. From there they can either back out ("Go back", dialog
 * closes, nothing saved) or proceed anyway ("Save anyway", saves and
 * redirects). The test triggers the dialog twice — once per outcome — the
 * same way a pilgrim exploring the feature for the first time realistically
 * would.
 *
 * Data strategy
 * -------------
 * beforeAll creates a dedicated camino with 4 waypoints, reused by the
 * single test below. afterAll deletes it.
 *
 * Auth strategy
 * -------------
 * Requires E2E_PILGRIM_EMAIL / E2E_PILGRIM_PASSWORD throughout.
 */

test.describe('Pilgrim sees the reorder warning dialog', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60_000);

  let caminoId: string;
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
    caminoName = uniqueName('ReorderWarning');
    caminoId = await createCaminoWith4Points(page, caminoName);
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

  test('reordering waypoints triggers the warning dialog; "Go back" cancels, then re-triggering and choosing "Save anyway" saves', async ({
    page,
  }) => {
    await setLanguageToEnglish(page);
    await loginAs(page, process.env.E2E_PILGRIM_EMAIL!, process.env.E2E_PILGRIM_PASSWORD!);

    await page.goto(`/caminos/${caminoId}/update`);
    await expect(
      page.getByLabel('Camino Name'),
      'update form must be pre-populated with the current camino name',
    ).toHaveValue(caminoName, { timeout: 10_000 });

    // Move the first waypoint down, swapping positions 1 and 2 — this makes
    // stage 1's original point0→point1 pairing depart the sequence.
    const moveDownButtons = page.getByRole('button', { name: 'Move down' });
    await expect(
      moveDownButtons.first(),
      'a "Move down" control must be available for the first waypoint',
    ).toBeVisible({ timeout: 10_000 });
    await moveDownButtons.first().click();

    // ─── First pass: "Go back" cancels ──────────────────────────────────────

    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(
      page.getByRole('alertdialog'),
      'saving a reorder that departs an existing stage pairing must show the warning dialog',
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText('Waypoint order changed'),
      'dialog must explain that the waypoint order changed',
    ).toBeVisible();

    await page.getByRole('button', { name: 'Go back' }).click();
    await expect(
      page.getByRole('alertdialog'),
      '"Go back" must close the dialog without saving',
    ).toBeHidden();
    await expect(
      page,
      '"Go back" must leave the pilgrim on the update form, not navigate away',
    ).toHaveURL(`/caminos/${caminoId}/update`);

    // ─── Second pass: re-trigger and "Save anyway" confirms ────────────────

    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(
      page.getByRole('alertdialog'),
      'saving again with the same unresolved reorder must show the dialog again',
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Save anyway' }).click();
    await page.waitForURL(`/caminos/${caminoId}`, { timeout: 15_000 });
    await expect(
      page,
      '"Save anyway" must save and redirect to the camino detail page',
    ).toHaveURL(`/caminos/${caminoId}`);
  });
});
