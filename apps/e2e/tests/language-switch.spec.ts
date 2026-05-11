import { expect, test } from '@playwright/test';

// Helper: clear the pillyway-locale cookie so each test starts from a
// cookieless state (simulating a first visit).
async function clearLocaleCookie(page: import('@playwright/test').Page) {
  await page.context().clearCookies({ name: 'pillyway-locale' });
}

// Helper: add the pillyway-locale cookie before navigating so the SSR
// middleware picks it up on the very first request.
async function setLocaleCookie(
  page: import('@playwright/test').Page,
  locale: 'de' | 'en',
) {
  await page.context().addCookies([
    {
      name: 'pillyway-locale',
      value: locale,
      domain: 'localhost',
      path: '/',
      sameSite: 'Lax',
    },
  ]);
}

// ---------------------------------------------------------------------------
// First-load locale detection
// ---------------------------------------------------------------------------

test.describe('Language detection on first load', () => {
  // Each nested describe block overrides the browser locale (and therefore
  // the Accept-Language header) to test the Accept-Language fallback path.

  test.describe('Accept-Language: de-DE', () => {
    test.use({ locale: 'de-DE' });

    test('first load without cookie uses browser language "de" → UI renders in German', async ({
      page,
    }) => {
      await clearLocaleCookie(page);
      await page.goto('/');
      // DE login label is "Anmelden"; EN is "Log in".
      await expect(page.getByRole('link', { name: 'Anmelden' })).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    });
  });

  test.describe('Accept-Language: en-US', () => {
    test.use({ locale: 'en-US' });

    test('first load without cookie uses browser language "en" → UI renders in English', async ({
      page,
    }) => {
      await clearLocaleCookie(page);
      await page.goto('/');
      await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible({
        timeout: 5000,
      });
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    });
  });

  test.describe('Accept-Language: fr-FR (unsupported)', () => {
    test.use({ locale: 'fr-FR' });

    test('first load without cookie and unsupported browser language defaults to German', async ({
      page,
    }) => {
      await clearLocaleCookie(page);
      await page.goto('/');
      await expect(page.getByRole('link', { name: 'Anmelden' })).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    });
  });

  test('first load with existing pillyway-locale=en cookie overrides browser language', async ({
    page,
  }) => {
    // Cookie takes precedence over Accept-Language (AC-3).
    await setLocaleCookie(page, 'en');
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

// ---------------------------------------------------------------------------
// Language switcher interaction
// ---------------------------------------------------------------------------

test.describe('Language switcher — immediate UI update', () => {
  test('clicking EN in the language switcher immediately shows English strings', async ({
    page,
  }) => {
    // Start in German (no cookie → middleware falls back to Accept-Language;
    // we force de via cookie so the test is locale-independent).
    await setLocaleCookie(page, 'de');
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Anmelden' })).toBeVisible();
    const urlBefore = page.url();

    // Click the EN button in the language switcher.
    await page.getByRole('button', { name: 'EN' }).first().click();

    // After router.refresh() the server re-renders with the EN cookie:
    // the login link text switches from "Anmelden" to "Log in".
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();

    // No full-page navigation should have occurred.
    expect(page.url()).toBe(urlBefore);
  });

  test('clicking DE after EN switches back to German strings', async ({ page }) => {
    // Start in English.
    await setLocaleCookie(page, 'en');
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();

    // Switch back to German.
    await page.getByRole('button', { name: 'DE' }).first().click();

    // After router.refresh() the server re-renders with the DE cookie.
    await expect(page.getByRole('link', { name: 'Anmelden' })).toBeVisible();
  });

  test('switching language updates the <html lang> attribute immediately', async ({
    page,
  }) => {
    await setLocaleCookie(page, 'de');
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');

    // Switch to English via the language switcher.
    await page.getByRole('button', { name: 'EN' }).first().click();

    // router.refresh() causes the root layout to re-render with locale="en".
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('the active language button has a visible distinct state', async ({ page }) => {
    // Load with EN cookie so the EN button starts as the active selection.
    await setLocaleCookie(page, 'en');
    await page.goto('/');

    // EN button must report aria-pressed="true"; DE must be false.
    await expect(page.getByRole('button', { name: 'EN' }).first()).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: 'DE' }).first()).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});

// ---------------------------------------------------------------------------
// Persistence across navigation
// ---------------------------------------------------------------------------

test.describe('Language preference persistence', () => {
  test('language remains English after navigating to another page', async ({ page }) => {
    // Switch to English by setting the cookie and loading the home page.
    await setLocaleCookie(page, 'en');
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();

    // Navigate to a second route that doesn't require authentication.
    await page.goto('/caminos');
    // The header login link is present on every page — it must still be in EN.
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();

    // Navigate back to the home page.
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  });

  test('pillyway-locale cookie is present and equals "en" after switching', async ({
    page,
  }) => {
    await setLocaleCookie(page, 'de');
    await page.goto('/');

    // Switch to English via the language switcher.
    await page.getByRole('button', { name: 'EN' }).first().click();

    // Verify setLocale() wrote the cookie with the correct value.
    const cookies = await page.context().cookies();
    const localeCookie = cookies.find((c) => c.name === 'pillyway-locale');
    expect(localeCookie).toBeDefined();
    expect(localeCookie?.value).toBe('en');
  });

  test('pillyway-locale cookie has SameSite=Lax attribute', async ({ page }) => {
    await setLocaleCookie(page, 'de');
    await page.goto('/');

    await page.getByRole('button', { name: 'EN' }).first().click();

    const cookies = await page.context().cookies();
    const localeCookie = cookies.find((c) => c.name === 'pillyway-locale');
    expect(localeCookie).toBeDefined();
    expect(localeCookie?.sameSite).toBe('Lax');
  });
});

// ---------------------------------------------------------------------------
// <html lang> attribute
// ---------------------------------------------------------------------------

test.describe('<html lang> attribute', () => {
  test('<html lang> is "de" on first load when default locale is German', async ({
    page,
  }) => {
    // Use an explicit de cookie so the assertion is deterministic regardless
    // of the CI runner's system locale.
    await setLocaleCookie(page, 'de');
    await page.goto('/');
    // Read immediately after goto — lang must be set in the SSR response,
    // not deferred to client-side hydration.
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  });

  test('<html lang> is "en" when pillyway-locale=en cookie is set before load', async ({
    page,
  }) => {
    await setLocaleCookie(page, 'en');
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

// ---------------------------------------------------------------------------
// Keyboard accessibility
// ---------------------------------------------------------------------------

// test.describe("Language switcher — keyboard navigation", () => {
//   test.fixme(
//     "language switcher is reachable via Tab from the start of the page",
//     // Rationale: AC-9 — the switcher must sit in the natural tab order.
//     // Setup: page.goto('/'), press Tab repeatedly until the switcher is
//     //   focused (or use page.locator('[aria-label=...]').focus()).
//     // Assert: the switcher element has focus.
//   );

//   test.fixme(
//     "pressing Enter on the EN option activates the language switch",
//     // Rationale: AC-9 — Enter must activate the control for keyboard users.
//     // Setup: focus the EN button via keyboard, press Enter.
//     // Assert: EN strings appear / cookie is set to "en".
//   );

//   test.fixme(
//     "pressing Space on the EN option activates the language switch",
//     // Rationale: WCAG 2.1 SC 2.1.1 — Space must also activate button-role
//     //   controls.
//     // Setup: focus the EN button, press Space.
//     // Assert: EN strings appear / cookie is set to "en".
//   );

//   // Rationale: WCAG 2.1 SC 2.4.7 — focus must be visible.
//   // Implementation note: Playwright does not easily inspect computed CSS
//   //   outline. Use an accessibility snapshot or a screenshot comparison
//   //   with a known-good baseline if the team has visual regression tooling.
//   //   As a minimum, assert that focus-visible CSS class is present.
//   test.fixme(
//     "language switcher has a visible focus ring when focused via keyboard",
//   );
// });
