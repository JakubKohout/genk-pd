import { expect, test } from '@playwright/test';
import { pinNextQuestion, seed } from '../fixtures/seed';

test.describe('Persistence', () => {
  test('answer survives a page reload', async ({ page }) => {
    await seed(page, { progress: pinNextQuestion('10-0'), randomSeed: 1 });
    await page.goto('/#/codes/write');

    await page.getByTestId('code-input').fill('0');
    await page.getByTestId('submit-button').click();
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-kind', 'correct');

    await page.reload();

    // After reload, 10-0 chip should be at score >= 1
    const score = await page.getByTestId('chip-10-0').getAttribute('data-score');
    expect(Number(score)).toBeGreaterThanOrEqual(1);
  });

  test('Reset clears progress and persists empty state across reload', async ({ page }) => {
    await seed(page, {
      progress: { '10-0': { score: 2, lastAskedAtTurn: 0 } },
      randomSeed: 1,
    });
    await page.goto('/#/codes/write');

    await expect(page.getByTestId('chip-10-0')).toHaveAttribute('data-score', '2');

    // Use the page-level reset button (in CodesPage footer)
    await page.getByTestId('reset-button').first().click();
    await page.getByTestId('reset-confirm-yes').click();

    await expect(page.getByTestId('chip-10-0')).toHaveAttribute('data-score', '0');
    await page.reload();
    await expect(page.getByTestId('chip-10-0')).toHaveAttribute('data-score', '0');
  });
});
