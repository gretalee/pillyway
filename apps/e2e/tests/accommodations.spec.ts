import { expect, test } from '@playwright/test';
import {
  API_URL,
  createMockCamino,
  type CreatedCaminoPoint,
  DEFAULT_CAMINO_SEED_DATA,
  deleteCaminoViaUI,
  deleteMockWaypoints,
  loginAs,
  logout,
  setLanguageTo,
} from './helpers';

/**
 * E2E test for viewing and editing an accommodation.
 *
 * User-visible behavior under test
 * ---------------------------------
 * A guest browses camino detail → stage detail → expands the (collapsed)
 * accommodations section for the stage's start waypoint → opens the
 * accommodation's own detail page and sees all its details (name,
 * description, address, phone/email/website). The accommodation detail
 * page's "Back" link returns to the waypoint page, where the same
 * accommodation is still listed. The stage detail page's "Back to camino"
 * link returns to the camino detail page. A guest sees no edit button and
 * is redirected away from the edit URL. A pilgrim logs in, sees an edit
 * button on the accommodation card, edits several fields, and sees the
 * change reflected on both the accommodation detail page and the stage
 * detail page.
 *
 * Data strategy
 * -------------
 * One mock camino in beforeAll, with uniquely-suffixed waypoint names (not
 * createMockCamino's shared defaults verbatim — see the beforeAll comment)
 * and one fully-detailed accommodation added at stage 1's start waypoint,
 * filling every field the add form has so the guest-view step has real data
 * to check. Deleting a camino intentionally never deletes its CaminoPoint
 * rows (confirmed in caminos.service.ts — waypoints can be shared by other
 * caminos), so afterAll deletes the camino first, then its now-provably-
 * unused waypoints via DELETE /camino-points/:id (see deleteMockWaypoints).
 *
 * Auth strategy
 * -------------
 * Mixed: beforeAll/afterAll and the mid-test edit step use
 * E2E_PILGRIM_EMAIL/PASSWORD; the initial view and the final redirect check
 * run unauthenticated (guest).
 */

test.describe('Accommodations', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  let caminoId: string | undefined;
  let caminoSlug: string | undefined;
  let caminoPoints: CreatedCaminoPoint[] | undefined;
  let waypointSlug: string;
  let waypointName: string;
  let accommodationName: string;

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(120_000);
    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await setLanguageTo(page, 'en');
    await loginAs(page, email!, password!);

    // Reusing DEFAULT_CAMINO_SEED_DATA's fixed place names verbatim would
    // add this fixture's accommodation to the shared, already-reused
    // "Saint-Jean-Pied-de-Port" CaminoPoint — confirmed live: a rerun then
    // sees every accommodation ever left there by any spec (deleting a
    // camino has no cascade to accommodations at a waypoint, since other
    // caminos may still be using it), and this test's own literal edited
    // text can collide with an identically-worded leftover from its own
    // prior run. Suffixing every waypoint name with a fresh timestamp (same
    // technique as stages.spec.ts) guarantees a brand-new, never-touched
    // CaminoPoint every run.
    const uniqueSuffix = ` ${Date.now()}`;
    const created = await createMockCamino(page, {
      camino: { ...DEFAULT_CAMINO_SEED_DATA.camino, name: 'Accommodations' },
      points: DEFAULT_CAMINO_SEED_DATA.points.map((point) => ({
        ...point,
        name: `${point.name}${uniqueSuffix}`,
      })),
    });
    caminoId = created.id;
    caminoSlug = created.slug;
    caminoPoints = created.caminoPoints;

    // Stage 1's start point is where the fixture accommodation is added
    // below. Fetched via the same public endpoint the stage detail page
    // itself uses.
    const stageRes = await page.request.get(`${API_URL}/caminos/${caminoId}/stages/1`);
    expect(stageRes.ok(), 'GET stage 1 must succeed to read its start waypoint').toBe(true);
    const stage1 = (await stageRes.json()) as { startPoint: { slug: string; name: string } };
    waypointSlug = stage1.startPoint.slug;
    waypointName = stage1.startPoint.name;

    accommodationName = `Test Monastery ${Date.now()}`;
    await page.goto(`/waypoints/${waypointSlug}`);
    await page.getByRole('link', { name: 'Add accommodation' }).click();
    await page.waitForURL(`/waypoints/${waypointSlug}/accommodations/new`, {
      timeout: 10_000,
    });
    await page.getByLabel('Name').fill(accommodationName);
    await page.getByLabel('Type').selectOption('monastery');
    await page
      .getByLabel('Description (optional)')
      .fill('A quiet monastery offering pilgrim beds near the old town square.');
    await page.getByLabel('Price range').selectOption('comfortable');
    await page.getByLabel('Email').fill('info@example-monastery.test');
    await page.getByLabel('Website').fill('https://example-monastery.test');
    await page.getByLabel('Phone').fill('+33 559 371 001');
    await page.getByLabel('Street').fill('Rue du Chemin 12');
    await page.getByLabel('ZIP / Postal code').fill('64220');
    await page.getByLabel('City').fill('Ostabat');
    await page.getByLabel('Country').selectOption({ value: 'france' });
    await page.getByRole('button', { name: 'Add accommodation' }).click();
    await page.waitForURL(`/waypoints/${waypointSlug}`, { timeout: 15_000 });

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
      await deleteCaminoViaUI(page, caminoSlug);
      // Uniquely-suffixed waypoints (see beforeAll) — never shared with any
      // other camino, so this should always succeed.
      if (caminoPoints) await deleteMockWaypoints(page, caminoPoints);
    } finally {
      await logout(page);
      await ctx.close();
    }
  });

  test('guest sees accommodation details via camino → stage → accommodation, and back-navigation; a pilgrim edits it and the change is reflected everywhere', async ({
    page,
  }) => {
    await setLanguageTo(page, 'en');

    // ─── Guest: camino detail → stage detail ────────────────────────────────

    await page.goto(`/caminos/${caminoSlug}`);
    await expect(
      page.getByRole('heading', { level: 1 }),
      'camino detail heading must be visible',
    ).toBeVisible({ timeout: 10_000 });

    const stage1Link = page.locator(`a[href="/caminos/${caminoSlug}/stages/1"]`);
    await expect(stage1Link, 'stage 1 must be listed on the camino detail page').toBeVisible();
    await stage1Link.click();
    await page.waitForURL(`/caminos/${caminoSlug}/stages/1`, { timeout: 10_000 });

    // ─── Guest: accommodation card is inside the (collapsed) start section ─

    const startToggle = page.getByRole('button', { name: `Accommodations at ${waypointName}` });
    await expect(startToggle, 'start accommodations toggle must be visible').toBeVisible({
      timeout: 10_000,
    });
    await expect(
      startToggle,
      'start accommodations section must start collapsed',
    ).toHaveAttribute('aria-expanded', 'false');
    await startToggle.click();
    await expect(
      startToggle,
      'clicking the toggle must expand the start accommodations section',
    ).toHaveAttribute('aria-expanded', 'true');

    const accommodationLink = page.getByRole('link', { name: accommodationName });
    await expect(
      accommodationLink,
      'the fixture accommodation must be visible once the section is expanded',
    ).toBeVisible();

    // ─── Guest: accommodation detail page shows every field ────────────────

    await accommodationLink.click();
    await page.waitForURL(/\/accommodations\/[^/]+$/, { timeout: 10_000 });
    const accommodationUrl = page.url();
    const accommodationId = accommodationUrl.split('/').pop()!;
    const editUrl = `/waypoints/${waypointSlug}/accommodations/${accommodationId}/edit`;

    await expect(
      page.getByRole('heading', { level: 1, name: accommodationName }),
      'accommodation detail heading must show its name',
    ).toBeVisible();
    await expect(
      page.getByText('A quiet monastery offering pilgrim beds near the old town square.'),
      'accommodation description must be visible',
    ).toBeVisible();
    await expect(page.getByText('Rue du Chemin 12'), 'street must be visible').toBeVisible();
    await expect(page.getByText('64220'), 'ZIP must be visible').toBeVisible();
    await expect(page.getByText('Ostabat'), 'city must be visible').toBeVisible();
    await expect(page.getByText('France'), 'country must be visible').toBeVisible();
    await expect(
      page.getByRole('link', { name: '+33 559 371 001' }),
      'phone must be a tel: link',
    ).toHaveAttribute('href', 'tel:+33559371001');
    await expect(
      page.getByRole('link', { name: 'info@example-monastery.test' }),
      'email must be a mailto: link',
    ).toHaveAttribute('href', 'mailto:info@example-monastery.test');
    await expect(
      page.getByRole('link', { name: 'https://example-monastery.test' }),
      'website must be a link',
    ).toHaveAttribute('href', 'https://example-monastery.test');
    await expect(
      page.getByRole('link', { name: 'Edit accommodation' }),
      'guest must see no edit button',
    ).toBeHidden();

    // ─── Guest: "Back" returns to the waypoint page, accommodation still listed ─

    await page.getByRole('link', { name: 'Back', exact: true }).click();
    await page.waitForURL(`/waypoints/${waypointSlug}`, { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: accommodationName }),
      'the accommodation must still be listed on the waypoint page',
    ).toBeVisible();

    // ─── Guest: stage page's "Back to camino" returns to the camino ────────

    await page.goto(`/caminos/${caminoSlug}/stages/1`);
    await page.getByRole('link', { name: 'Back to camino' }).click();
    await page.waitForURL(`/caminos/${caminoSlug}`, { timeout: 10_000 });

    // ─── Pilgrim: edit the accommodation ────────────────────────────────────

    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();
    await loginAs(page, email!, password!);

    await page.goto(`/caminos/${caminoSlug}/stages/1`);
    await page
      .getByRole('button', { name: `Accommodations at ${waypointName}` })
      .click();
    // Scope to this test's own accommodation card by name rather than a bare
    // "Edit accommodation" role+name query — the uniquely-suffixed waypoint
    // keeps this test isolated today, but role+name alone would silently
    // break again (strict-mode violation) the moment this waypoint ever
    // carries more than one accommodation.
    const accommodationCard = page.getByRole('listitem').filter({ hasText: accommodationName });
    const editButton = accommodationCard.getByRole('link', { name: 'Edit accommodation' });
    await expect(editButton, 'pilgrim must see an edit button on the accommodation card').toBeVisible();
    await editButton.click();
    await page.waitForURL(editUrl, { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { level: 1 }),
      'edit page heading must be "Edit Accommodation"',
    ).toContainText('Edit Accommodation', { timeout: 10_000 });
    await expect(
      page.getByLabel('Name'),
      'edit form must be pre-filled with the current name',
    ).toHaveValue(accommodationName);

    const newDescription = 'Recently renovated pilgrim dormitory with new bunk beds.';
    const descriptionInput = page.getByLabel('Description (optional)');
    await descriptionInput.fill(newDescription);
    await expect(
      descriptionInput,
      'description input must reflect the typed value before saving',
    ).toHaveValue(newDescription);
    const newPhone = '+33 559 371 099';
    const phoneInput = page.getByLabel('Phone');
    await phoneInput.fill(newPhone);
    await expect(phoneInput, 'phone input must reflect the typed value before saving').toHaveValue(
      newPhone,
    );
    await page.getByLabel('Price range').selectOption('luxury');
    const cityInput = page.getByLabel('City');
    await cityInput.fill('Larceveau');
    await expect(cityInput, 'city input must reflect the typed value before saving').toHaveValue(
      'Larceveau',
    );
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForURL(`/waypoints/${waypointSlug}`, { timeout: 15_000 });

    // ─── The change must be reflected on the accommodation detail page ─────

    await page.goto(accommodationUrl);
    await expect(
      page.getByText(newDescription),
      'the updated description must appear on the accommodation detail page',
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('link', { name: newPhone }),
      'the updated phone must appear on the accommodation detail page',
    ).toBeVisible();
    await expect(
      page.getByText('Larceveau'),
      'the updated city must appear on the accommodation detail page',
    ).toBeVisible();

    // ─── The change must also be reflected on the stage detail page ────────

    await page.goto(`/caminos/${caminoSlug}/stages/1`);
    await page
      .getByRole('button', { name: `Accommodations at ${waypointName}` })
      .click();
    await expect(
      page.getByText(newDescription),
      'the updated description must appear on the stage detail page',
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('link', { name: newPhone }),
      'the updated phone must appear on the stage detail page',
    ).toBeVisible();

    // ─── Logging out: the edit page redirects an unauthenticated visitor ───

    await logout(page);
    await page.goto(editUrl);
    await expect(
      page,
      'an unauthenticated visitor must be redirected away from the accommodation edit page',
    ).not.toHaveURL(editUrl);
  });
});
