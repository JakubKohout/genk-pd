import { expect, test } from '@playwright/test';
import { pinNextLeaQuestion, seed, STORAGE_KEY } from '../../fixtures/seed';

test.describe('LEA — skip button', () => {
  test('skip in answering phase masters the question (+2) and advances to congrats', async ({
    page,
  }) => {
    await seed(page, {
      lea: { progress: pinNextLeaQuestion('lea.16.B'), turn: 0 },
      randomSeed: 1,
    });
    await page.goto('/#/laws/lea');

    await expect(page.getByTestId('question-ref')).toHaveText('§16 B');
    await page.getByTestId('lea-skip').click();

    // lea.16.B was the only eligible question; after skip → completion screen.
    await expect(page.getByTestId('lea-congrats')).toBeVisible();

    const stored = await page.evaluate((key) => {
      return JSON.parse(localStorage.getItem(key) ?? '{}');
    }, STORAGE_KEY);
    expect(stored.lea.progress['lea.16.B'].score).toBe(2);
  });

  test('skip in revealed phase overrides imperfect submit to +2', async ({ page }) => {
    await seed(page, {
      lea: { progress: pinNextLeaQuestion('lea.16.B'), turn: 0 },
      randomSeed: 1,
    });
    await page.goto('/#/laws/lea');

    await expect(page.getByTestId('question-ref')).toHaveText('§16 B');
    // Submit immediately without answering anything → imperfect → score -2.
    await page.getByRole('button', { name: /vyhodnotit otázku/i }).click();
    await expect(page.getByTestId('chip-missed').first()).toBeVisible();

    let stored = await page.evaluate((key) => {
      return JSON.parse(localStorage.getItem(key) ?? '{}');
    }, STORAGE_KEY);
    expect(stored.lea.progress['lea.16.B'].score).toBe(-2);

    await page.getByTestId('lea-skip').click();
    await expect(page.getByTestId('lea-congrats')).toBeVisible();

    stored = await page.evaluate((key) => {
      return JSON.parse(localStorage.getItem(key) ?? '{}');
    }, STORAGE_KEY);
    expect(stored.lea.progress['lea.16.B'].score).toBe(2);
  });
});
