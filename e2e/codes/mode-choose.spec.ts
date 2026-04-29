import { expect, test } from '@playwright/test';
import { pinNextQuestion, seed } from '../fixtures/seed';

test.describe('Mode 2 — výběr významu', () => {
  test('shows the code and 5 options', async ({ page }) => {
    await seed(page, { progress: pinNextQuestion('10-0'), randomSeed: 7 });
    await page.goto('/#/codes/choose');

    await expect(page.getByTestId('question-code')).toHaveText('10-0');
    const options = page.getByTestId('options').getByRole('button');
    await expect(options).toHaveCount(5);
  });

  test('correct choice → green feedback', async ({ page }) => {
    await seed(page, { progress: pinNextQuestion('10-50'), randomSeed: 7 });
    await page.goto('/#/codes/choose');

    await expect(page.getByTestId('question-code')).toHaveText('10-50');
    await page.getByTestId('option-10-50').click();

    const fb = page.getByTestId('feedback');
    await expect(fb).toHaveAttribute('data-kind', 'correct');
  });

  test('wrong choice highlights the correct answer', async ({ page }) => {
    await seed(page, { progress: pinNextQuestion('10-50'), randomSeed: 7 });
    await page.goto('/#/codes/choose');

    await expect(page.getByTestId('question-code')).toHaveText('10-50');

    // Click the first option that is NOT the correct one.
    const wrongOption = page
      .getByTestId('options')
      .locator('[data-testid^="option-"]:not([data-testid="option-10-50"])')
      .first();
    await wrongOption.click();

    const fb = page.getByTestId('feedback');
    await expect(fb).toHaveAttribute('data-kind', 'wrong');
    // Correct answer is highlighted with data-correct="true"
    await expect(page.getByTestId('option-10-50')).toHaveAttribute('data-correct', 'true');
  });

  test('options include codes from the same decade when decade is rich', async ({ page }) => {
    // 10-50's decade (50..59) has 10-50, 10-51, 10-52, 10-53, 10-54, 10-55 — plenty.
    await seed(page, { progress: pinNextQuestion('10-50'), randomSeed: 42 });
    await page.goto('/#/codes/choose');

    const optionIds = await page
      .getByTestId('options')
      .locator('[data-testid^="option-"]')
      .evaluateAll((nodes) =>
        nodes.map((n) => (n as HTMLElement).dataset['testid']!.replace('option-', '')),
      );

    // Distractors should include at least 2 from decade 50..59 (excluding 10-50 itself).
    const decadeMates = optionIds.filter((id) => {
      if (id === '10-50') return false;
      const num = Number(id.replace('10-', ''));
      return num >= 50 && num <= 59;
    });
    expect(decadeMates.length).toBeGreaterThanOrEqual(2);
  });
});
