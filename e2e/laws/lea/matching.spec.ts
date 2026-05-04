import { expect, test } from '@playwright/test';
import { pinNextLeaQuestion, seed } from '../../fixtures/seed';

test.beforeEach(async ({ page }) => {
  await seed(page, {
    lea: { progress: pinNextLeaQuestion('lea.16.B'), turn: 0 },
    randomSeed: 1,
  });
  await page.goto('/#/laws/lea');
});

test('alias match → green chip', async ({ page }) => {
  await page.getByTestId('answer-input').fill('majákem');
  await page.getByTestId('answer-input').press('Enter');
  await expect(page.getByTestId('chip-correct')).toHaveCount(1);
});

test('matching ignores diacritics', async ({ page }) => {
  await page.getByTestId('answer-input').fill('vystrazne svetlo');
  await page.getByTestId('answer-input').press('Enter');
  await expect(page.getByTestId('chip-correct')).toHaveCount(1);
});

test('duplicate of an already-found item → orange chip', async ({ page }) => {
  await page.getByTestId('answer-input').fill('maják');
  await page.getByTestId('answer-input').press('Enter');
  await page.getByTestId('answer-input').fill('výstražné světlo');
  await page.getByTestId('answer-input').press('Enter');
  await expect(page.getByTestId('chip-duplicate')).toHaveCount(1);
});

test('unknown answer → red chip', async ({ page }) => {
  await page.getByTestId('answer-input').fill('blbost');
  await page.getByTestId('answer-input').press('Enter');
  await expect(page.getByTestId('chip-wrong')).toHaveCount(1);
});

test('removing a chip via × works', async ({ page }) => {
  await page.getByTestId('answer-input').fill('blbost');
  await page.getByTestId('answer-input').press('Enter');
  await expect(page.getByTestId('chip-wrong')).toHaveCount(1);
  await page.getByTestId('chip-wrong').getByRole('button', { name: /odebrat/i }).click();
  await expect(page.getByTestId('chip-wrong')).toHaveCount(0);
});
