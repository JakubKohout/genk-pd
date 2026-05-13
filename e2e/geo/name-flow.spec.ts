import { expect, test } from '@playwright/test';
import { pinNextGeoPoi, seed } from '../fixtures/seed';

test.describe('Geo name (what is here) flow', () => {
  test('switches to /geo/name via tab and shows the input', async ({ page }) => {
    await seed(page, {
      geo: { name: { progress: pinNextGeoPoi('landmark.vinewood-sign'), turn: 0 } },
      randomSeed: 1,
    });
    await page.goto('/#/geo/blind');
    await page.getByTestId('geo-tab-name').click();
    await expect(page).toHaveURL(/#\/geo\/name$/);
    await expect(page.getByTestId('geo-answer-input')).toBeVisible();
    await expect(page.getByTestId('geo-name-prompt')).toContainText('Co je tady?');
  });

  test('correct name submission marks POI mastered', async ({ page }) => {
    await seed(page, {
      geo: { name: { progress: pinNextGeoPoi('landmark.vinewood-sign'), turn: 0 } },
      randomSeed: 2,
    });
    await page.goto('/#/geo/name');
    await page.getByTestId('geo-answer-input').fill('Vinewood Sign');
    await page.getByTestId('geo-answer-submit').click();
    await expect(page.getByTestId('geo-name-feedback')).toHaveAttribute('data-hit', 'true');
    const stored = await page.evaluate(() => localStorage.getItem('genk-pd:v1'));
    const parsed = JSON.parse(stored!);
    expect(parsed.geo.name.progress['landmark.vinewood-sign'].score).toBe(2);
  });

  test('alias also matches (cedule -> Vinewood Sign)', async ({ page }) => {
    await seed(page, {
      geo: { name: { progress: pinNextGeoPoi('landmark.vinewood-sign'), turn: 0 } },
      randomSeed: 3,
    });
    await page.goto('/#/geo/name');
    await page.getByTestId('geo-answer-input').fill('cedule');
    await page.getByTestId('geo-answer-submit').click();
    await expect(page.getByTestId('geo-name-feedback')).toHaveAttribute('data-hit', 'true');
  });

  test('hard mode toggle hides autocomplete', async ({ page }) => {
    await seed(page, {
      geo: { name: { progress: pinNextGeoPoi('landmark.vinewood-sign'), turn: 0 } },
      randomSeed: 4,
    });
    await page.goto('/#/geo/name');
    await page.getByTestId('geo-answer-input').fill('vine');
    await expect(page.getByTestId('geo-autocomplete-list')).toBeVisible();
    await page.getByTestId('geo-answer-input').fill('');
    await page.getByTestId('geo-hard-mode').check();
    await page.getByTestId('geo-answer-input').fill('vine');
    await expect(page.getByTestId('geo-autocomplete-list')).toBeHidden();
  });

  test('skip masters POI (+2) and advances', async ({ page }) => {
    await seed(page, {
      geo: { name: { progress: pinNextGeoPoi('landmark.vinewood-sign'), turn: 0 } },
      randomSeed: 5,
    });
    await page.goto('/#/geo/name');
    await page.getByTestId('geo-name-skip').click();
    await expect(page.getByTestId('geo-name-congrats')).toBeVisible();
    const stored = await page.evaluate(() => localStorage.getItem('genk-pd:v1'));
    const parsed = JSON.parse(stored!);
    expect(parsed.geo.name.progress['landmark.vinewood-sign'].score).toBe(2);
  });
});
