import { expect, test } from '@playwright/test';
import {
  CAMINO_FIXTURE_COUNTRY_CODES,
  CAMINO_FIXTURE_WAYPOINTS,
  createCaminoViaForm,
  createCaminoWith4Points,
  type CreatedCamino,
  deleteCaminoViaUI,
  ITALY_WAYPOINT_FIXTURE,
  loginAs,
  logout,
  setCaminoVerified,
  setLanguageTo,
  uniqueName,
} from './helpers';

/**
 * E2E test for the public /caminos experience: home page → caminos list
 * (with filters) → camino detail page, all as an unauthenticated guest.
 */

test.describe('Caminos', () => {
  test.describe.configure({ mode: 'serial' });

  let caminoItaly: CreatedCamino | undefined;
  let caminoFrance: CreatedCamino | undefined;
  let caminoUnverified: CreatedCamino | undefined;
  const caminoItalyName = uniqueName('CaminosPublicItaly');
  const caminoFranceName = uniqueName('CaminosPublicFrance');
  const caminoUnverifiedName = uniqueName('CaminosPublicUnverified');

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(150_000);
    const pilgrimEmail = process.env.E2E_PILGRIM_EMAIL;
    const pilgrimPassword = process.env.E2E_PILGRIM_PASSWORD;
    const ownerEmail = process.env.E2E_OWNER_EMAIL;
    const ownerPassword = process.env.E2E_OWNER_PASSWORD;
    expect(pilgrimEmail, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(pilgrimPassword, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();
    expect(ownerEmail, 'E2E_OWNER_EMAIL must be set').toBeTruthy();
    expect(ownerPassword, 'E2E_OWNER_PASSWORD must be set').toBeTruthy();

    const pilgrimCtx = await browser.newContext();
    const pilgrimPage = await pilgrimCtx.newPage();
    await setLanguageTo(pilgrimPage, 'en');
    await loginAs(pilgrimPage, pilgrimEmail!, pilgrimPassword!);
    caminoItaly = await createCaminoViaForm(
      pilgrimPage,
      caminoItalyName,
      ITALY_WAYPOINT_FIXTURE,
    );
    caminoFrance = await createCaminoWith4Points(pilgrimPage, caminoFranceName);
    caminoUnverified = await createCaminoViaForm(pilgrimPage, caminoUnverifiedName);
    await logout(pilgrimPage);
    await pilgrimCtx.close();

    const ownerCtx = await browser.newContext();
    const ownerPage = await ownerCtx.newPage();
    await setLanguageTo(ownerPage, 'en');
    await loginAs(ownerPage, ownerEmail!, ownerPassword!);
    await setCaminoVerified(ownerPage, caminoItalyName);
    await setCaminoVerified(ownerPage, caminoFranceName);
    await logout(ownerPage);
    await ownerCtx.close();
  });

  test.afterAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(120_000);
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    if (!email || !password) return;

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await setLanguageTo(page, 'en');
    await loginAs(page, email, password);
    try {
      if (caminoItaly) await deleteCaminoViaUI(page, caminoItaly.slug);
      if (caminoFrance) await deleteCaminoViaUI(page, caminoFrance.slug);
      if (caminoUnverified) await deleteCaminoViaUI(page, caminoUnverified.slug);
    } finally {
      await logout(page);
      await ctx.close();
    }
  });

  test('Test: see caminos without being logged in', async ({ page }) => {
    await setLanguageTo(page, 'de');
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Entdecke Pilgerwege in ganz Europa' }),
      'the main heading must be visible',
    ).toBeVisible();

    const gotoCaminosButton = page.getByRole('link', { name: 'Alle Pillyway Caminos' });
    await gotoCaminosButton.scrollIntoViewIfNeeded();
    await expect(
      gotoCaminosButton,
      'the "Alle Pillyway Caminos" button must be visible',
    ).toBeVisible();
    await gotoCaminosButton.click();
    await page.waitForURL('/caminos', { timeout: 10_000 });

    // ─── Caminos List ───────────────────────

    await expect(
      page.getByRole('heading', { name: 'Caminos', exact: true }),
      'the caminos list heading must be visible',
    ).toBeVisible();

    await expect(
      page.getByRole('button', { name: 'Neuen Camino erstellen' }),
      'guest must see no "create new camino" button',
    ).toHaveCount(0);
    await expect(
      page.locator('[aria-label*="Actions for"]'),
      'guest must see no three-dots action menu on any camino card',
    ).toHaveCount(0);

    const caminoList = page.getByRole('list', { name: 'Caminos', exact: true });
    const italyCard = caminoList
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: caminoItalyName, exact: true }) });
    const franceCard = caminoList.getByRole('listitem').filter({
      has: page.getByRole('heading', { name: caminoFranceName, exact: true }),
    });
    const unverifiedCard = caminoList.getByRole('listitem').filter({
      has: page.getByRole('heading', { name: caminoUnverifiedName, exact: true }),
    });

    await expect(
      italyCard,
      'the verified Italy fixture camino must appear in the unfiltered list',
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      franceCard,
      'the verified France fixture camino must appear in the unfiltered list',
    ).toBeVisible();
    await expect(
      unverifiedCard,
      'the unverified fixture camino must appear in the unfiltered list',
    ).toBeVisible();

    // ─── Verified filter ───────────────────────

    const verifiedFilter = page.getByRole('switch', { name: 'Nur verifizierte Caminos' });
    await expect(
      verifiedFilter,
      'guest must see the "only verified caminos" filter button',
    ).toBeVisible();

    await verifiedFilter.click();
    await page.waitForURL((url) => url.searchParams.get('verified') === 'true', {
      timeout: 10_000,
    });

    await expect(
      italyCard,
      'the verified Italy fixture camino must remain visible when filtering by verified',
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      franceCard,
      'the verified France fixture camino must remain visible when filtering by verified',
    ).toBeVisible();
    await expect(
      unverifiedCard,
      'the unverified fixture camino must be hidden when filtering by verified',
    ).toBeHidden();

    await expect(
      italyCard.getByRole('button', { name: 'Verifizierter Weg' }),
      'the Italy fixture camino must show the verified badge',
    ).toBeVisible();
    await expect(
      franceCard.getByRole('button', { name: 'Verifizierter Weg' }),
      'the France fixture camino must show the verified badge',
    ).toBeVisible();

    // ─── Country filter ───────────────────────

    const countryFilter = page.getByTestId('country-filter');
    await expect(countryFilter, 'guest must see the country filter').toBeVisible();
    const countryButtonIT = countryFilter.getByRole('button').filter({ hasText: 'IT' });
    await expect(
      countryButtonIT,
      'the country filter must include a button for Italy (IT)',
    ).toBeVisible();

    await countryButtonIT.click();
    await page.waitForURL((url) => url.searchParams.has('countries'), {
      timeout: 10_000,
    });
    await expect(
      countryButtonIT,
      'the country filter button must be selected',
    ).toHaveAttribute('aria-pressed', 'true');

    await expect(
      italyCard,
      'the Italy fixture camino must remain visible once also filtering by country=IT',
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      franceCard,
      'the France fixture camino must be hidden once filtering by country=IT (proves the country filter narrows the verified list)',
    ).toBeHidden();
    await expect(
      unverifiedCard,
      'the unverified fixture camino must remain hidden',
    ).toBeHidden();

    await expect(
      italyCard.getByTestId('camino-countries'),
      "the Italy fixture camino's countries row must mention Italy (IT)",
    ).toContainText('IT');

    // ─── Reset filters button ───────────────────────

    const resetFilterButton = page.getByRole('button', { name: 'Filter zurücksetzen' });
    await expect(
      resetFilterButton,
      'guest must see the "reset filters" button',
    ).toBeVisible();

    await resetFilterButton.click();
    await page.waitForURL((url) => url.pathname === '/caminos' && url.search === '', {
      timeout: 10_000,
    });
    await expect(
      verifiedFilter,
      'the verified switch must be off after resetting filters',
    ).toHaveAttribute('aria-checked', 'false');
    await expect(
      countryButtonIT,
      'the country filter button must be deselected',
    ).toHaveAttribute('aria-pressed', 'false');

    await expect(
      italyCard,
      'the Italy fixture camino must be visible again after resetting filters',
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      franceCard,
      'the France fixture camino must be visible again after resetting filters',
    ).toBeVisible();
    await expect(
      unverifiedCard,
      'the unverified fixture camino must be visible again after resetting filters (proves the verified filter, not deletion, was hiding it)',
    ).toBeVisible();

    // ─── Camino Detail View ───────────────────────

    await franceCard.getByRole('heading').first().click();
    await page.waitForURL(`/caminos/${caminoFrance!.slug}`, { timeout: 10_000 });

    await expect(
      page.getByRole('heading', { level: 1 }),
      'detail page heading must show the camino name',
    ).toContainText(caminoFranceName);
    await expect(
      page.getByRole('button', { name: 'Verifizierter Weg' }),
      'the verified badge must be visible on the detail page for a verified camino',
    ).toBeVisible();
    await expect(
      page.getByText(CAMINO_FIXTURE_COUNTRY_CODES),
      'countries row must list the two countries the camino passes through',
    ).toBeVisible();
    await expect(
      page.getByText('Keine Beschreibung vorhanden.'),
      'description section must show the fallback text when no description is set',
    ).toBeVisible();

    await expect(
      page.getByRole('heading', { name: 'Etappen' }),
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
      page.getByRole('link', { name: 'Wegpunkte bearbeiten' }),
      'guest must see no Edit waypoints link',
    ).toBeHidden();

    const gpxButton = page.getByRole('button', { name: 'GPX Daten' });
    await expect(gpxButton, 'GPX Data button must be visible').toBeVisible();
    await gpxButton.click();
    const gpxDialog = page.getByRole('dialog');
    await expect(gpxDialog, 'GPX modal must open').toBeVisible();
    await expect(
      gpxDialog.getByText('Noch keine GPX-Dateien vorhanden.'),
      'GPX modal must show its empty state for a camino with no GPX files',
    ).toBeVisible();
    await expect(
      gpxDialog.getByRole('button', { name: 'GPX hochladen' }),
      'guest must see no GPX upload button',
    ).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(gpxDialog, 'GPX modal must close').toBeHidden();

    await expect(
      page.getByRole('heading', { name: 'Verifizierter Weg', exact: true }),
      'Verified Route section heading must be visible',
    ).toBeVisible();
    await expect(
      page.getByText('Ja: 0'),
      'vote count must show 0 Yes for a fresh camino',
    ).toBeVisible();
    await expect(
      page.getByText('Nein: 0'),
      'vote count must show 0 No for a fresh camino',
    ).toBeVisible();
    await expect(
      page.getByText('Melde dich an, um den Weg verifizieren zu können.'),
      'guest must be prompted to log in before voting',
    ).toBeVisible();

    await page.goto(`/caminos/${caminoFrance!.slug}/update`);
    await expect(
      page,
      'an unauthenticated visitor must be redirected away from the update page',
    ).not.toHaveURL(`/caminos/${caminoFrance!.slug}/update`);
  });

  // ─── Pagination ───────────────────────

  // TODO: test that pagination works
});
