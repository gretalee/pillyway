import { expect, test } from '@playwright/test';
import {
  createCaminoViaForm,
  deleteCaminoViaUI,
  loginAs,
  logout,
  setLanguageTo,
  uniqueName,
} from './helpers';

/**
 * E2E test for a pilgrim editing and deleting their own camino.
 *
 * User-visible behavior under test
 * ---------------------------------
 * A pilgrim opens the update form via the camino card's three-dots menu and
 * sees it pre-populated, renames the camino inline (both saving via Enter
 * and cancelling via Escape), renames it again via the full update form,
 * opens the delete confirmation and cancels it (camino stays), then opens
 * it again and confirms (camino is removed from the list).
 *
 * Data strategy
 * -------------
 * beforeAll creates one dedicated camino, reused and progressively renamed
 * by the single test below. The test itself deletes it as its final step;
 * afterAll's cleanup is then a no-op safety net (soft — it's fine if the
 * camino is already gone).
 *
 * Auth strategy
 * -------------
 * Requires E2E_PILGRIM_EMAIL / E2E_PILGRIM_PASSWORD throughout.
 */

test.describe('Pilgrim edits and deletes a camino', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60_000);

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
    await setLanguageTo(page, 'en');
    await loginAs(page, email!, password!);
    caminoName = uniqueName('PilgrimEditDelete');
    caminoSlug = (await createCaminoViaForm(page, caminoName)).slug;
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
    await setLanguageTo(page, 'en');
    await loginAs(page, email, password);
    try {
      // The test itself already deletes this camino as its final step — this
      // is a safety net for whenever it doesn't get that far.
      await deleteCaminoViaUI(page, caminoSlug);
    } finally {
      await logout(page);
      await ctx.close();
    }
  });

  test('pilgrim opens the update form, renames inline (save + cancel), renames via the full form, then cancels and confirms delete', async ({
    page,
  }) => {
    await setLanguageTo(page, 'en');
    await loginAs(
      page,
      process.env.E2E_PILGRIM_EMAIL!,
      process.env.E2E_PILGRIM_PASSWORD!,
    );

    // ─── Three-dots menu → update form, pre-populated ──────────────────────

    await page.goto('/caminos');
    const card = page.locator(`li:has(a[href="/caminos/${caminoSlug}"])`);
    await expect(card, 'test camino card must be visible in the list').toBeVisible({
      timeout: 10_000,
    });
    await card.locator('[aria-label*="Actions for"]').click();
    const changeCaminoItem = page.getByRole('menuitem', { name: 'Change camino data' });
    await expect(
      changeCaminoItem,
      '"Change camino data" menu item must be visible',
    ).toBeVisible({ timeout: 5_000 });
    await changeCaminoItem.click();
    await page.waitForURL(`/caminos/${caminoSlug}/update`, { timeout: 10_000 });
    await expect(
      page.getByRole('form', { name: 'Update Camino' }),
      'update form must be visible',
    ).toBeVisible();
    await expect(
      page.getByLabel('Camino Name'),
      'update form must be pre-populated with the current camino name',
    ).toHaveValue(caminoName);

    // ─── Inline edit: Enter saves ───────────────────────────────────────────

    await page.goto(`/caminos/${caminoSlug}`);
    await expect(
      page.getByRole('heading', { level: 1 }),
      'detail page heading must show the current camino name before inline editing',
    ).toContainText(caminoName, { timeout: 10_000 });

    let editButton = page.getByRole('button', { name: 'Edit camino name' });
    await editButton.click();
    let nameInput = page.getByRole('textbox', { name: 'Edit camino name' });
    await expect(
      nameInput,
      'inline name input must be focused when opened',
    ).toBeFocused();

    const nameAfterInlineSave = `${caminoName} (updated)`;
    await nameInput.fill(nameAfterInlineSave);
    await nameInput.press('Enter');
    await expect(
      page.getByRole('heading', { level: 1 }),
      'pressing Enter must save the inline edit and show the new name',
    ).toContainText(nameAfterInlineSave, { timeout: 8_000 });
    caminoName = nameAfterInlineSave;

    // ─── Inline edit: Escape cancels ────────────────────────────────────────

    editButton = page.getByRole('button', { name: 'Edit camino name' });
    await editButton.click();
    nameInput = page.getByRole('textbox', { name: 'Edit camino name' });
    await nameInput.fill('This should not be saved');
    await nameInput.press('Escape');
    await expect(
      nameInput,
      'pressing Escape must close the inline edit input',
    ).toBeHidden();
    await expect(
      page.getByRole('heading', { level: 1 }),
      'pressing Escape must restore the previous name, discarding the edit',
    ).toContainText(caminoName);

    // ─── Full update form ────────────────────────────────────────────────

    await page.goto(`/caminos/${caminoSlug}/update`);
    await expect(
      page.getByLabel('Camino Name'),
      'update form must show the current name',
    ).toHaveValue(caminoName, { timeout: 10_000 });
    const nameAfterFormUpdate = `${caminoName} Renamed`;
    await page.getByLabel('Camino Name').fill(nameAfterFormUpdate);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForURL(`/caminos/${caminoSlug}`, { timeout: 20_000 });
    await expect(
      page.getByRole('heading', { level: 1 }),
      'submitting the update form must redirect to the detail page with the new name',
    ).toContainText(nameAfterFormUpdate, { timeout: 8_000 });
    caminoName = nameAfterFormUpdate;

    // ─── Delete: Cancel leaves the camino in the list ──────────────────────

    await page.goto('/caminos');
    let menuTrigger = page.locator(`[aria-label="Actions for ${caminoName}"]`);
    await expect(
      menuTrigger,
      'action menu trigger must be visible on the card',
    ).toBeVisible({
      timeout: 10_000,
    });
    await menuTrigger.click();
    let deleteMenuItem = page.getByRole('menuitem', { name: 'Delete camino' });
    await expect(deleteMenuItem, 'Delete camino menu item must be visible').toBeVisible({
      timeout: 5_000,
    });
    await deleteMenuItem.click();
    await expect(
      page.getByRole('alertdialog'),
      'delete confirmation dialog must open',
    ).toBeVisible();
    await expect(
      page.getByText(`"${caminoName}"`),
      'delete dialog must reference the camino by name',
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(
      page.getByRole('alertdialog'),
      'dialog must close on Cancel',
    ).toBeHidden();
    await expect(
      page.getByRole('heading', { name: caminoName }),
      'camino must still be in the list after cancelling delete',
    ).toBeVisible();

    // ─── Delete: confirming removes the camino ─────────────────────────────

    menuTrigger = page.locator(`[aria-label="Actions for ${caminoName}"]`);
    await menuTrigger.click();
    deleteMenuItem = page.getByRole('menuitem', { name: 'Delete camino' });
    await expect(
      deleteMenuItem,
      'Delete camino menu item must be visible on the second attempt too',
    ).toBeVisible({ timeout: 5_000 });
    await deleteMenuItem.click();
    await expect(
      page.getByRole('alertdialog'),
      'delete confirmation dialog must open again',
    ).toBeVisible();
    await expect(
      page.getByText(`"${caminoName}"`),
      'delete dialog must reference the camino by its current name',
    ).toBeVisible();
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(
      page.getByRole('alertdialog'),
      'dialog must close once the delete request completes',
    ).not.toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: caminoName }),
      'camino must no longer be in the list after confirming delete',
    ).toBeHidden();
  });
});
