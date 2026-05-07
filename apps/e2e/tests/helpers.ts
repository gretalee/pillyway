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

  const passwordVisible = await passwordInput.first().isVisible().catch(() => false);

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
