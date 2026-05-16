import { expect, test } from '@playwright/test';
import {
  createCaminoWith4Points,
  loginAs,
  logout,
  setLanguageToEnglish,
  uniqueName,
} from './helpers';

test.describe('Waypoint detail — public view and pilgrim write flows', () => {
  test.describe.configure({ mode: 'serial' });

  let caminoName: string;
  let caminoId: string;
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
    caminoName = uniqueName('WaypointPOI');
    caminoId = await createCaminoWith4Points(page, caminoName);

    // Navigate to stage 1 to get the waypoint slug from the start-point link
    await page.goto(`/caminos/${caminoId}/stages/1`);
    const startLink = page.locator('dl dd a').first();
    await expect(startLink).toBeVisible({ timeout: 10_000 });
    const href = await startLink.getAttribute('href');
    expect(href, 'Start point must be a link to /waypoints/...').toMatch(
      /^\/waypoints\//,
    );
    waypointSlug = href!.replace('/waypoints/', '');

    await logout(page);
    await ctx.close();
  });

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
      await page.goto('/caminos');
      const trigger = page.locator(`[aria-label="Actions for ${caminoName}"]`);
      if (await trigger.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await trigger.click();
        const deleteMenuItem = page.getByRole('menuitem', { name: 'Delete camino' });
        if (await deleteMenuItem.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await deleteMenuItem.click();
          await page.getByRole('button', { name: 'Delete' }).click();
        }
      }
    } finally {
      await logout(page);
      await ctx.close();
    }
  });

  test('guest can view waypoint detail page with empty accommodations and sights', async ({
    page,
  }) => {
    await setLanguageToEnglish(page);
    await page.goto(`/waypoints/${waypointSlug}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('heading', { name: 'Accommodations' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sights' })).toBeVisible();
    // Guest sees no add buttons
    await expect(page.getByRole('link', { name: 'Add accommodation' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Add sight' })).not.toBeVisible();
  });

  test('stage detail start and end points are links to waypoint pages', async ({
    page,
  }) => {
    await setLanguageToEnglish(page);
    await page.goto(`/caminos/${caminoId}/stages/1`);
    const startLink = page.locator('dl dd a').first();
    await expect(startLink).toBeVisible({ timeout: 10_000 });
    const href = await startLink.getAttribute('href');
    expect(href).toMatch(/^\/waypoints\//);
  });

  test('unauthenticated user is redirected from add-accommodation page', async ({
    page,
  }) => {
    await page.goto(`/waypoints/${waypointSlug}/accommodations/new`);
    await expect(page).not.toHaveURL(`/waypoints/${waypointSlug}/accommodations/new`, {
      timeout: 10_000,
    });
  });

  test('pilgrim can add an accommodation and it appears on the waypoint page', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();
    await setLanguageToEnglish(page);
    await loginAs(page, email!, password!);

    // Pilgrim sees add buttons on waypoint page
    await page.goto(`/waypoints/${waypointSlug}`);
    await expect(page.getByRole('link', { name: 'Add accommodation' })).toBeVisible({
      timeout: 10_000,
    });

    // Navigate to add form
    await page.getByRole('link', { name: 'Add accommodation' }).click();
    await page.waitForURL(`/waypoints/${waypointSlug}/accommodations/new`, {
      timeout: 10_000,
    });

    // Fill and submit form
    const accName = `Test Hostel ${Date.now()}`;
    await page.getByLabel('Name').fill(accName);
    await page.getByLabel('Type').selectOption('hostel');
    await page.getByRole('button', { name: 'Add accommodation' }).click();

    // Redirected back to waypoint page
    await page.waitForURL(`/waypoints/${waypointSlug}`, { timeout: 15_000 });
    await expect(page.getByText(accName)).toBeVisible({ timeout: 10_000 });
  });

  test('pilgrim can add a sight and it appears on the waypoint page', async ({
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
    await page.getByRole('link', { name: 'Add sight' }).click();
    await page.waitForURL(`/waypoints/${waypointSlug}/sights/new`, { timeout: 10_000 });

    const sightName = `Test Sight ${Date.now()}`;
    await page.getByLabel('Name').fill(sightName);
    await page.getByRole('button', { name: 'Add sight' }).click();

    await page.waitForURL(`/waypoints/${waypointSlug}`, { timeout: 30_000 });
    await expect(page.getByText(sightName)).toBeVisible({ timeout: 10_000 });
  });
});
