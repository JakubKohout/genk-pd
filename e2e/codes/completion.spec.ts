import { expect, test } from '@playwright/test';
import { seed } from '../fixtures/seed';

test.describe('Completion state', () => {
  test('shows congrats banner when all eligible codes are at +3', async ({ page }) => {
    // Saturate the rare set, filter to rare only
    await seed(page, {
      progress: {
        '10-2': { score: 3, lastAskedAtTurn: 0 },
        '10-6': { score: 3, lastAskedAtTurn: 0 },
        '10-24': { score: 3, lastAskedAtTurn: 0 },
        '10-44': { score: 3, lastAskedAtTurn: 0 },
        '10-49': { score: 3, lastAskedAtTurn: 0 },
        '10-54': { score: 3, lastAskedAtTurn: 0 },
        '10-55': { score: 3, lastAskedAtTurn: 0 },
        '10-71': { score: 3, lastAskedAtTurn: 0 },
      },
      importanceFilter: { mandatory: false, rare: true, unnecessary: false },
      randomSeed: 1,
    });
    await page.goto('/#/codes/write');

    await expect(page.getByTestId('congrats-banner')).toBeVisible();
    await expect(page.getByTestId('progress-bar')).toHaveAttribute('data-complete', 'true');
  });

  test('reset returns to a normal question from the congrats state', async ({ page }) => {
    await seed(page, {
      progress: {
        '10-2': { score: 3, lastAskedAtTurn: 0 },
        '10-6': { score: 3, lastAskedAtTurn: 0 },
        '10-24': { score: 3, lastAskedAtTurn: 0 },
        '10-44': { score: 3, lastAskedAtTurn: 0 },
        '10-49': { score: 3, lastAskedAtTurn: 0 },
        '10-54': { score: 3, lastAskedAtTurn: 0 },
        '10-55': { score: 3, lastAskedAtTurn: 0 },
        '10-71': { score: 3, lastAskedAtTurn: 0 },
      },
      importanceFilter: { mandatory: false, rare: true, unnecessary: false },
      randomSeed: 1,
    });
    await page.goto('/#/codes/write');

    await expect(page.getByTestId('congrats-banner')).toBeVisible();

    // Reset is rendered inside the congrats banner.
    await page.getByTestId('congrats-banner').getByTestId('reset-button').click();
    await page.getByTestId('reset-confirm-yes').click();

    await expect(page.getByTestId('congrats-banner')).toHaveCount(0);
    await expect(page.getByTestId('question-meaning')).toBeVisible();
  });
});
