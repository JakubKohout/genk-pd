import { expect, test } from '@playwright/test';
import { seed } from '../fixtures/seed';

test('Geo progress persists across reload', async ({ page }) => {
  await seed(page, {
    geo: {
      blind: {
        progress: { 'landmark.majak': { score: 2, lastAskedAtTurn: 0 } },
        turn: 1,
      },
    },
  });
  await page.goto('/#/geo/blind');
  await expect(page.getByTestId('geo-blind-progress-percent')).toContainText(/%/);
  const before = await page.getByTestId('geo-blind-progress-percent').textContent();

  await page.reload();
  await expect(page.getByTestId('geo-blind-progress-percent')).toHaveText(before!);
});

test('Category filter persists across modes and reloads', async ({ page }) => {
  await seed(page, {
    geo: {
      categoryFilter: { street: false, landmark: true, pd: true },
    },
  });
  await page.goto('/#/geo/blind');
  await expect(page.getByTestId('geo-filter-street')).not.toBeChecked();
  await page.getByTestId('geo-tab-name').click();
  await expect(page.getByTestId('geo-filter-street')).not.toBeChecked();
  await page.reload();
  await expect(page.getByTestId('geo-filter-street')).not.toBeChecked();
});

test('Reset of one mode does not affect the other', async ({ page }) => {
  await seed(page, {
    geo: {
      blind: { progress: { 'landmark.majak': { score: 2, lastAskedAtTurn: 0 } }, turn: 1 },
      name: { progress: { 'landmark.pila': { score: 2, lastAskedAtTurn: 0 } }, turn: 1 },
    },
  });
  await page.goto('/#/geo/blind');
  await page.getByTestId('geo-blind-reset-button').click();
  await page.getByTestId('geo-blind-reset-confirm-yes').click();
  const stored = await page.evaluate(() => localStorage.getItem('genk-pd:v1'));
  const parsed = JSON.parse(stored!);
  expect(parsed.geo.blind.progress).toEqual({});
  expect(parsed.geo.name.progress['landmark.pila']?.score).toBe(2);
});
