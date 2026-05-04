import { expect, test } from '@playwright/test';
import { pinNextLeaQuestion, seed } from '../../fixtures/seed';

test.describe('LEA Responsive @responsive', () => {
  test('mobile: side panel is collapsible', async ({ page }) => {
    await seed(page, {
      lea: { progress: pinNextLeaQuestion('lea.16.B'), turn: 0 },
      randomSeed: 1,
    });
    await page.goto('/#/laws/lea');

    const summary = page.locator('summary');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('Přehled otázek');
    await expect(page.getByTestId('lea-mobile-progress-percent')).toBeVisible();

    // SidePanel inside <details> should not be visible until opened.
    const mobileSidePanel = page.locator('details').getByTestId('lea-progress-percent');
    await expect(mobileSidePanel).not.toBeVisible();

    await summary.click();
    await expect(mobileSidePanel).toBeVisible();
  });

  test('mobile: question card and input are usable; long chip wraps', async ({ page }) => {
    await seed(page, {
      lea: { progress: pinNextLeaQuestion('lea.16.B'), turn: 0 },
      randomSeed: 1,
    });
    await page.goto('/#/laws/lea');

    await expect(page.getByTestId('question-ref')).toHaveText('§16 B');
    const input = page.getByTestId('answer-input');
    await input.fill('majákem');
    await input.press('Enter');
    await expect(page.getByTestId('chip-correct')).toHaveCount(1);

    // The long-quote chip should fit within the viewport width.
    const chipBox = await page.getByTestId('chip-correct').boundingBox();
    const viewportWidth = page.viewportSize()?.width ?? 0;
    expect(chipBox).not.toBeNull();
    if (chipBox) {
      expect(chipBox.width).toBeLessThanOrEqual(viewportWidth);
    }
  });
});
