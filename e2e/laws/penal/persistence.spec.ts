import { expect, test } from '@playwright/test';
import { pinNextPenalScenario, seed } from '../../fixtures/seed';

test.describe('Penal — persistence', () => {
  test('a perfect submit persists score across reload', async ({ page }) => {
    await seed(page, {
      penal: {
        scenarios: { progress: pinNextPenalScenario('penal.scenario.A5'), turn: 0 },
      },
      randomSeed: 1,
    });

    await page.goto('/#/laws/penal/scenarios');
    await expect(page.getByTestId('penal-scenario-ref')).toHaveText('Scénář A5');

    const input = page.getByTestId('penal-answer-input');
    await input.fill('33');
    await input.press('Enter');
    await page.getByRole('button', { name: /vyhodnotit otázku/i }).click();
    await expect(page.getByTestId('penal-reveal-perfect')).toBeVisible();

    // Reload — the side panel should show A5 as mastered (score >= 2)
    await page.reload();
    const chip = page.getByTestId('chip-penal.scenario.A5').first();
    await expect(chip).toHaveAttribute('data-done', 'true');
  });

  test('reset clears scenario progress only (recall and other slices preserved)', async ({
    page,
  }) => {
    await seed(page, {
      penal: {
        scenarios: { progress: { 'penal.scenario.A1': { score: 2, lastAskedAtTurn: 0 } }, turn: 1 },
        recall: { progress: { 'penal.25': { score: 2, lastAskedAtTurn: 0 } }, turn: 1 },
      },
      lea: { progress: { 'lea.7': { score: 2, lastAskedAtTurn: 0 } }, turn: 1 },
      randomSeed: 1,
    });

    await page.goto('/#/laws/penal/scenarios');
    await page.getByTestId('penal-scenario-reset-button').click();
    await page.getByTestId('penal-scenario-reset-confirm-yes').click();

    // After reset, scenarios slice is empty
    const stored = await page.evaluate(() => localStorage.getItem('genk-pd:v1'));
    const parsed = JSON.parse(stored!);
    expect(parsed.penal.scenarios.progress).toEqual({});
    expect(parsed.penal.scenarios.turn).toBe(0);
    // Recall preserved
    expect(parsed.penal.recall.progress['penal.25']?.score).toBe(2);
    // LEA preserved
    expect(parsed.lea.progress['lea.7']?.score).toBe(2);
  });
});
