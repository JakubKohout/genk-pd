import { expect, test } from '@playwright/test';
import { seed } from '../fixtures/seed';

test.describe('Importance filter', () => {
  test('toggling rare adds rare codes to the side panel', async ({ page }) => {
    await seed(page, { randomSeed: 1 });
    await page.goto('/codes/write');

    // Rare code 10-44 should not be shown by default.
    await expect(page.getByTestId('chip-10-44')).toHaveCount(0);

    await page.getByTestId('filter-rare').check();

    await expect(page.getByTestId('chip-10-44')).toBeVisible();
  });

  test('disabling mandatory removes mandatory codes from panel', async ({ page }) => {
    await seed(page, { randomSeed: 1 });
    await page.goto('/codes/write');

    await expect(page.getByTestId('chip-10-0')).toBeVisible();
    await page.getByTestId('filter-mandatory').uncheck();
    await expect(page.getByTestId('chip-10-0')).toHaveCount(0);
  });

  test('disabling all filters shows empty-pool message and panel hint', async ({ page }) => {
    await seed(page, { randomSeed: 1 });
    await page.goto('/codes/write');

    await page.getByTestId('filter-mandatory').uncheck();
    // congratsbanner appears when pool is empty
    await expect(page.getByTestId('congrats-banner')).toBeVisible();
  });
});
