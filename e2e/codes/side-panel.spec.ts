import { expect, test } from '@playwright/test';
import { seed } from '../fixtures/seed';

test.describe('Side panel — chip colors and progress', () => {
  test('chip data-score reflects stored score', async ({ page }) => {
    await seed(page, {
      progress: {
        '10-0': { score: 3, lastAskedAtTurn: 0 },
        '10-1': { score: -2, lastAskedAtTurn: 0 },
        '10-3': { score: 1, lastAskedAtTurn: 0 },
      },
      randomSeed: 1,
    });
    await page.goto('/#/codes/write');

    await expect(page.getByTestId('chip-10-0')).toHaveAttribute('data-score', '3');
    await expect(page.getByTestId('chip-10-0')).toHaveAttribute('data-done', 'true');
    await expect(page.getByTestId('chip-10-1')).toHaveAttribute('data-score', '-2');
    await expect(page.getByTestId('chip-10-3')).toHaveAttribute('data-score', '1');
  });

  test('progress percent reflects accumulated score in the active filter', async ({ page }) => {
    await seed(page, {
      progress: {
        '10-0': { score: 3, lastAskedAtTurn: 0 },
        '10-1': { score: 3, lastAskedAtTurn: 0 },
        '10-3': { score: 0, lastAskedAtTurn: 0 },
      },
      randomSeed: 1,
    });
    await page.goto('/#/codes/write');

    const percentText = await page.getByTestId('progress-percent').textContent();
    expect(percentText).toMatch(/^\d+%$/);
    const pct = Number(percentText!.replace('%', ''));
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(100);
    await expect(page.getByTestId('progress-bar')).toHaveAttribute('data-pct', String(pct));
  });

  test('progress bar reaches 100% and gets the gold-pulse data flag', async ({ page }) => {
    // Saturate every mandatory code so filter (mandatory only) is fully complete.
    const progress: Record<string, { score: number; lastAskedAtTurn: number }> = {};
    const mandatoryIds = [
      '10-0','10-1','10-3','10-4','10-5','10-7','10-8','10-9','10-10','10-11',
      '10-12','10-13','10-14','10-15','10-16','10-18','10-19','10-20','10-21','10-22',
      '10-23','10-25','10-32','10-41','10-42','10-50','10-51','10-52','10-53','10-62',
      '10-67','10-68','10-69','10-70','10-80','10-95','10-97','10-98','10-99','10-100',
    ];
    for (const id of mandatoryIds) progress[id] = { score: 3, lastAskedAtTurn: 0 };
    await seed(page, { progress, randomSeed: 1 });
    await page.goto('/#/codes/write');

    const bar = page.getByTestId('progress-bar');
    await expect(bar).toHaveAttribute('data-pct', '100');
    await expect(bar).toHaveAttribute('data-complete', 'true');
  });
});
