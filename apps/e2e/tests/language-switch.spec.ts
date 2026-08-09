import { expect, test } from '@playwright/test';

/**
 * E2E test for language detection and the language switcher.
 *
 * User-visible behavior under test
 * ---------------------------------
 * A first-time visitor without a stored preference sees the UI in whichever
 * language their browser reports via Accept-Language (German or English),
 * falls back to German for any unsupported language, and an explicit
 * pillyway-locale cookie always overrides the browser-reported language.
 * A user can also switch languages manually via the header switcher: the UI
 * updates immediately (no full navigation), the active button reflects the
 * current selection, the <html lang> attribute updates immediately, the
 * choice persists across navigation, and it's stored as a
 * pillyway-locale=<locale> cookie with SameSite=Lax.
 *
 * Data strategy
 * -------------
 * No shared fixture. Browser-locale detection needs a handful of separate
 * browser contexts (Playwright's `locale` context option can't change
 * mid-test); everything else runs against the default `page` fixture with
 * an explicit pillyway-locale cookie as its starting point.
 *
 * Auth strategy
 * -------------
 * Public/unauthenticated throughout — this is about the locale UI itself,
 * not authenticated content.
 */

test.describe('Language detection and switching', () => {
  test('detects the browser language on first load (with a German fallback and cookie override), and the manual switcher updates the UI, html lang, active state, and persists across navigation', async ({
    page,
    browser,
  }) => {
    // ─── First-load detection: browser locale wins when no cookie exists ──

    const deCtx = await browser.newContext({ locale: 'de-DE' });
    const dePage = await deCtx.newPage();
    await dePage.goto('/');
    await expect(
      dePage.getByRole('link', { name: 'Anmelden' }),
      'a de-DE browser locale with no cookie must render the German login label',
    ).toBeVisible();
    await expect(
      dePage.locator('html'),
      'html lang must be "de" for a de-DE browser locale',
    ).toHaveAttribute('lang', 'de');
    await deCtx.close();

    const enCtx = await browser.newContext({ locale: 'en-US' });
    const enPage = await enCtx.newPage();
    await enPage.goto('/');
    await expect(
      enPage.getByRole('link', { name: 'Log in' }),
      'an en-US browser locale with no cookie must render the English login label',
    ).toBeVisible();
    await expect(
      enPage.locator('html'),
      'html lang must be "en" for an en-US browser locale',
    ).toHaveAttribute('lang', 'en');
    await enCtx.close();

    const frCtx = await browser.newContext({ locale: 'fr-FR' });
    const frPage = await frCtx.newPage();
    await frPage.goto('/');
    await expect(
      frPage.getByRole('link', { name: 'Anmelden' }),
      'an unsupported fr-FR browser locale must fall back to German',
    ).toBeVisible();
    await expect(
      frPage.locator('html'),
      'html lang must default to "de" for an unsupported browser locale',
    ).toHaveAttribute('lang', 'de');
    await frCtx.close();

    // An explicit cookie beats the browser-reported language.
    const overrideCtx = await browser.newContext({ locale: 'de-DE' });
    const overridePage = await overrideCtx.newPage();
    await overrideCtx.addCookies([
      { name: 'pillyway-locale', value: 'en', domain: 'localhost', path: '/', sameSite: 'Lax' },
    ]);
    await overridePage.goto('/');
    await expect(
      overridePage.getByRole('link', { name: 'Log in' }),
      'a pillyway-locale=en cookie must override a de-DE browser locale',
    ).toBeVisible();
    await expect(
      overridePage.locator('html'),
      'html lang must follow the cookie, not the browser locale, once the cookie is set',
    ).toHaveAttribute('lang', 'en');
    await overrideCtx.close();

    // ─── Manual switching, on the default `page` fixture ──────────────────

    await page.context().addCookies([
      { name: 'pillyway-locale', value: 'de', domain: 'localhost', path: '/', sameSite: 'Lax' },
    ]);
    await page.goto('/');
    await expect(
      page.getByRole('link', { name: 'Anmelden' }),
      'page must start in German via the cookie',
    ).toBeVisible();
    const urlBeforeSwitch = page.url();

    await page.getByRole('button', { name: 'EN' }).first().click();
    await expect(
      page.getByRole('link', { name: 'Log in' }),
      'clicking EN must switch visible strings to English immediately',
    ).toBeVisible();
    await expect(
      page.locator('html'),
      'html lang must update to "en" immediately after switching',
    ).toHaveAttribute('lang', 'en');
    expect(
      page.url(),
      'switching language must update in place, not trigger a full-page navigation',
    ).toBe(urlBeforeSwitch);

    await expect(
      page.getByRole('button', { name: 'EN' }).first(),
      'EN button must be marked active (aria-pressed=true) after switching to English',
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: 'DE' }).first(),
      'DE button must be marked inactive (aria-pressed=false) after switching to English',
    ).toHaveAttribute('aria-pressed', 'false');

    const cookiesAfterEn = await page.context().cookies();
    const localeCookieAfterEn = cookiesAfterEn.find((c) => c.name === 'pillyway-locale');
    expect(localeCookieAfterEn, 'pillyway-locale cookie must exist after switching').toBeDefined();
    expect(localeCookieAfterEn?.value, 'pillyway-locale cookie value must be "en"').toBe('en');
    expect(localeCookieAfterEn?.sameSite, 'pillyway-locale cookie must have SameSite=Lax').toBe(
      'Lax',
    );

    // Persists across navigation to another page and back.
    await page.goto('/caminos');
    await expect(
      page.getByRole('link', { name: 'Log in' }),
      'language must remain English after navigating to /caminos',
    ).toBeVisible();
    await page.goto('/');
    await expect(
      page.getByRole('link', { name: 'Log in' }),
      'language must remain English after navigating back to the home page',
    ).toBeVisible();

    // Switching back to German verifies the reverse direction too.
    await page.getByRole('button', { name: 'DE' }).first().click();
    await expect(
      page.getByRole('link', { name: 'Anmelden' }),
      'clicking DE must switch back to German',
    ).toBeVisible();
  });
});

// Keyboard-accessibility scenarios for the language switcher are not yet
// implemented as E2E tests (originally sketched as test.fixme() placeholders):
// - AC-9: switcher must be reachable via Tab from page start.
// - AC-9: Enter on a focused language option activates the switch.
// - WCAG 2.1 SC 2.1.1: Space on a focused language option also activates it.
// - WCAG 2.1 SC 2.4.7: switcher must show a visible focus ring when
//   keyboard-focused (needs a screenshot/visual-regression baseline or an
//   accessibility-tree/focus-visible-class check — plain DOM assertions
//   can't verify computed outline styles).
