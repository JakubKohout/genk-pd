import { expect, test } from '@playwright/test';
import { pinNextLeaQuestion, seed } from '../../fixtures/seed';

test.describe('LEA quiz happy path', () => {
  test('navigates from home to LEA via /laws and answers one question', async ({ page }) => {
    await seed(page, {
      lea: { progress: pinNextLeaQuestion('lea.16.B'), turn: 0 },
      randomSeed: 1,
    });

    await page.goto('/');
    await page.getByRole('link', { name: /zákony/i }).click();
    await expect(page).toHaveURL(/#\/laws$/);
    await page.getByRole('link', { name: /law enforcement act/i }).click();
    await expect(page).toHaveURL(/#\/laws\/lea$/);

    await expect(page.getByTestId('question-ref')).toHaveText('§16 B');

    const input = page.getByTestId('answer-input');
    for (const value of ['ústně', 'písemně', 'maják', 'varovný výstřel', 'gestem']) {
      await input.fill(value);
      await input.press('Enter');
    }
    await expect(page.getByTestId('chip-correct')).toHaveCount(5);

    await page.getByRole('button', { name: /vyhodnotit otázku/i }).click();
    await expect(page.getByTestId('reveal-perfect')).toBeVisible();
  });
});
