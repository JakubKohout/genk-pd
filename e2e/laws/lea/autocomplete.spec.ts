import { expect, test } from '@playwright/test';
import { pinNextLeaQuestion, seed } from '../../fixtures/seed';

test.beforeEach(async ({ page }) => {
  await seed(page, {
    lea: { progress: pinNextLeaQuestion('lea.16.B'), turn: 0 },
    randomSeed: 1,
  });
  await page.goto('/#/laws/lea');
});

test('does not show suggestions below 4 characters', async ({ page }) => {
  await page.getByTestId('answer-input').fill('maj');
  await expect(page.getByTestId('autocomplete-list')).toHaveCount(0);
});

test('shows suggestions at 4 characters and Tab inserts the full quote', async ({ page }) => {
  const input = page.getByTestId('answer-input');
  await input.fill('majak');
  await expect(page.getByTestId('autocomplete-list')).toBeVisible();
  await input.press('Tab');
  await expect(input).toHaveValue(/výstražným zvukovým a rozhlasovým zařízením/);
});

test('found items are filtered out of suggestions', async ({ page }) => {
  const input = page.getByTestId('answer-input');
  await input.fill('maják');
  await input.press('Enter');
  await input.fill('majak');
  await expect(page.getByTestId('autocomplete-list')).toHaveCount(0);
});
