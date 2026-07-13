import { expect, test } from '@playwright/test';
import { pinNextLawQuestion, seed } from '../fixtures/seed';

// sasp.choice.pojmy.1 — "Co odlišuje loupež od krádeže?" correctIndices:[0]
const CHOICE_ID = 'sasp.choice.pojmy.1';
// lea.16.B — §16 B, 5 items: ústně, písemně, maják, varovný výstřel, gestem
const ENUM_ID = 'lea.16.B';
// sasp.text.zasah.felony-code — text question, answer "Code 5"
const TEXT_ID = 'sasp.text.zasah.felony-code';

test.describe('Law unified quiz — choice flow', () => {
  test('index route shows a choice question with options', async ({ page }) => {
    await seed(page, {
      law: { progress: pinNextLawQuestion(CHOICE_ID), turn: 0 },
      randomSeed: 1,
    });
    await page.goto('/#/law');
    await expect(page.getByTestId('law-prompt')).toContainText('loupež');
    await expect(page.getByTestId('law-choice-options')).toBeVisible();
    await expect(page.getByTestId('law-choice-option-0')).toBeVisible();
  });

  test('correct choice reveals and masters the question (+2)', async ({ page }) => {
    await seed(page, {
      law: { progress: pinNextLawQuestion(CHOICE_ID), turn: 0 },
      randomSeed: 2,
    });
    await page.goto('/#/law');
    await page.getByTestId('law-choice-option-0').click();
    await page.getByTestId('law-choice-submit').click();
    await expect(page.getByTestId('law-reveal-correct')).toBeVisible();
    const stored = await page.evaluate(() => localStorage.getItem('genk-pd:v1'));
    expect(JSON.parse(stored!).law.progress[CHOICE_ID].score).toBe(2);
  });

  test('wrong choice shows wrong reveal', async ({ page }) => {
    await seed(page, {
      law: { progress: pinNextLawQuestion(CHOICE_ID), turn: 0 },
      randomSeed: 3,
    });
    await page.goto('/#/law');
    // Pick option index 1 (wrong — correct is index 0)
    await page.getByTestId('law-choice-option-1').click();
    await page.getByTestId('law-choice-submit').click();
    await expect(page.getByTestId('law-reveal-wrong')).toBeVisible();
  });

  test('next button appears after correct choice and navigates forward', async ({ page }) => {
    await seed(page, {
      law: { progress: pinNextLawQuestion(CHOICE_ID), turn: 0 },
      randomSeed: 4,
    });
    await page.goto('/#/law');
    await page.getByTestId('law-choice-option-0').click();
    await page.getByTestId('law-choice-submit').click();
    await expect(page.getByTestId('law-reveal-correct')).toBeVisible();
    // The "Další otázka" button (law-next) should appear in revealed state
    await expect(page.getByTestId('law-next')).toBeVisible();
    await page.getByTestId('law-next').click();
    // All others were saturated at +2 — the quiz is now complete
    await expect(page.getByTestId('law-congrats')).toBeVisible();
  });
});

test.describe('Law unified quiz — enumeration (LEA) flow', () => {
  test('shows enum input for an LEA-adapted question', async ({ page }) => {
    await seed(page, {
      law: { progress: pinNextLawQuestion(ENUM_ID), turn: 0 },
      randomSeed: 1,
    });
    await page.goto('/#/law');
    await expect(page.getByTestId('law-enum-input')).toBeVisible();
    // §16 B prompt
    await expect(page.getByTestId('law-prompt')).toBeVisible();
  });

  test('perfect enumeration submit reveals correct chips and scores +2', async ({ page }) => {
    await seed(page, {
      law: { progress: pinNextLawQuestion(ENUM_ID), turn: 0 },
      randomSeed: 1,
    });
    await page.goto('/#/law');
    const input = page.getByTestId('law-enum-input');
    const addBtn = page.getByTestId('law-enum-add');
    // Use the Add button to bypass autocomplete suggestion-fill on Enter
    for (const value of ['ústně', 'písemně', 'maják', 'varovný výstřel', 'gestem']) {
      await input.fill(value);
      await addBtn.click();
    }
    await page.getByTestId('law-enum-submit').click();
    // EnumerationInput shows itemized reveal via AnswerList — all chips correct
    await expect(page.getByTestId('chip-correct').first()).toBeVisible();
    // No missed entries
    await expect(page.getByTestId('chip-missed')).not.toBeVisible();
    const stored = await page.evaluate(() => localStorage.getItem('genk-pd:v1'));
    expect(JSON.parse(stored!).law.progress[ENUM_ID].score).toBe(2);
  });

  test('imperfect enumeration submit shows missed items and "Zapomněl jsi:" divider', async ({ page }) => {
    await seed(page, {
      law: { progress: pinNextLawQuestion(ENUM_ID), turn: 0 },
      randomSeed: 1,
    });
    await page.goto('/#/law');
    const input = page.getByTestId('law-enum-input');
    // Submit with only one correct item — imperfect; 4 items should be missed
    await input.fill('maják');
    await page.getByTestId('law-enum-add').click();
    await page.getByTestId('law-enum-submit').click();
    // EnumerationInput itemized reveal: one correct chip, four missed chips
    await expect(page.getByTestId('chip-correct').first()).toBeVisible();
    await expect(page.getByTestId('chip-missed').first()).toBeVisible();
    // "Zapomněl jsi:" divider is rendered by AnswerList when showMissedHeading=true
    await expect(page.getByText('Zapomněl jsi:')).toBeVisible();
    // "Další otázka" footer button still works in revealed state
    await expect(page.getByTestId('law-next')).toBeVisible();
  });
});

// penal.scenario.A5 — "zápalná láhev → prázdná benzínová pumpa", single expected: §33 (žhářství)
const PENAL_SCENARIO_ID = 'penal.scenario.A5';

test.describe('Law unified quiz — enumeration (Penal scenario / paragraph matcher) flow', () => {
  test('shows scenario box and enum input for a penal scenario question', async ({ page }) => {
    await seed(page, {
      law: { progress: pinNextLawQuestion(PENAL_SCENARIO_ID), turn: 0 },
      randomSeed: 1,
    });
    await page.goto('/#/law');
    await expect(page.getByTestId('law-scenario')).toBeVisible();
    await expect(page.getByTestId('law-enum-input')).toBeVisible();
    await expect(page.getByTestId('law-prompt')).toContainText('paragrafy');
  });

  test('correct paragraph answer (§33) yields correct chip and scores +2', async ({ page }) => {
    await seed(page, {
      law: { progress: pinNextLawQuestion(PENAL_SCENARIO_ID), turn: 0 },
      randomSeed: 1,
    });
    await page.goto('/#/law');
    const input = page.getByTestId('law-enum-input');
    const addBtn = page.getByTestId('law-enum-add');
    await input.fill('§33');
    await addBtn.click();
    await page.getByTestId('law-enum-submit').click();
    // EnumerationInput itemized reveal: one correct chip, no missed
    await expect(page.getByTestId('chip-correct').first()).toBeVisible();
    await expect(page.getByTestId('chip-missed')).not.toBeVisible();
    const stored = await page.evaluate(() => localStorage.getItem('genk-pd:v1'));
    expect(JSON.parse(stored!).law.progress[PENAL_SCENARIO_ID].score).toBe(2);
  });

  test('wrong paragraph (§27 is inapplicable here) yields wrong chip and missed §33', async ({ page }) => {
    await seed(page, {
      law: { progress: pinNextLawQuestion(PENAL_SCENARIO_ID), turn: 0 },
      randomSeed: 1,
    });
    await page.goto('/#/law');
    const input = page.getByTestId('law-enum-input');
    await input.fill('§27');
    await page.getByTestId('law-enum-add').click();
    await page.getByTestId('law-enum-submit').click();
    // Wrong chip for §27, missed chip for §33 (the correct answer)
    await expect(page.getByTestId('chip-wrong').first()).toBeVisible();
    await expect(page.getByTestId('chip-missed').first()).toBeVisible();
  });
});

test.describe('Law unified quiz — text flow', () => {
  test('text question shows text input', async ({ page }) => {
    await seed(page, {
      law: { progress: pinNextLawQuestion(TEXT_ID), turn: 0 },
      randomSeed: 1,
    });
    await page.goto('/#/law');
    await expect(page.getByTestId('law-text-input')).toBeVisible();
  });

  test('correct text answer masters the question', async ({ page }) => {
    await seed(page, {
      law: { progress: pinNextLawQuestion(TEXT_ID), turn: 0 },
      randomSeed: 1,
    });
    await page.goto('/#/law');
    await page.getByTestId('law-text-input').fill('Code 5');
    await page.getByTestId('law-text-submit').click();
    await expect(page.getByTestId('law-reveal-correct')).toBeVisible();
    const stored = await page.evaluate(() => localStorage.getItem('genk-pd:v1'));
    expect(JSON.parse(stored!).law.progress[TEXT_ID].score).toBe(2);
  });
});
