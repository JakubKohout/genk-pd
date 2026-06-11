import { expect, test } from '@playwright/test';
import { pinNextGeoPoi, seed } from '../fixtures/seed';

test.describe('Geo blind map flow', () => {
  test('navigates from home to /geo/blind and shows the prompt', async ({ page }) => {
    await seed(page, {
      geo: { blind: { progress: pinNextGeoPoi('city.vinewood-sign'), turn: 0 } },
      randomSeed: 1,
    });
    await page.goto('/');
    await page.getByRole('link', { name: 'Geografie', exact: true }).click();
    await expect(page).toHaveURL(/#\/geo$/);
    await expect(page.getByTestId('geo-blind-prompt')).toContainText('Vinewood Sign');
    await expect(page.getByTestId('geo-mode-tabs')).toBeVisible();
  });

  test('skip masters the POI (+2) and advances', async ({ page }) => {
    await seed(page, {
      geo: { blind: { progress: pinNextGeoPoi('city.vinewood-sign'), turn: 0 } },
      randomSeed: 2,
    });
    await page.goto('/#/geo/blind');
    await expect(page.getByTestId('geo-blind-prompt')).toContainText('Vinewood Sign');
    await page.getByTestId('geo-blind-skip').click();
    // After skip every POI is mastered → completion screen
    await expect(page.getByTestId('geo-blind-congrats')).toBeVisible();
    const stored = await page.evaluate(() => localStorage.getItem('genk-pd:v1'));
    const parsed = JSON.parse(stored!);
    expect(parsed.geo.blind.progress['city.vinewood-sign'].score).toBe(2);
  });

  test('clicking the map produces a feedback card and advances available', async ({ page }) => {
    await seed(page, {
      geo: { blind: { progress: pinNextGeoPoi('city.vinewood-sign'), turn: 0 } },
      randomSeed: 3,
    });
    await page.goto('/#/geo/blind');
    await expect(page.getByTestId('geo-blind-prompt')).toBeVisible();
    // Wait a moment for tiles to render and Leaflet to attach events.
    await page.waitForTimeout(300);
    const map = page.getByTestId('geo-map');
    const box = await map.boundingBox();
    expect(box).not.toBeNull();
    // Click somewhere in the lower-right corner, which is unlikely to be Vinewood Sign.
    await map.click({ position: { x: box!.width * 0.85, y: box!.height * 0.85 } });
    await expect(page.getByTestId('geo-blind-feedback')).toBeVisible();
    await expect(page.getByTestId('geo-blind-next')).toBeVisible();
  });

  test('reset button clears blind progress with confirmation', async ({ page }) => {
    await seed(page, {
      geo: {
        blind: {
          progress: { 'city.majak': { score: 2, lastAskedAtTurn: 0 } },
          turn: 1,
        },
      },
      randomSeed: 4,
    });
    await page.goto('/#/geo/blind');
    await page.getByTestId('geo-blind-reset-button').click();
    await page.getByTestId('geo-blind-reset-confirm-yes').click();
    const stored = await page.evaluate(() => localStorage.getItem('genk-pd:v1'));
    const parsed = JSON.parse(stored!);
    expect(parsed.geo.blind.progress).toEqual({});
  });
});
