import { expect, test } from '@playwright/test';
import { pinNextPenalScenario, seed } from '../../fixtures/seed';

test.describe('Penal Code — scénka mode A', () => {
  test('navigates from /laws to /laws/penal/scenarios and answers a scenario perfectly', async ({
    page,
  }) => {
    await seed(page, {
      penal: {
        scenarios: { progress: pinNextPenalScenario('penal.scenario.A1'), turn: 0 },
      },
      randomSeed: 1,
    });

    await page.goto('/');
    await page.getByRole('link', { name: 'Zákony', exact: true }).click();
    await expect(page).toHaveURL(/#\/laws$/);
    await page.getByRole('link', { name: /penal code/i }).click();
    await expect(page).toHaveURL(/#\/laws\/penal$/);
    // Index route renders scenarios mode by default
    await expect(page.getByTestId('penal-scenario-ref')).toHaveText('Scénář A1');
    // Tabs are visible at the top
    await expect(page.getByTestId('penal-tab-scenarios')).toBeVisible();
    await expect(page.getByTestId('penal-tab-recall')).toBeVisible();

    const input = page.getByTestId('penal-answer-input');
    await input.fill('26a');
    await input.press('Enter');
    await input.fill('14a');
    await input.press('Enter');
    await expect(page.getByTestId('chip-correct')).toHaveCount(2);

    await page.getByRole('button', { name: /vyhodnotit otázku/i }).click();
    await expect(page.getByTestId('penal-reveal-perfect')).toBeVisible();
  });

  test('mode tabs switch between scenarios and recall', async ({ page }) => {
    await seed(page, {
      penal: {
        scenarios: { progress: pinNextPenalScenario('penal.scenario.A1'), turn: 0 },
      },
      randomSeed: 1,
    });

    await page.goto('/#/laws/penal');
    // Default = scenarios mode (index route)
    await expect(page.getByTestId('penal-scenario-ref')).toBeVisible();

    // Switch to recall
    await page.getByTestId('penal-tab-recall').click();
    await expect(page).toHaveURL(/#\/laws\/penal\/recall$/);
    await expect(page.getByTestId('penal-recall-ref')).toBeVisible();

    // Switch back to scenarios
    await page.getByTestId('penal-tab-scenarios').click();
    await expect(page).toHaveURL(/#\/laws\/penal\/scenarios$/);
    await expect(page.getByTestId('penal-scenario-ref')).toBeVisible();
  });

  test('rejects paragraf without sub when paragraf has subs', async ({ page }) => {
    await seed(page, {
      penal: {
        scenarios: { progress: pinNextPenalScenario('penal.scenario.A2'), turn: 0 },
      },
      randomSeed: 1,
    });

    await page.goto('/#/laws/penal/scenarios');
    await expect(page.getByTestId('penal-scenario-ref')).toHaveText('Scénář A2');

    const input = page.getByTestId('penal-answer-input');
    await input.fill('25'); // §25 has subs — without sub this is invalid
    await input.press('Enter');
    await expect(page.getByTestId('chip-wrong')).toBeVisible();
  });

  test('autocomplete suggests sub-paragrafy when typing a numeric ID', async ({ page }) => {
    await seed(page, {
      penal: {
        scenarios: { progress: pinNextPenalScenario('penal.scenario.A1'), turn: 0 },
      },
      randomSeed: 1,
    });

    await page.goto('/#/laws/penal/scenarios');
    const input = page.getByTestId('penal-answer-input');
    await input.fill('26');
    const list = page.getByTestId('penal-autocomplete-list');
    await expect(list).toBeVisible();
    await expect(list).toContainText('§26a');
    await expect(list).toContainText('§26b');
    await expect(list).toContainText('§26c');
    await expect(list).toContainText('§26d');
  });

  test('hard mode checkbox suppresses autocomplete suggestions', async ({ page }) => {
    await seed(page, {
      penal: {
        scenarios: { progress: pinNextPenalScenario('penal.scenario.A1'), turn: 0 },
      },
      randomSeed: 1,
    });

    await page.goto('/#/laws/penal/scenarios');
    const input = page.getByTestId('penal-answer-input');

    // Default: typing shows autocomplete
    await input.fill('26');
    await expect(page.getByTestId('penal-autocomplete-list')).toBeVisible();

    // Clear input first so the dropdown closes and stops intercepting clicks
    // on the checkbox sitting in the footer below the input.
    await input.fill('');
    await page.getByTestId('penal-hardmode-toggle').check();
    await input.fill('26');
    await expect(page.getByTestId('penal-autocomplete-list')).toHaveCount(0);
  });

  test('reveals educational note when scenario has one', async ({ page }) => {
    await seed(page, {
      penal: {
        scenarios: { progress: pinNextPenalScenario('penal.scenario.A1'), turn: 0 },
      },
      randomSeed: 1,
    });

    await page.goto('/#/laws/penal/scenarios');
    const input = page.getByTestId('penal-answer-input');
    await input.fill('26a');
    await input.press('Enter');
    await input.fill('14a');
    await input.press('Enter');

    await page.getByRole('button', { name: /vyhodnotit otázku/i }).click();
    await expect(page.getByTestId('penal-scenario-note')).toContainText('§25');
  });
});
