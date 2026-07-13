import { expect, test } from '@playwright/test';
import { pinNextPenalParagraph, seed } from '../fixtures/seed';

test.describe('Penal Code — recall mode B', () => {
  test('asks for paragraf name and accepts the correct title', async ({ page }) => {
    await seed(page, {
      penal: {
        recall: { progress: pinNextPenalParagraph('penal.25'), turn: 0 },
      },
      randomSeed: 1,
    });

    await page.goto('/#/penal/recall');
    await expect(page.getByTestId('penal-recall-ref')).toHaveText('§25');

    const input = page.getByTestId('penal-recall-input');
    await input.fill('Krádež');
    await input.press('Enter');

    await expect(page.getByTestId('penal-recall-correct')).toBeVisible();
    await expect(page.getByTestId('penal-recall-reveal')).toContainText('§25a');
    await expect(page.getByTestId('penal-recall-reveal')).toContainText('§25d');
  });

  test('accepts an alias (matchParagraph alias path)', async ({ page }) => {
    await seed(page, {
      penal: {
        recall: { progress: pinNextPenalParagraph('penal.25'), turn: 0 },
      },
      randomSeed: 1,
    });

    await page.goto('/#/penal/recall');
    const input = page.getByTestId('penal-recall-input');
    await input.fill('krast');
    await input.press('Enter');
    await expect(page.getByTestId('penal-recall-correct')).toBeVisible();
  });

  test('rejects wrong answer and shows the correct title', async ({ page }) => {
    await seed(page, {
      penal: {
        recall: { progress: pinNextPenalParagraph('penal.25'), turn: 0 },
      },
      randomSeed: 1,
    });

    await page.goto('/#/penal/recall');
    const input = page.getByTestId('penal-recall-input');
    await input.fill('Loupež');
    await input.press('Enter');
    await expect(page.getByTestId('penal-recall-wrong')).toContainText('Krádež');
  });

  test('skip advances to a different paragraf', async ({ page }) => {
    await seed(page, {
      penal: {
        recall: {
          // Leave §25 and §27 unmastered so skip flips between them
          progress: (() => {
            const map: Record<string, { score: number; lastAskedAtTurn: number }> = {};
            const allButTwo = [
              'penal.1', 'penal.2', 'penal.3', 'penal.4', 'penal.5', 'penal.6',
              'penal.7', 'penal.8', 'penal.9', 'penal.10', 'penal.11', 'penal.12',
              'penal.13', 'penal.14', 'penal.15', 'penal.16', 'penal.17', 'penal.18',
              'penal.19', 'penal.20', 'penal.21', 'penal.22', 'penal.23', 'penal.24',
              'penal.26', 'penal.28', 'penal.29', 'penal.30',
              'penal.31', 'penal.32', 'penal.33', 'penal.34', 'penal.35', 'penal.36',
              'penal.37', 'penal.38', 'penal.39', 'penal.40', 'penal.41', 'penal.42',
              'penal.43', 'penal.44', 'penal.45', 'penal.46', 'penal.47', 'penal.48',
              'penal.49', 'penal.50', 'penal.51', 'penal.52', 'penal.53', 'penal.54',
              'penal.55', 'penal.56', 'penal.57', 'penal.58', 'penal.59', 'penal.60',
              'penal.61', 'penal.62', 'penal.68', 'penal.69', 'penal.70', 'penal.71',
              'penal.72', 'penal.73', 'penal.74', 'penal.75', 'penal.76', 'penal.77',
              'penal.100', 'penal.101', 'penal.102',
            ];
            for (const id of allButTwo) {
              map[id] = { score: 2, lastAskedAtTurn: -10 };
            }
            return map;
          })(),
          turn: 0,
        },
      },
      randomSeed: 1,
    });

    await page.goto('/#/penal/recall');
    const firstRef = await page.getByTestId('penal-recall-ref').textContent();
    await page.getByTestId('penal-recall-skip').click();
    await expect.poll(async () => page.getByTestId('penal-recall-ref').textContent()).not.toBe(
      firstRef,
    );
  });
});
