import { expect, test } from '@playwright/test';
import { pinNextQuestion, seed, STORAGE_KEY } from '../fixtures/seed';

test.describe('Codes — skip button', () => {
  test('skip in write mode masters the code (+2) and advances', async ({ page }) => {
    await seed(page, { progress: pinNextQuestion('10-0'), randomSeed: 1 });
    await page.goto('/#/codes/write');

    await expect(page.getByTestId('question-meaning')).toHaveText('Vizuální kontakt ztracen');
    await page.getByTestId('codes-skip').click();

    // 10-0 was the only eligible question; after skip the pool is empty → congrats.
    await expect(page.getByTestId('congrats-banner')).toBeVisible();

    const stored = await page.evaluate((key) => {
      return JSON.parse(localStorage.getItem(key) ?? '{}');
    }, STORAGE_KEY);
    expect(stored.codes.progress['10-0'].score).toBe(2);
  });

  test('skip in choose mode masters the code (+2) and advances', async ({ page }) => {
    await seed(page, { progress: pinNextQuestion('10-0'), randomSeed: 1 });
    await page.goto('/#/codes/choose');

    await expect(page.getByTestId('question-code')).toHaveText('10-0');
    await page.getByTestId('codes-skip').click();

    await expect(page.getByTestId('congrats-banner')).toBeVisible();

    const stored = await page.evaluate((key) => {
      return JSON.parse(localStorage.getItem(key) ?? '{}');
    }, STORAGE_KEY);
    expect(stored.codes.progress['10-0'].score).toBe(2);
  });

  test('skip after a wrong answer overrides score to +2', async ({ page }) => {
    await seed(page, { progress: pinNextQuestion('10-0'), randomSeed: 1 });
    await page.goto('/#/codes/write');

    await page.getByTestId('code-input').fill('44'); // wrong
    await page.getByTestId('submit-button').click();
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-kind', 'wrong-existing');

    // After wrong answer: score = -1.
    let stored = await page.evaluate((key) => {
      return JSON.parse(localStorage.getItem(key) ?? '{}');
    }, STORAGE_KEY);
    expect(stored.codes.progress['10-0'].score).toBe(-1);

    // Skip from feedback block → overrides to +2.
    await page.getByTestId('codes-skip').click();

    stored = await page.evaluate((key) => {
      return JSON.parse(localStorage.getItem(key) ?? '{}');
    }, STORAGE_KEY);
    expect(stored.codes.progress['10-0'].score).toBe(2);
  });
});
