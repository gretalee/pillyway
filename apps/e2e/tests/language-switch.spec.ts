import { expect, test } from '@playwright/test';

// Helper: clear the pillyway-locale cookie so each test starts from a
// cookieless state (simulating a first visit).
async function clearLocaleCookie(page: import('@playwright/test').Page) {
  await page.context().clearCookies({ name: 'pillyway-locale' });
}

// ---------------------------------------------------------------------------
// First-load locale detection
// ---------------------------------------------------------------------------

test.describe('Language detection on first load', () => {
  test.todo(
    'first load without cookie uses browser language "de" → UI renders in German',
    // Rationale: AC-1 — browser language de maps to German; no cookie present.
    // Setup: clear cookie, set Accept-Language: de, navigate to /.
    // Assert: a known DE string is visible (e.g., header aria-label or login button text).
    // Assert: <html lang> attribute equals "de".
  );

  test.todo(
    'first load without cookie uses browser language "en" → UI renders in English',
    // Rationale: AC-1 variant — browser language en maps to English.
    // Setup: clear cookie, set Accept-Language: en-US, navigate to /.
    // Assert: a known EN string is visible.
    // Assert: <html lang> attribute equals "en".
  );

  test.todo(
    'first load without cookie and unsupported browser language defaults to German',
    // Rationale: AC-2 — French (or any unsupported) browser language falls
    // back to German.
    // Setup: clear cookie, set Accept-Language: fr-FR, navigate to /.
    // Assert: a known DE string is visible.
    // Assert: <html lang> attribute equals "de".
  );

  test.todo(
    'first load with existing pillyway-locale=en cookie overrides browser language',
    // Rationale: AC-3 — cookie takes precedence over Accept-Language.
    // Setup: set pillyway-locale=en cookie, set Accept-Language: de, navigate to /.
    // Assert: a known EN string is visible.
    // Assert: <html lang> attribute equals "en".
  );
});

// ---------------------------------------------------------------------------
// Language switcher interaction
// ---------------------------------------------------------------------------

test.describe('Language switcher — immediate UI update', () => {
  test.todo(
    'clicking EN in the language switcher immediately shows English strings',
    // Rationale: AC-4 — strings must update without a full page navigation.
    // Setup: load page in de, locate the language switcher, click EN.
    // Assert: a string that differs between DE and EN is now showing the EN
    //   version (e.g., login button text "Log in" vs "Anmelden").
    // Assert: no full page navigation occurred (check page.url() is unchanged).
  );

  test.todo(
    'clicking DE after EN switches back to German strings',
    // Rationale: AC-4 — reverse direction; idempotency of the toggle.
    // Setup: load page in en (cookie), click DE.
    // Assert: known DE string is now visible.
  );

  test.todo(
    'switching language updates the <html lang> attribute immediately',
    // Rationale: AC-7 — the lang attribute must reflect the active locale
    //   after the router.refresh() triggered by setLocale.
    // Setup: load page in de, click EN.
    // Assert: await page.locator('html').getAttribute('lang') equals "en".
  );

  test.todo(
    'the active language button has a visible distinct state',
    // Rationale: Design requirement — current selection must be
    //   "unambiguous at a glance". Verify via accessible attribute
    //   (aria-pressed=true) rather than a fragile CSS class check.
  );
});

// ---------------------------------------------------------------------------
// Persistence across navigation
// ---------------------------------------------------------------------------

test.describe('Language preference persistence', () => {
  test.todo(
    'language remains English after navigating to another page',
    // Rationale: AC-5 — the pillyway-locale cookie keeps the preference
    //   across same-session navigation.
    // Setup: switch to EN, navigate to a second route (e.g., /backoffice or
    //   any route that exists), navigate back to /.
    // Assert: EN strings are still visible on the return page.
  );

  test.todo(
    'pillyway-locale cookie is present and equals "en" after switching',
    // Rationale: FR-4 — verifies the cookie was actually written by
    //   setLocale, not just that state looks correct on-screen.
    // Setup: switch to EN.
    // Assert: page.context().cookies() contains { name: 'pillyway-locale',
    //   value: 'en' }.
  );

  test.todo(
    'pillyway-locale cookie has SameSite=Lax attribute',
    // Rationale: Security checklist — SameSite=Lax is required by the ticket.
    // Setup: switch to EN.
    // Assert: the cookie returned by page.context().cookies() has
    //   sameSite === 'Lax'.
  );
});

// ---------------------------------------------------------------------------
// <html lang> attribute
// ---------------------------------------------------------------------------

test.describe('<html lang> attribute', () => {
  test.todo(
    '<html lang> is "de" on first load when default locale is German',
    // Rationale: AC-7 — the lang attribute must be correct from the first
    //   SSR response, not just after client-side hydration.
    // Assert on initial page load before any JS executes
    //   (use page.goto() and immediately read the attribute).
  );

  test.todo(
    '<html lang> is "en" when pillyway-locale=en cookie is set before load',
    // Rationale: AC-7 + NFR SSR compatibility — the Server Component must
    //   resolve the locale from the cookie and set lang before sending HTML.
    // Setup: set cookie, page.goto('/').
    // Assert: attribute equals "en" without waiting for client-side code.
  );
});

// ---------------------------------------------------------------------------
// Keyboard accessibility
// ---------------------------------------------------------------------------

test.describe('Language switcher — keyboard navigation', () => {
  test.todo(
    'language switcher is reachable via Tab from the start of the page',
    // Rationale: AC-9 — the switcher must sit in the natural tab order.
    // Setup: page.goto('/'), press Tab repeatedly until the switcher is
    //   focused (or use page.locator('[aria-label=...]').focus()).
    // Assert: the switcher element has focus.
  );

  test.todo(
    'pressing Enter on the EN option activates the language switch',
    // Rationale: AC-9 — Enter must activate the control for keyboard users.
    // Setup: focus the EN button via keyboard, press Enter.
    // Assert: EN strings appear / cookie is set to "en".
  );

  test.todo(
    'pressing Space on the EN option activates the language switch',
    // Rationale: WCAG 2.1 SC 2.1.1 — Space must also activate button-role
    //   controls.
    // Setup: focus the EN button, press Space.
    // Assert: EN strings appear / cookie is set to "en".
  );

  test.todo(
    'language switcher has a visible focus ring when focused via keyboard',
    // Rationale: WCAG 2.1 SC 2.4.7 — focus must be visible.
    // Implementation note: Playwright does not easily inspect computed CSS
    //   outline. Use an accessibility snapshot or a screenshot comparison
    //   with a known-good baseline if the team has visual regression tooling.
    //   As a minimum, assert that focus-visible CSS class is present.
  );
});
