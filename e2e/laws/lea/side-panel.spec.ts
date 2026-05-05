import { expect, test } from '@playwright/test';
import { LEA_QUESTION_IDS, pinNextLeaQuestion, seed, type SeedProgress } from '../../fixtures/seed';

test.describe('LEA side panel direct selection', () => {
  test('clicking a chip in the side panel switches the active question', async ({ page }) => {
    await seed(page, {
      lea: { progress: pinNextLeaQuestion('lea.16.B'), turn: 0 },
      randomSeed: 1,
    });
    await page.goto('/#/laws/lea');

    await expect(page.getByTestId('question-ref')).toHaveText('§16 B');

    await page.getByTestId('chip-lea.7').click();
    await expect(page.getByTestId('question-ref')).toHaveText('§7 A');

    await page.getByTestId('chip-lea.10').click();
    await expect(page.getByTestId('question-ref')).toHaveText('§10');
  });

  test('clicking a mastered chip on the completion screen reactivates the quiz', async ({ page }) => {
    const fullySaturated: SeedProgress = {};
    for (const id of LEA_QUESTION_IDS) {
      fullySaturated[id] = { score: 2, lastAskedAtTurn: -10 };
    }
    await seed(page, {
      lea: { progress: fullySaturated, turn: 0 },
      randomSeed: 1,
    });
    await page.goto('/#/laws/lea');

    await expect(page.getByTestId('lea-congrats')).toBeVisible();

    await page.getByTestId('chip-lea.16.B').click();

    await expect(page.getByTestId('lea-congrats')).toHaveCount(0);
    await expect(page.getByTestId('question-ref')).toHaveText('§16 B');
    await expect(page.getByTestId('answer-input')).toBeVisible();
  });

  test('marks the active question with aria-current in the side panel', async ({ page }) => {
    await seed(page, {
      lea: { progress: pinNextLeaQuestion('lea.16.B'), turn: 0 },
      randomSeed: 1,
    });
    await page.goto('/#/laws/lea');

    await expect(page.getByTestId('chip-lea.16.B')).toHaveAttribute('aria-current', 'true');
    await expect(page.getByTestId('chip-lea.7')).not.toHaveAttribute('aria-current', /.*/);

    await page.getByTestId('chip-lea.7').click();
    await expect(page.getByTestId('chip-lea.7')).toHaveAttribute('aria-current', 'true');
    await expect(page.getByTestId('chip-lea.16.B')).not.toHaveAttribute('aria-current', /.*/);
  });
});
