import { expect, test } from '@playwright/test';
import { pinNextQuestion, seed } from '../fixtures/seed';

test.describe('Responsive @responsive', () => {
  test('mobile: side panel is collapsible', async ({ page }) => {
    await seed(page, { progress: pinNextQuestion('10-0'), randomSeed: 1 });
    await page.goto('/#/codes/write');

    // The mobile sheet uses a <details> with summary "Přehled kódů — X% splněno".
    const summary = page.locator('summary');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('Přehled kódů');
    await expect(page.getByTestId('mobile-progress-percent')).toBeVisible();

    // Side panel grid should not be visible until opened.
    const mobilePanel = page.locator('details').getByTestId('side-panel');
    await expect(mobilePanel).not.toBeVisible();

    await summary.click();
    await expect(mobilePanel).toBeVisible();
  });

  test('mobile: question card and input are usable', async ({ page }) => {
    await seed(page, { progress: pinNextQuestion('10-0'), randomSeed: 1 });
    await page.goto('/#/codes/write');

    await expect(page.getByTestId('question-meaning')).toBeVisible();
    await page.getByTestId('code-input').fill('0');
    await page.getByTestId('submit-button').click();
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-kind', 'correct');
  });
});
