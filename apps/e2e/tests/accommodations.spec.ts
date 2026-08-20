import { expect, test } from '@playwright/test';

test.describe('Accommodations', () => {
  test.describe.configure({ mode: 'serial' });

  test('Test: See and edit accommodations', async ({ page }) => {
    await page.goto('/caminos');

    // see camino detail page
    // go to stage detail page
    // see accomodation card on the stages detail page
    // go to accommodation detail page
    // see accommodation details on the stages page
    // tests all details, e.g. name, description, address, contact information, ...

    // clicking the back button above the title returns to waypoint detail page and shows the accommodation details on the accommodations list
    // clicking the back button above the stage title return to the camino detail page

    // login in and go to stages page
    // the accommodation card should show an edit button
    // click the edit button and make changes to the accommodation and save them
    // check if the changes are reflected on the accommodation detail page and on the stage detail page

    // log out
    // without login, the user should be redirected from the edit page.

    expect(true, 'This test needs to be implemented').toBeTruthy();
  });
});
