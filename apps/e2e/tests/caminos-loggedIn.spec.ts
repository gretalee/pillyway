import { expect, test } from '@playwright/test';
import {
  type CreatedCamino,
  createCaminoWith4Points,
  deleteCaminoViaUI,
  loginAs,
  logout,
  setLanguageTo,
  uniqueName,
} from './helpers';

/**
 * E2E test for the full pilgrim-authenticated camino lifecycle: create,
 * view in the list, edit (inline, full form, stage details), add waypoint
 * content, resolve a reorder conflict, and delete.
 */

test.describe('Pilgrim creates, edits, and deletes a camino', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  let caminoSlug: string | undefined;
  let caminoName: string;

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

  test('pilgrim creates a camino, edits it, adds waypoint content, resolves a reorder conflict, and deletes it', async ({
    page,
  }) => {
    await setLanguageTo(page, 'en');
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();
    await loginAs(page, email!, password!);

    // ─── Caminos list: create-link visible, no data created yet ────────────

    await page.goto('/caminos');
    await expect(
      page.getByRole('heading', { name: 'Caminos', exact: true }),
      'the caminos list heading must be visible',
    ).toBeVisible();
    const createLink = page.getByRole('link', { name: 'Create New Camino' });
    await expect(createLink, 'pilgrim must see the create-camino link').toBeVisible();

    // ─── Cancelling an in-progress creation creates nothing ────────────────

    await createLink.click();
    await page.waitForURL('/caminos/new', { timeout: 10_000 });
    await page.getByLabel('Camino Name').fill('This camino should never be created');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForURL('/caminos', { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: 'This camino should never be created' }),
      'cancelling the create form must not create a camino',
    ).toHaveCount(0);

    // ─── Create Camino: fill 4 waypoints, submit, "Add pictures" step ──────

    caminoName = uniqueName('CaminosLoggedIn');
    const created: CreatedCamino = await createCaminoWith4Points(page, caminoName);
    caminoSlug = created.slug;

    // "View camino" navigation is not exercised by any helper — check it here.
    const viewCaminoButton = page.getByRole('button', { name: 'View camino' });
    await expect(viewCaminoButton, 'View camino button must be visible').toBeVisible();
    await viewCaminoButton.click();
    await page.waitForURL(`/caminos/${caminoSlug}`, { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { level: 1 }),
      '"View camino" must land on the detail page showing the new camino\'s name',
    ).toContainText(caminoName, { timeout: 10_000 });

    // ─── New camino appears as a card with a working actions menu ─────────

    await page.goto('/caminos');
    const card = page.locator(`li:has(a[href="/caminos/${caminoSlug}"])`);
    await expect(card, 'the new camino must appear as a card in the list').toBeVisible({
      timeout: 10_000,
    });
    await card.locator('[aria-label*="Actions for"]').click();
    await expect(
      page.getByRole('menuitem', { name: 'Change camino data' }),
      'actions menu must offer "Change camino data"',
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole('menuitem', { name: 'Delete camino' }),
      'actions menu must offer "Delete camino"',
    ).toBeVisible();
    await page.keyboard.press('Escape');

    // ─── Rename: inline Enter saves ────────────────────────────────────────

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
    // pressSequentially (real keystrokes), not fill: this input's Enter-to-save
    // handler reads React state set by onChange, and fill()'s single
    // synthetic "input" event doesn't reliably land before the immediately
    // following Enter keydown is handled — confirmed live: with fill(), no
    // PATCH request was ever sent. pressSequentially fires one real keydown
    // per character, matching how the component is actually driven by a user.
    await nameInput.selectText();
    await nameInput.pressSequentially(nameAfterInlineSave);
    await nameInput.press('Enter');
    await expect(
      page.getByRole('heading', { level: 1 }),
      'pressing Enter must save the inline edit and show the new name',
    ).toContainText(nameAfterInlineSave, { timeout: 8_000 });
    caminoName = nameAfterInlineSave;

    // ─── Rename: inline Escape cancels ──────────────────────────────────────

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

    // ─── Rename: full update form ───────────────────────────────────────────

    await page.goto(`/caminos/${caminoSlug}/update`);
    await expect(
      page.getByRole('form', { name: 'Update Camino' }),
      'update form must be visible',
    ).toBeVisible();
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

    // ─── Add waypoint content: accommodation and sight on the first waypoint ─

    await page.goto(`/caminos/${caminoSlug}/stages/1`);
    const startLink = page.locator('dl dd a').first();
    await expect(startLink, 'stage 1 start point must be a link').toBeVisible({
      timeout: 10_000,
    });
    const href = await startLink.getAttribute('href');
    expect(href, 'start point link must point to /waypoints/...').toMatch(
      /^\/waypoints\//,
    );
    const waypointSlug = href!.replace('/waypoints/', '');

    await page.goto(`/waypoints/${waypointSlug}`);
    await expect(
      page.getByRole('link', { name: 'Add accommodation' }),
      'pilgrim must see an Add accommodation link',
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('link', { name: 'Add accommodation' }).click();
    await page.waitForURL(`/waypoints/${waypointSlug}/accommodations/new`, {
      timeout: 10_000,
    });
    const accName = `Test Hostel ${Date.now()}`;
    await page.getByLabel('Name').fill(accName);
    await page.getByLabel('Type').selectOption('hostel');
    await page.getByRole('button', { name: 'Add accommodation' }).click();
    await page.waitForURL(`/waypoints/${waypointSlug}`, { timeout: 15_000 });
    await expect(
      page.getByText(accName),
      'new accommodation must appear on the waypoint page',
    ).toBeVisible({ timeout: 10_000 });

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

    // ─── Edit stage 1 details: set, clear, cancel ───────────────────────────

    await page.goto(`/caminos/${caminoSlug}/stages/1`);
    await expect(
      page.getByRole('heading', { level: 1 }),
      'stage 1 detail heading must be visible',
    ).toContainText('Stage 1', { timeout: 10_000 });

    const editStageLink = page.getByRole('link', { name: 'Edit stage' });
    await expect(editStageLink, 'pilgrim must see an Edit stage link').toBeVisible({
      timeout: 10_000,
    });
    await editStageLink.click();
    await page.waitForURL(`/caminos/${caminoSlug}/stages/1/edit`, { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { level: 1 }),
      'edit page heading must mention "Edit Stage 1"',
    ).toContainText('Edit Stage 1', { timeout: 10_000 });
    await expect(
      page.getByText('Start point'),
      'start point label must be visible',
    ).toBeVisible();
    await expect(
      page.getByText('End point'),
      'end point label must be visible',
    ).toBeVisible();
    await expect(
      page.getByLabel('Start point'),
      'start point must not be an editable field',
    ).toBeHidden();
    await expect(
      page.getByLabel('End point'),
      'end point must not be an editable field',
    ).toBeHidden();

    // toHaveValue() after each fill is a real synchronization point, not
    // decoration: clicking "Save changes" immediately after fill() was
    // observed (live, repeatedly) to sometimes submit before React's state
    // update from the fill has actually settled, silently dropping the
    // click. Waiting for the DOM to confirm the typed value first — a
    // web-first, retrying assertion — closes that race without guessing at
    // an arbitrary delay.
    const distanceInput = page.getByLabel('Distance (km)');
    await distanceInput.fill('24.7');
    await expect(
      distanceInput,
      'distance input must reflect the typed value before saving',
    ).toHaveValue('24.7');
    const descriptionInput = page.getByLabel('Description (optional)');
    await descriptionInput.fill('A beautiful mountain stage.');
    await expect(
      descriptionInput,
      'description input must reflect the typed value before saving',
    ).toHaveValue('A beautiful mountain stage.');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForURL(`/caminos/${caminoSlug}/stages/1`, { timeout: 15_000 });
    await expect(
      page.getByText('24.7 km'),
      'saved distance must appear on the detail page',
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText('A beautiful mountain stage.'),
      'saved description must appear on the detail page',
    ).toBeVisible();

    // Full page.goto() rather than another editStageLink.click() for these
    // re-entries: repeated same-route SPA navigations onto this form were
    // observed (live, repeatedly) to sometimes leave a stale component/query
    // state where "Save changes" silently did nothing. A full navigation
    // guarantees a fresh mount and a fresh stage fetch every time.
    await page.goto(`/caminos/${caminoSlug}/stages/1/edit`);
    await distanceInput.fill('');
    await expect(distanceInput, 'distance input must be empty before saving').toHaveValue(
      '',
    );
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForURL(`/caminos/${caminoSlug}/stages/1`, { timeout: 15_000 });
    await expect(
      page.getByText('Distance not set'),
      'detail page must show "Distance not set" after clearing it',
    ).toBeVisible({ timeout: 10_000 });

    await page.goto(`/caminos/${caminoSlug}/stages/1/edit`);
    await distanceInput.fill('99.9');
    await expect(
      distanceInput,
      'distance input must reflect the typed value before cancelling',
    ).toHaveValue('99.9');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForURL(`/caminos/${caminoSlug}/stages/1`, { timeout: 10_000 });
    await expect(
      page.getByText('99.9 km'),
      'clicking Cancel must discard the unsaved distance change',
    ).toBeHidden();

    // ─── Reorder waypoints: warning dialog, "Go back" then "Save anyway" ───
    // Stage 1 now has custom distance/description (set above), guaranteeing
    // the "departs an enriched pairing" warning triggers deterministically.

    await page.goto(`/caminos/${caminoSlug}/update`);
    await expect(
      page.getByLabel('Camino Name'),
      'update form must be pre-populated with the current camino name',
    ).toHaveValue(caminoName, { timeout: 10_000 });

    const moveDownButtons = page.getByRole('button', { name: 'Move down' });
    await expect(
      moveDownButtons.first(),
      'a "Move down" control must be available for the first waypoint',
    ).toBeVisible({ timeout: 10_000 });
    await moveDownButtons.first().click();

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
    ).toHaveURL(`/caminos/${caminoSlug}/update`);

    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(
      page.getByRole('alertdialog'),
      'saving again with the same unresolved reorder must show the dialog again',
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Save anyway' }).click();
    await page.waitForURL(`/caminos/${caminoSlug}`, { timeout: 15_000 });
    await expect(
      page,
      '"Save anyway" must save and redirect to the camino detail page',
    ).toHaveURL(`/caminos/${caminoSlug}`);

    // ─── Delete: Cancel leaves the camino in the list ───────────────────────

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

    // ─── Delete: confirming removes the camino ──────────────────────────────

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
