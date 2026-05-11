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

// ─── Helper: unique test camino name ─────────────────────────────────────────
export function uniqueName(label: string): string {
  return `[E2E-${label}] ${Date.now()}`;
}

// ─── Helper: fill and submit the camino creation form ────────────────────────
// Returns the camino ID extracted from the detail-page URL after submission
// redirects. Uses a single waypoint (France) to keep setup minimal.
export async function createCaminoViaForm(
  page: import('@playwright/test').Page,
  name: string,
): Promise<string> {
  await page.goto('/caminos/new');
  await page.getByLabel('Camino Name').fill(name);

  // Waypoint Name (first row)
  const waypointNameInput = page.getByLabel('Waypoint Name').first();
  await waypointNameInput.fill('Saint-Jean-Pied-de-Port');

  // Country select (first row) — pick France
  const countrySelect = page.getByLabel('Country').first();
  await countrySelect.selectOption('France');

  await page.getByRole('button', { name: 'Create Camino' }).click();

  // CreateCaminoForm redirects to /caminos on success
  await page.waitForURL('/caminos', { timeout: 15_000 });

  // Click the new camino card to navigate to its detail page and obtain the ID
  await page.getByRole('heading', { name, exact: true }).click();
  await page.waitForURL(/\/caminos\/[^/]+$/, { timeout: 10_000 });

  const segments = new URL(page.url()).pathname.split('/');
  return segments[segments.length - 1];
}
