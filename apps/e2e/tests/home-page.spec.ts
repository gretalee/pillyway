import { expect, test } from '@playwright/test';

/**
 * E2E test for viewing the home page.
 *
 * User-visible behavior under test
 * ---------------------------------
 * A visitor opens the home page and sees the Pillyway app name, both as a
 * heading on the page and as the browser tab title.
 *
 * Data strategy
 * -------------
 * No fixture needed — the home page requires no test data.
 *
 * Auth strategy
 * -------------
 * Public/unauthenticated.
 */

test.describe('Home page', () => {
  test('visitor sees the Pillyway app name as both the page heading and the browser tab title', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /pillyway/i }),
      'home page must show a heading containing the app name',
    ).toBeVisible();

    await expect(page, 'browser tab title must contain the app name').toHaveTitle(/pillyway/i);
  });
});
