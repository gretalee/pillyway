/**
 * Auth setup for PILLY-CAM-002 E2E tests.
 *
 * Runs as a separate Playwright project ("setup") before the main chromium
 * project. Logs in as the pilgrim test account and the owner test account,
 * saving each session to .auth/pilgrim.json and .auth/owner.json.
 *
 * Required environment variables:
 *   E2E_PILGRIM_EMAIL    — email of a test account with the "pilgrim" role
 *   E2E_PILGRIM_PASSWORD — password for the pilgrim test account
 *   E2E_OWNER_EMAIL      — email of a test account WITHOUT the "pilgrim" role
 *                          (must own at least one seeded camino in the test DB)
 *   E2E_OWNER_PASSWORD   — password for the owner test account
 *
 * When these variables are absent the setup tests are skipped. The dependent
 * spec tests check for the resulting .auth files and skip themselves too.
 */

import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const PILGRIM_FILE = path.join(__dirname, '../.auth/pilgrim.json');
const OWNER_FILE = path.join(__dirname, '../.auth/owner.json');

// Kinde login automation helper.
// Kinde's login page has an email field followed by a password field on the
// same screen (classic-mode) or on a separate screen after "Continue".
// We handle both layouts by attempting the combined flow first and falling
// back to the two-step flow.
async function kindeLogin(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<void> {
  // Trigger the Kinde auth redirect from the Next.js app.
  await page.goto('/api/auth/login');

  // Wait until we land on the Kinde-hosted login page (external domain).
  await page.waitForURL(/kinde\.com/, { timeout: 15_000 });

  // Fill email. Kinde uses a standard <input type="email"> with various
  // possible labels/placeholders across its login flows.
  const emailInput = page
    .getByRole('textbox', { name: /email/i })
    .or(page.locator('input[type="email"]'))
    .or(page.locator('input[name="email"]'))
    .first();
  await emailInput.fill(email);

  // Some Kinde configurations show only the email on the first screen and
  // present the password after clicking "Continue".
  const passwordInputLocator = page
    .getByRole('textbox', { name: /password/i })
    .or(page.locator('input[type="password"]'));

  const passwordVisible = await passwordInputLocator.first().isVisible().catch(() => false);

  if (!passwordVisible) {
    // Two-step: click Continue to get to the password screen.
    const continueButton = page
      .getByRole('button', { name: /continue/i })
      .or(page.getByRole('button', { name: /next/i }))
      .first();
    await continueButton.click();
    await passwordInputLocator.first().waitFor({ state: 'visible', timeout: 10_000 });
  }

  await passwordInputLocator.first().fill(password);

  const signInButton = page
    .getByRole('button', { name: /sign in|log in|continue/i })
    .last();
  await signInButton.click();

  // After successful login Kinde redirects back to KINDE_POST_LOGIN_REDIRECT_URL.
  await page.waitForURL('/', { timeout: 20_000 });
}

setup('authenticate as pilgrim', async ({ page }) => {
  const email = process.env.E2E_PILGRIM_EMAIL;
  const password = process.env.E2E_PILGRIM_PASSWORD;

  setup.skip(
    !email || !password,
    'E2E_PILGRIM_EMAIL / E2E_PILGRIM_PASSWORD not set — skipping pilgrim auth setup',
  );

  await kindeLogin(page, email!, password!);

  // Verify we are on the home page (logged in).
  await expect(page.getByRole('heading', { name: /pillyway/i })).toBeVisible();

  // Persist session state so other tests can reuse it.
  fs.mkdirSync(path.dirname(PILGRIM_FILE), { recursive: true });
  await page.context().storageState({ path: PILGRIM_FILE });
});

setup('authenticate as owner', async ({ page }) => {
  const email = process.env.E2E_OWNER_EMAIL;
  const password = process.env.E2E_OWNER_PASSWORD;

  setup.skip(
    !email || !password,
    'E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD not set — skipping owner auth setup',
  );

  await kindeLogin(page, email!, password!);

  await expect(page.getByRole('heading', { name: /pillyway/i })).toBeVisible();

  fs.mkdirSync(path.dirname(OWNER_FILE), { recursive: true });
  await page.context().storageState({ path: OWNER_FILE });
});
