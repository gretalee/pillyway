import type { Page } from '@playwright/test';

/**
 * Logs in via Kinde from any test that needs an authenticated session.
 * Handles both the single-screen (email + password visible at once) and the
 * two-step (email → Continue → password) Kinde login flows.
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/api/auth/login');
  await page.waitForURL(/kinde\.com/, { timeout: 15_000 });

  const emailInput = page
    .getByRole('textbox', { name: /email/i })
    .or(page.locator('input[type="email"]'))
    .or(page.locator('input[name="email"]'))
    .first();
  await emailInput.fill(email);

  const passwordInput = page
    .getByRole('textbox', { name: /password/i })
    .or(page.locator('input[type="password"]'));

  const passwordVisible = await passwordInput
    .first()
    .isVisible()
    .catch(() => false);

  if (!passwordVisible) {
    const continueButton = page
      .getByRole('button', { name: /continue/i })
      .or(page.getByRole('button', { name: /next/i }))
      .first();
    await continueButton.click();
    await passwordInput.first().waitFor({ state: 'visible', timeout: 10_000 });
  }

  await passwordInput.first().fill(password);

  await page
    .getByRole('button', { name: /sign in|log in|continue/i })
    .last()
    .click();

  await page.waitForURL('/', { timeout: 20_000 });
}

export async function logout(page: Page): Promise<void> {
  await page.goto('/api/auth/logout');
  await page.waitForURL('/', { timeout: 10_000 });
}

/**
 * Returns the current session's Kinde access token, for tests that need to
 * call the backend API directly (bypassing the UI) with authorization —
 * e.g. cleanup calls to endpoints with no corresponding UI action.
 *
 * `/api/auth/setup` is not a bespoke endpoint added for testing — it's the
 * same same-origin route the Kinde Next.js SDK's own `useKindeBrowserClient`
 * hook fetches internally (see `fetchKindeState` in
 * `@kinde-oss/kinde-auth-nextjs/dist/src/frontend/utils.*.js`) to hydrate
 * `accessTokenEncoded` client-side. Calling it here just reads the same
 * already-authenticated session cookie the browser already has — it grants
 * no new capability beyond what the page's own JS already does on load.
 *
 * Returns null (never throws) if the session has no token — callers must
 * decide how to handle that themselves (this is typically used from
 * best-effort cleanup code, where a failure here should not fail a test).
 */
export async function getAccessToken(page: Page): Promise<string | null> {
  try {
    const res = await page.request.get('/api/auth/setup');
    if (!res.ok()) return null;
    const data = (await res.json()) as { accessTokenEncoded?: string };
    return data.accessTokenEncoded ?? null;
  } catch {
    return null;
  }
}

// ─── Helper: unique test entity name ─────────────────────────────────────────
export function uniqueName(label: string): string {
  return `[E2E-${label}] ${Date.now()}`;
}
