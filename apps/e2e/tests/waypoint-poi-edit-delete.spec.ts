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
 * E2E tests for POI (accommodation and sight) edit, delete, and detail-page flows.
 *
 * Data strategy
 * -------------
 * beforeAll creates a dedicated camino with 4 waypoints, then adds one
 * accommodation and one sight to the first waypoint. All tests reuse these
 * shared entities. Edit tests run before delete tests (serial mode guarantees
 * order), so the entities still exist when the detail-page and edit tests run.
 * afterAll deletes the camino, which cascades to all POIs.
 *
 * Timeout rules (CLAUDE.md)
 * -------------------------
 * - testInfo.setTimeout(120_000) in beforeAll — login + camino creation + form fills
 * - testInfo.setTimeout(90_000) in afterAll   — login + deletion
 * - test.setTimeout(60_000) per authenticated test — login budget
 */

test.describe('POI — accommodation and sight edit, delete, and detail page', () => {
  test.describe.configure({ mode: 'serial' });

  let caminoName: string;
  let caminoId: string;
  let waypointSlug: string;
  let accommodationId: string;
  let accommodationName: string;
  let sightName: string;

  // ─── Setup ────────────────────────────────────────────────────────────────────

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

    // Create camino and extract the waypoint slug from stage 1's start-point link
    caminoName = uniqueName('POIEditDelete');
    caminoId = await createCaminoWith4Points(page, caminoName);

    await page.goto(`/caminos/${caminoId}/stages/1`);
    const startLink = page.locator('dl dd a').first();
    await expect(startLink).toBeVisible({ timeout: 10_000 });
    const href = await startLink.getAttribute('href');
    expect(href, 'Start point must link to /waypoints/...').toMatch(/^\/waypoints\//);
    waypointSlug = href!.replace('/waypoints/', '');

    // Add accommodation
    accommodationName = uniqueName('Hostel');
    await page.goto(`/waypoints/${waypointSlug}/accommodations/new`);
    await page.getByLabel('Name').fill(accommodationName);
    await page.getByLabel('Type').selectOption('hostel');
    await page.getByRole('button', { name: 'Add accommodation' }).click();
    await page.waitForURL(`/waypoints/${waypointSlug}`, { timeout: 15_000 });

    console.log('BeforeAll - accommodationName is set to', accommodationName);

    // Extract accommodation ID from the name link on the waypoint page
    const accLink = page.getByRole('link', { name: accommodationName });
    await expect(accLink).toBeVisible({ timeout: 10_000 });
    const accHref = await accLink.getAttribute('href');
    expect(accHref, 'Accommodation card must link to /accommodations/:id').toMatch(
      /^\/accommodations\//,
    );
    accommodationId = accHref!.replace('/accommodations/', '');

    // Add sight
    sightName = uniqueName('Cathedral');
    await page.goto(`/waypoints/${waypointSlug}/sights/new`);
    await page.getByLabel('Name').fill(sightName);
    await page.getByRole('button', { name: 'Add sight' }).click();
    await page.waitForURL(`/waypoints/${waypointSlug}`, { timeout: 15_000 });
    await expect(page.getByText(sightName)).toBeVisible({ timeout: 10_000 });

    await logout(page);
    console.log('### BeforeAll - setup complete');
    await ctx.close();
  });

  // ─── Teardown ─────────────────────────────────────────────────────────────────

  test.afterAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(90_000);
    if (!caminoId) return;

    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await setLanguageToEnglish(page);
    await loginAs(page, email!, password!);
    try {
      await deleteCaminoViaUI(page, caminoId);
    } finally {
      await logout(page);

      console.log('### AfterAll - teardown complete');
      await ctx.close();
    }
  });

  // ─── Accommodation detail page ────────────────────────────────────────────────

  test('guest can view accommodation detail page and sees name and type badge', async ({
    page,
  }) => {
    const pageUrl = `/accommodations/${accommodationId}`;
    await setLanguageToEnglish(page);
    await page.goto(pageUrl);
    await page.waitForURL(pageUrl, { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: accommodationName })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('Hostel', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back' })).toBeVisible();
    // Guest does not see the edit button
    await expect(
      page.getByRole('link', { name: 'Edit accommodation' }),
    ).not.toBeVisible();
  });

  test('pilgrim sees Edit accommodation button on accommodation detail page', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();

    await setLanguageToEnglish(page);
    await loginAs(page, email!, password!);

    await page.goto(`/accommodations/${accommodationId}`);
    await expect(page.getByRole('link', { name: 'Edit accommodation' })).toBeVisible({
      timeout: 10_000,
    });
  });

  // ─── Accommodation edit ───────────────────────────────────────────────────────

  test('pilgrim can edit accommodation and see the changes on the waypoint page', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();

    await setLanguageToEnglish(page);
    await loginAs(page, email!, password!);
    await page.goto(`/waypoints/${waypointSlug}`);
    const editAccommodationLink = page
      .locator('div')
      .filter({ has: page.getByRole('link', { name: accommodationName, exact: true }) })
      .getByRole('link', { name: 'Edit accommodation' });
    await expect(editAccommodationLink).toBeVisible({ timeout: 10_000 });
    await editAccommodationLink.click();
    await page.waitForURL(/\/accommodations\/[^/]+\/edit$/, { timeout: 10_000 });

    // Change the name
    const updatedAccName = `${accommodationName} (edited)`;
    await page.getByLabel('Name').fill(updatedAccName);
    await page.getByRole('button', { name: 'Save changes' }).click();

    // Should redirect back to the waypoint page with the new name visible
    await page.waitForURL(`/waypoints/${waypointSlug}`, { timeout: 30_000 });
    await expect(page.getByText(updatedAccName)).toBeVisible({ timeout: 10_000 });

    accommodationName = updatedAccName;
  });

  // ─── Sight edit ───────────────────────────────────────────────────────────────

  test('pilgrim can edit sight and see the changes on the waypoint page', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();

    await setLanguageToEnglish(page);
    await loginAs(page, email!, password!);

    await page.goto(`/waypoints/${waypointSlug}`);
    const editSightLink = page
      .locator('div')
      .filter({ has: page.getByText(sightName, { exact: true }) })
      .getByRole('link', { name: 'Edit sight' });
    await expect(
      editSightLink,
      `Edit sight link for ${sightName} must be visible.`,
    ).toBeVisible({ timeout: 10_000 });
    await editSightLink.click();
    await page.waitForURL(/\/sights\/[^/]+\/edit$/, { timeout: 10_000 });

    const updatedSightName = `${sightName} (edited)`;
    await page.getByLabel('Name').fill(updatedSightName);
    await page.getByRole('button', { name: 'Save changes' }).click();

    await page.waitForURL(`/waypoints/${waypointSlug}`, { timeout: 15_000 });
    await expect(page.getByText(updatedSightName)).toBeVisible({ timeout: 10_000 });

    sightName = updatedSightName;
  });

  // ─── Accommodation delete ─────────────────────────────────────────────────────

  test('pilgrim can delete an accommodation and it disappears from the waypoint page', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();

    await setLanguageToEnglish(page);
    await loginAs(page, email!, password!);

    await page.goto(`/waypoints/${waypointSlug}`);
    const deleteBtn = page
      .locator('div')
      .filter({ has: page.getByRole('link', { name: accommodationName, exact: true }) })
      .getByRole('button', { name: 'Delete accommodation' });
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 });
    await deleteBtn.click();

    // Confirm the alert dialog
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByRole('button', { name: 'Delete' }).click();

    // Accommodation must be gone after the page refreshes
    await expect(page.getByText(accommodationName, { exact: true })).toHaveCount(0, {
      timeout: 30_000,
    });
  });

  // ─── Sight delete ─────────────────────────────────────────────────────────────

  test('pilgrim can delete a sight and it disappears from the waypoint page', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();

    await setLanguageToEnglish(page);
    await loginAs(page, email!, password!);

    await page.goto(`/waypoints/${waypointSlug}`);
    const deleteBtn = page
      .locator('div')
      .filter({ has: page.getByText(sightName, { exact: true }) })
      .getByRole('button', { name: 'Delete sight' });
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 });
    await deleteBtn.click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    const closeBtn = dialog.getByRole('button', { name: 'Delete' });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    await expect(page.getByRole('heading', { name: sightName })).not.toBeVisible({
      timeout: 15_000,
    });
  });
});
