import { expect, test } from '@playwright/test';
import {
  // Import only what you need. Check tests/helpers.ts first — if the setup
  // step you need isn't there yet but would be useful to another spec too,
  // add it there instead of duplicating it inline.
  // createCaminoWith4Points, deleteCaminoViaUI, loginAs, logout, setLanguageToEnglish, uniqueName,
} from './helpers';

/**
 * E2E test for <ONE USER USE-CASE, e.g. "create a new camino">.
 *
 * User-visible behavior under test
 * ---------------------------------
 * <What a real user does and sees, step by step, in plain language.>
 *
 * Data strategy
 * -------------
 * <What gets created once in beforeAll and used by the single test below,
 * and what afterAll deletes. Never rely on whatever happens to already be
 * seeded — create exactly what this use-case needs.>
 *
 * Auth strategy
 * -------------
 * <Public/unauthenticated, or E2E_PILGRIM_EMAIL/PASSWORD, or
 * E2E_OWNER_EMAIL/PASSWORD. If this use-case needs a mix of auth states
 * across steps (e.g. guest view, then pilgrim edit), say so — that's still
 * one use-case and one test, just multiple contexts/logins within it.>
 *
 * Timeout rules (CLAUDE.md)
 * -------------------------
 * - testInfo.setTimeout(120_000) in beforeAll  — login + navigate + fill forms
 * - testInfo.setTimeout(90_000)  in beforeAll/afterAll — login + one UI op only
 * - test.setTimeout(60_000)      — on the describe block, if the test logs in
 */

test.describe('<Use-case name>', () => {
  // Required whenever this use-case creates/updates/deletes data — keeps a
  // beforeAll fixture safe to build once, and avoids concurrent-session
  // conflicts on the shared Kinde pilgrim account.
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60_000); // only needed if the test itself performs a Kinde login

  let caminoId: string;
  let caminoName: string;

  // ─── Setup ──────────────────────────────────────────────────────────────

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(120_000);

    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    // Non-negotiable (CLAUDE.md): a missing prerequisite must FAIL the test
    // with a clear assertion error — never test.skip()/testInfo.skip().
    expect(email, 'E2E_PILGRIM_EMAIL must be set').toBeTruthy();
    expect(password, 'E2E_PILGRIM_PASSWORD must be set').toBeTruthy();

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    // await setLanguageToEnglish(page);
    // await loginAs(page, email!, password!);

    // caminoName = uniqueName('<ShortPrefix>');
    // caminoId = await createCaminoWith4Points(page, caminoName);
    // ... rest of this use-case's shared fixture setup ...

    await ctx.close();
  });

  // ─── Teardown ───────────────────────────────────────────────────────────

  test.afterAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(90_000);
    if (!caminoId) return;

    const email = process.env.E2E_PILGRIM_EMAIL;
    const password = process.env.E2E_PILGRIM_PASSWORD;
    // Cleanup is best-effort: soft-return on missing creds, never a hard
    // assertion here — a failed cleanup must not fail the test run.
    if (!email || !password) return;

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    // await setLanguageToEnglish(page);
    // await loginAs(page, email, password);
    try {
      // await deleteCaminoViaUI(page, caminoId);
    } finally {
      await ctx.close();
    }
  });

  // ─── The single test ────────────────────────────────────────────────────
  // One test() for the whole use-case, walked step by step. Every expect()
  // gets a description so a failure is identifiable without reading the
  // surrounding code. No page.waitForTimeout(...) anywhere — wait on
  // observable state (a locator, a URL) instead.

  test('<restate the use-case as a full sentence describing the journey>', async ({
    page,
  }) => {
    // Arrange: navigate / log in for this step

    // Act: perform the first step of the flow

    // Assert with a description:
    // await expect(locator, 'what this proves about the flow').toBeVisible();

    // ...repeat Act/Assert for each subsequent step of the same use-case...
  });
});
