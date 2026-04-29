import { expect, test } from '@playwright/test';
import { pinNextQuestion, seed } from '../fixtures/seed';

test.describe('Mode 1 — psaní kódu', () => {
  test('correct answer shows green feedback', async ({ page }) => {
    await seed(page, { progress: pinNextQuestion('10-0'), randomSeed: 1 });
    await page.goto('/#/codes/write');

    await expect(page.getByTestId('question-meaning')).toHaveText('Vizuální kontakt ztracen');
    await page.getByTestId('code-input').fill('0');
    await page.getByTestId('submit-button').click();

    const fb = page.getByTestId('feedback');
    await expect(fb).toHaveAttribute('data-kind', 'correct');
    await expect(fb).toContainText('Správně');
    await expect(fb).toContainText('10-0');
  });

  test('wrong existing code shows both meanings', async ({ page }) => {
    // 10-44 is "rare" so it's not in the default mandatory-only filter pool —
    // it is, however, still recognized as a real code when looked up by number.
    await seed(page, { progress: pinNextQuestion('10-0'), randomSeed: 1 });
    await page.goto('/#/codes/write');

    await expect(page.getByTestId('question-meaning')).toHaveText('Vizuální kontakt ztracen');
    await page.getByTestId('code-input').fill('44'); // valid but wrong
    await page.getByTestId('submit-button').click();

    const fb = page.getByTestId('feedback');
    await expect(fb).toHaveAttribute('data-kind', 'wrong-existing');
    await expect(fb).toContainText('Vizuální kontakt ztracen');
    await expect(fb).toContainText('Osoba zemřela');
  });

  test('nonexistent code shows neexistující kód feedback', async ({ page }) => {
    await seed(page, { progress: pinNextQuestion('10-0'), randomSeed: 1 });
    await page.goto('/#/codes/write');

    await expect(page.getByTestId('question-meaning')).toHaveText('Vizuální kontakt ztracen');
    await page.getByTestId('code-input').fill('999');
    await page.getByTestId('submit-button').click();

    const fb = page.getByTestId('feedback');
    await expect(fb).toHaveAttribute('data-kind', 'wrong-nonexistent');
    await expect(fb).toContainText('neexistující kód');
  });

  test('Enter submits and Enter on Next advances', async ({ page }) => {
    await seed(page, { progress: pinNextQuestion('10-0'), randomSeed: 1 });
    await page.goto('/#/codes/write');

    await page.getByTestId('code-input').fill('0');
    await page.getByTestId('code-input').press('Enter');
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-kind', 'correct');

    // Pressing Enter on the focused Next button advances to the next question.
    await page.getByTestId('next-button').press('Enter');
    // No question available (we saturated everything except 10-0; we just answered correctly so it's now +1).
    // The next render will pick 10-0 again (only eligible code).
    await expect(page.getByTestId('question-meaning')).toBeVisible();
  });
});
