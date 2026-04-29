import { expect, test } from '@playwright/test';

test('home page shows the app name', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /pillyway/i })).toBeVisible();
});

test('home page has correct title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/pillyway/i);
});
