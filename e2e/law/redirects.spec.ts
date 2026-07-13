import { expect, test } from '@playwright/test';
import { seed } from '../fixtures/seed';

test.describe('Old route redirects', () => {
  test('/#/sasp redirects to /#/law and shows law quiz', async ({ page }) => {
    await seed(page, { randomSeed: 1 });
    await page.goto('/#/sasp');
    await expect(page).toHaveURL(/#\/law$/);
    await expect(page.getByTestId('law-progress-percent')).toBeVisible();
  });

  test('/#/laws/lea redirects to /#/law and shows law quiz', async ({ page }) => {
    await seed(page, { randomSeed: 1 });
    await page.goto('/#/laws/lea');
    await expect(page).toHaveURL(/#\/law$/);
    await expect(page.getByTestId('law-progress-percent')).toBeVisible();
  });

  test('/#/laws/penal redirects to /#/law and shows law quiz', async ({ page }) => {
    await seed(page, { randomSeed: 1 });
    await page.goto('/#/laws/penal');
    await expect(page).toHaveURL(/#\/law$/);
    await expect(page.getByTestId('law-progress-percent')).toBeVisible();
  });

  test('/#/laws/penal/scenarios redirects to /#/law and shows law quiz', async ({ page }) => {
    await seed(page, { randomSeed: 1 });
    await page.goto('/#/laws/penal/scenarios');
    await expect(page).toHaveURL(/#\/law$/);
    await expect(page.getByTestId('law-progress-percent')).toBeVisible();
  });

  test('/#/penal/recall redirects to /#/law and shows law quiz', async ({ page }) => {
    await seed(page, { randomSeed: 1 });
    await page.goto('/#/penal/recall');
    await expect(page).toHaveURL(/#\/law$/);
    await expect(page.getByTestId('law-progress-percent')).toBeVisible();
  });

  test('/#/laws/penal/recall redirects to /#/law and shows law quiz', async ({ page }) => {
    await seed(page, { randomSeed: 1 });
    await page.goto('/#/laws/penal/recall');
    await expect(page).toHaveURL(/#\/law$/);
    await expect(page.getByTestId('law-progress-percent')).toBeVisible();
  });
});
