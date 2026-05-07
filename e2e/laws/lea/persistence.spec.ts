import { expect, test } from '@playwright/test';
import { seed } from '../../fixtures/seed';

test('LEA progress persists across reload', async ({ page }) => {
  const progress = Object.fromEntries(
    ['lea.7', 'lea.9.A'].map((id) => [id, { score: 2, lastAskedAtTurn: 0 }]),
  );
  await seed(page, { lea: { progress, turn: 1 } });
  await page.goto('/#/laws/lea');
  await expect(page.getByTestId('lea-progress-percent')).toContainText(/%/);
  const before = await page.getByTestId('lea-progress-percent').textContent();

  await page.reload();
  await expect(page.getByTestId('lea-progress-percent')).toHaveText(before!);
});

test('migrating a v1 storage payload still surfaces existing codes progress and an empty LEA slice', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('genk-pd:seeded')) {
      const v1 = {
        schemaVersion: 1,
        codes: {
          progress: { '10-4': { score: 2, lastAskedAtTurn: 0 } },
          turn: 5,
          settings: { importanceFilter: { mandatory: true, rare: true, unnecessary: true } },
        },
      };
      localStorage.setItem('genk-pd:v1', JSON.stringify(v1));
      sessionStorage.setItem('genk-pd:seeded', '1');
    }
  });
  await page.goto('/#/laws/lea');
  await expect(page.getByTestId('lea-progress-percent')).toHaveText('0%');

  // Trigger any state-mutating action so the app writes back the latest schema to localStorage.
  await page.getByRole('button', { name: /vyhodnotit otázku/i }).click();

  const stored = await page.evaluate(() => localStorage.getItem('genk-pd:v1'));
  const parsed = JSON.parse(stored!);
  expect(parsed.schemaVersion).toBe(3);
  expect(parsed.codes.progress['10-4'].score).toBe(2);
  expect(parsed.lea).toBeDefined();
  expect(parsed.penal).toBeDefined();
  expect(parsed.penal.scenarios).toEqual({ progress: {}, turn: 0 });
  expect(parsed.penal.recall).toEqual({ progress: {}, turn: 0 });
});
