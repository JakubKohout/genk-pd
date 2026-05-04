import { expect, test } from '@playwright/test';
import { pinNextLeaQuestion, seed } from '../../fixtures/seed';

test.beforeEach(async ({ page }) => {
  await seed(page, {
    lea: { progress: pinNextLeaQuestion('lea.16.B'), turn: 0 },
    randomSeed: 1,
  });
  await page.goto('/#/laws/lea');
});

test('perfect submit → +2 score, perfect banner', async ({ page }) => {
  for (const value of ['ústně', 'písemně', 'maják', 'varovný výstřel', 'gestem']) {
    await page.getByTestId('answer-input').fill(value);
    await page.getByTestId('answer-input').press('Enter');
  }
  await page.getByRole('button', { name: /vyhodnotit otázku/i }).click();
  await expect(page.getByTestId('reveal-perfect')).toBeVisible();

  const score = await page.evaluate(() => {
    const raw = localStorage.getItem('genk-pd:v1');
    return raw ? JSON.parse(raw).lea.progress['lea.16.B']?.score : null;
  });
  expect(score).toBe(2);
});

test('imperfect submit → -2 score, missed and wrong rows visible', async ({ page }) => {
  await page.getByTestId('answer-input').fill('maják');
  await page.getByTestId('answer-input').press('Enter');
  await page.getByTestId('answer-input').fill('blbost');
  await page.getByTestId('answer-input').press('Enter');
  await page.getByRole('button', { name: /vyhodnotit otázku/i }).click();
  await expect(page.getByTestId('chip-missed').first()).toBeVisible();
  await expect(page.getByTestId('chip-wrong')).toBeVisible();
  const score = await page.evaluate(() => {
    const raw = localStorage.getItem('genk-pd:v1');
    return raw ? JSON.parse(raw).lea.progress['lea.16.B']?.score : null;
  });
  expect(score).toBe(-2);
});

