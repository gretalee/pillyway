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
 * E2E test for viewing and editing a single stage.
 *
 * User-visible behavior under test
 * ---------------------------------
 * A guest opens a stage's detail page and sees its start/end waypoints
 * (with country), distance (unset fallback), description (unset fallback),
 * previous/next stage navigation, and two collapsible accommodation
 * sections — collapsed for the start waypoint, open for the end waypoint —
 * each showing the accommodation added there. A guest sees no "Edit stage"
 * link and is redirected away from the edit URL. A pilgrim logs in, edits
 * the stage's distance/description, and sees the change reflected on both
 * the stage detail page and the camino detail page's stage list.
 *
 * Data strategy
 * -------------
 * One shared mock camino (createMockCamino's 4-point default: Saint-Jean-
 * Pied-de-Port → Roncesvalles → Pamplona → Logroño, uniquely suffixed — see
 * the beforeAll comment), created once in beforeAll. Stage 2 (Roncesvalles →
 * Pamplona) is used throughout, since it's the only stage with both a
 * previous and a next stage. beforeAll also adds one accommodation at each
 * of stage 2's waypoints — fetching their slugs via the public GET
 * .../stages/2 endpoint (simpler than filtering the create response's
 * caminoPoints by position). Both the camino and its waypoints are deleted
 * in afterAll.
 *
 * Auth strategy
 * -------------
 * Mixed: beforeAll/afterAll and the mid-test edit step use
 * E2E_PILGRIM_EMAIL/PASSWORD; the initial view and the final redirect check
 * run unauthenticated (guest).
 */

test.describe('Stages', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90_000);

  let caminoId: string | undefined;
  let caminoSlug: string | undefined;
  let caminoPoints: CreatedCaminoPoint[] | undefined;
  let startPointSlug: string;
  let startPointName: string;
  let endPointSlug: string;
  let endPointName: string;
  let startAccommodationName: string;
  let endAccommodationName: string;

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

    // Stage rows have no caminoId — they're a global, shared entity keyed
    // only by (startPointId, endPointId) (see prisma/schema.prisma), and
    // the backend upserts rather than recreates one whenever a camino reuses
    // the same consecutive waypoint pair. Reusing DEFAULT_CAMINO_SEED_DATA's
    // fixed place names verbatim would mean this test's "distance/
    // description not set yet" assertions pass only on a pristine DB and
    // fail on any rerun (or any other spec that happened to edit the same
    // Roncesvalles → Pamplona stage first) — confirmed live. Suffixing every
    // waypoint name with a fresh timestamp guarantees brand-new CaminoPoints,
    // and therefore a brand-new, never-touched Stage row, on every run.
    const uniqueSuffix = ` ${Date.now()}`;
    const created = await createMockCamino(page, {
      camino: { ...DEFAULT_CAMINO_SEED_DATA.camino, name: 'Stages' },
      points: DEFAULT_CAMINO_SEED_DATA.points.map((point) => ({
        ...point,
        name: `${point.name}${uniqueSuffix}`,
      })),
    });
    caminoId = created.id;
    caminoSlug = created.slug;
    caminoPoints = created.caminoPoints;

    // Stage 2 (Roncesvalles → Pamplona) is the only stage with both a
    // previous and a next stage. Fetch it via the same public endpoint the
    // stage detail page itself uses, to get each waypoint's slug.
    const stageRes = await page.request.get(`${API_URL}/caminos/${caminoId}/stages/2`);
    expect(stageRes.ok(), 'GET stage 2 must succeed to read its waypoint slugs').toBe(true);
    const stage2 = (await stageRes.json()) as {
      startPoint: { slug: string; name: string };
      endPoint: { slug: string; name: string };
    };
    startPointSlug = stage2.startPoint.slug;
    startPointName = stage2.startPoint.name;
    endPointSlug = stage2.endPoint.slug;
    endPointName = stage2.endPoint.name;

    startAccommodationName = `Test Hostel ${Date.now()}`;
    await page.goto(`/waypoints/${startPointSlug}`);
    await page.getByRole('link', { name: 'Add accommodation' }).click();
    await page.waitForURL(`/waypoints/${startPointSlug}/accommodations/new`, {
      timeout: 10_000,
    });
    await page.getByLabel('Name').fill(startAccommodationName);
    await page.getByLabel('Type').selectOption('hostel');
    await page.getByRole('button', { name: 'Add accommodation' }).click();
    await page.waitForURL(`/waypoints/${startPointSlug}`, { timeout: 15_000 });

    endAccommodationName = `Test Hotel ${Date.now()}`;
    await page.goto(`/waypoints/${endPointSlug}`);
    await page.getByRole('link', { name: 'Add accommodation' }).click();
    await page.waitForURL(`/waypoints/${endPointSlug}/accommodations/new`, {
      timeout: 10_000,
    });
    await page.getByLabel('Name').fill(endAccommodationName);
    await page.getByLabel('Type').selectOption('hotel');
    await page.getByRole('button', { name: 'Add accommodation' }).click();
    await page.waitForURL(`/waypoints/${endPointSlug}`, { timeout: 15_000 });

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

  test('guest sees stage details, navigation, and accommodations; a pilgrim edits the stage and the change is reflected everywhere', async ({
    page,
  }) => {
    await setLanguageTo(page, 'en');

    // ─── Guest: stage detail page ───────────────────────────────────────────

    await page.goto(`/caminos/${caminoSlug}/stages/2`);
    await expect(
      page.getByRole('heading', { level: 1 }),
      'stage 2 heading must show start and end waypoint names',
    ).toContainText(`${startPointName} – ${endPointName}`, { timeout: 10_000 });

    await expect(page.getByText('Start', { exact: true }), 'Start label must be visible').toBeVisible();
    const startLink = page.getByRole('link', { name: startPointName, exact: true });
    await expect(startLink, 'start point link must show the waypoint name').toBeVisible();
    await expect(startLink, 'start point link must point to the waypoint page').toHaveAttribute(
      'href',
      `/waypoints/${startPointSlug}`,
    );

    await expect(page.getByText('End', { exact: true }), 'End label must be visible').toBeVisible();
    const endLink = page.getByRole('link', { name: endPointName, exact: true });
    await expect(endLink, 'end point link must show the waypoint name').toBeVisible();
    await expect(endLink, 'end point link must point to the waypoint page').toHaveAttribute(
      'href',
      `/waypoints/${endPointSlug}`,
    );

    await expect(
      page.getByText('Distance not set'),
      'a stage created via the camino form has no distance yet',
    ).toBeVisible();
    await expect(
      page.getByText('No description provided.'),
      'a stage created via the camino form has no description yet',
    ).toBeVisible();

    await expect(
      page.getByRole('link', { name: 'Edit stage' }),
      'guest must see no Edit stage link',
    ).toBeHidden();

    // ─── Guest: previous/next stage navigation ──────────────────────────────

    const previousStageLink = page.getByRole('link', { name: /Go to previous stage/ });
    await expect(previousStageLink, 'previous stage link must be visible').toBeVisible();
    await previousStageLink.click();
    await page.waitForURL(`/caminos/${caminoSlug}/stages/1`, { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { level: 1 }),
      'previous stage link must navigate to stage 1',
    ).toContainText('Stage 1', { timeout: 10_000 });

    await page.goto(`/caminos/${caminoSlug}/stages/2`);
    const nextStageLink = page.getByRole('link', { name: /Go to next stage/ });
    await expect(nextStageLink, 'next stage link must be visible').toBeVisible();
    await nextStageLink.click();
    await page.waitForURL(`/caminos/${caminoSlug}/stages/3`, { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { level: 1 }),
      'next stage link must navigate to stage 3',
    ).toContainText('Stage 3', { timeout: 10_000 });

    await page.goto(`/caminos/${caminoSlug}/stages/2`);

    // ─── Guest: accommodations — collapsed at start, open at end ───────────

    const startToggle = page.getByRole('button', {
      name: `Accommodations at ${startPointName}`,
    });
    await expect(startToggle, 'start accommodations toggle must be visible').toBeVisible();
    await expect(
      startToggle,
      'start accommodations section must start collapsed',
    ).toHaveAttribute('aria-expanded', 'false');
    // Not asserting on the section's own "region" role here: a <section>
    // with an accessible name (via aria-labelledby) gets an *implicit*
    // ARIA region role too, so getByRole('region', { name }) ambiguously
    // matches both the always-visible outer <section> and the actually-
    // collapsible inner content <div role="region"> — confirmed live, it
    // resolved to the outer one. Asserting on the accommodation's own
    // (uniquely-named) content sidesteps that ambiguity entirely, and is
    // closer to what "collapsed" means for a real user anyway.
    await expect(
      page.getByText(startAccommodationName),
      'the accommodation added at the start waypoint must not be visible while collapsed',
    ).toBeHidden();

    await startToggle.click();
    await expect(
      startToggle,
      'clicking the toggle must expand the start accommodations section',
    ).toHaveAttribute('aria-expanded', 'true');
    await expect(
      page.getByText(startAccommodationName),
      'the accommodation added at the start waypoint must appear once expanded',
    ).toBeVisible();

    const endToggle = page.getByRole('button', { name: `Accommodations at ${endPointName}` });
    await expect(endToggle, 'end accommodations toggle must be visible').toBeVisible();
    await expect(
      endToggle,
      'end accommodations section must start open',
    ).toHaveAttribute('aria-expanded', 'true');
    await expect(
      page.getByText(endAccommodationName),
      'the accommodation added at the end waypoint must be visible without expanding anything',
    ).toBeVisible();

    // ─── Pilgrim: edit the stage ─────────────────────────────────────────────

    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();
    await loginAs(page, email!, password!);

    await page.goto(`/caminos/${caminoSlug}/stages/2`);
    const editStageLink = page.getByRole('link', { name: 'Edit stage' });
    await expect(editStageLink, 'pilgrim must see an Edit stage link').toBeVisible({
      timeout: 10_000,
    });
    await editStageLink.click();
    await page.waitForURL(`/caminos/${caminoSlug}/stages/2/edit`, { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { level: 1 }),
      'edit page heading must mention "Edit Stage 2"',
    ).toContainText('Edit Stage 2', { timeout: 10_000 });
    await expect(
      page.getByText('Start point'),
      'edit page must show a "Start point" label',
    ).toBeVisible();
    await expect(
      page.getByText(startPointName),
      'edit page must show the (read-only) start point name',
    ).toBeVisible();
    await expect(
      page.getByText('End point'),
      'edit page must show an "End point" label',
    ).toBeVisible();
    await expect(
      page.getByText(endPointName),
      'edit page must show the (read-only) end point name',
    ).toBeVisible();

    const distanceInput = page.getByLabel('Distance (km)');
    await distanceInput.fill('21.5');
    await expect(
      distanceInput,
      'distance input must reflect the typed value before saving',
    ).toHaveValue('21.5');
    const descriptionInput = page.getByLabel('Description (optional)');
    await descriptionInput.fill('A steep descent through the Pyrenees.');
    await expect(
      descriptionInput,
      'description input must reflect the typed value before saving',
    ).toHaveValue('A steep descent through the Pyrenees.');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForURL(`/caminos/${caminoSlug}/stages/2`, { timeout: 15_000 });

    await expect(
      page.getByText('21.5 km'),
      'saved distance must appear on the stage detail page',
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText('A steep descent through the Pyrenees.'),
      'saved description must appear on the stage detail page',
    ).toBeVisible();

    // ─── The change must also be reflected on the camino detail page ───────

    await page.goto(`/caminos/${caminoSlug}`);
    const stageRow = page
      .getByRole('listitem')
      .filter({ hasText: startPointName })
      .filter({ hasText: endPointName });
    await expect(
      stageRow,
      'stage 2 row must be visible in the camino detail page\'s stage list',
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      stageRow,
      'the edited distance must also be reflected in the camino detail page\'s stage list',
    ).toContainText('21.5 km');

    // ─── Logging out: the edit page redirects an unauthenticated visitor ───

    await logout(page);
    await page.goto(`/caminos/${caminoSlug}/stages/2/edit`);
    await expect(
      page,
      'an unauthenticated visitor must be redirected away from the stage edit page',
    ).not.toHaveURL(`/caminos/${caminoSlug}/stages/2/edit`);
  });
});
