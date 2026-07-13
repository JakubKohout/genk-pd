import { expect, test } from '@playwright/test';
import { seed } from '../fixtures/seed';

test.describe('Law side panel filters', () => {
  test('theme filter checkboxes include scenky and are checked by default', async ({ page }) => {
    await seed(page, { randomSeed: 1 });
    await page.goto('/#/law');
    await expect(page.getByTestId('law-filter-theme-scenky')).toBeChecked();
    await expect(page.getByTestId('law-filter-theme-paragrafy')).toBeChecked();
  });

  test('disabling scenky theme hides scenario chips from the panel', async ({ page }) => {
    await seed(page, { randomSeed: 1 });
    await page.goto('/#/law');
    await page.getByTestId('law-group-scenky').click();
    await expect(page.getByTestId('chip-penal.scenario.A1')).toBeVisible();
    await page.getByTestId('law-filter-theme-scenky').uncheck();
    await expect(page.getByTestId('chip-penal.scenario.A1')).toHaveCount(0);
  });

  test('theme filter checkboxes are rendered', async ({ page }) => {
    await seed(page, { randomSeed: 1 });
    await page.goto('/#/law');
    await expect(page.getByTestId('law-filter-theme-paragrafy')).toBeChecked();
    await expect(page.getByTestId('law-filter-theme-pojmy')).toBeChecked();
    await expect(page.getByTestId('law-filter-theme-hodnosti')).toBeChecked();
  });

  test('progress percent is visible', async ({ page }) => {
    await seed(page, { randomSeed: 1 });
    await page.goto('/#/law');
    await expect(page.getByTestId('law-progress-percent')).toContainText('%');
  });

  test('progress percent updates when a question is mastered', async ({ page }) => {
    await seed(page, { randomSeed: 1 });
    await page.goto('/#/law');
    const before = await page.getByTestId('law-progress-percent').textContent();
    // Manually seed a mastered question by evaluating storage
    await page.evaluate(() => {
      const raw = localStorage.getItem('genk-pd:v1');
      const state = JSON.parse(raw!);
      state.law.progress['sasp.choice.pojmy.1'] = { score: 2, lastAskedAtTurn: 0 };
      localStorage.setItem('genk-pd:v1', JSON.stringify(state));
    });
    await page.reload();
    const after = await page.getByTestId('law-progress-percent').textContent();
    // After mastering one, percentage should be different (higher)
    expect(after).not.toBe(before);
  });
});
