import { expect, test } from '@playwright/test';

test.describe('Stages', () => {
  test.describe.configure({ mode: 'serial' });

  test('Test: See and edit stages', async ({ page }) => {
    await page.goto('/stages');

    // see public stage detail page
    // tests all details, e.g. start location, end location, distance, description
    // See navigation button to former and next stage detail pages
    // See headline for accommodation at start location (list of accommodations in collapsed)
    // See headline for accommodation at end location (list of accommodations in visible)

    // log in and return to same stage detail page
    // makes changes to stage and save them
    // the changes should be reflected on the stage detail page and on the camino detail page

    // logout
    // without login, the user should be redirected from the edit page.

    expect(true, 'This test needs to be implemented').toBeTruthy();
  });
});
