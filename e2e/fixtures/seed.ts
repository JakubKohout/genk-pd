import { type Page } from '@playwright/test';
import { CODES } from '../../src/modules/codes/data/codes';

export const STORAGE_KEY = 'genk-pd:v1';
export const RNG_SEED_KEY = 'genk-pd:rng-seed';

export type SeedProgress = Record<string, { score: number; lastAskedAtTurn: number }>;

export type SeedInput = {
  progress?: SeedProgress;
  turn?: number;
  importanceFilter?: { mandatory?: boolean; rare?: boolean; unnecessary?: boolean };
  lea?: { progress?: SeedProgress; turn?: number };
  randomSeed?: number;
};

/**
 * Inject deterministic state and an RNG seed into localStorage BEFORE the app boots.
 * Use BEFORE page.goto(). Reads are picked up by storage.ts and rng.ts at module load.
 */
export async function seed(page: Page, input: SeedInput): Promise<void> {
  await page.route('**/gc.zgo.at/**', (route) => route.abort());
  await page.route('**/*.goatcounter.com/**', (route) => route.abort());

  const persisted = {
    schemaVersion: 2 as const,
    codes: {
      progress: input.progress ?? {},
      turn: input.turn ?? 0,
      settings: {
        importanceFilter: {
          mandatory: input.importanceFilter?.mandatory ?? true,
          rare: input.importanceFilter?.rare ?? false,
          unnecessary: input.importanceFilter?.unnecessary ?? false,
        },
      },
    },
    lea: {
      progress: input.lea?.progress ?? {},
      turn: input.lea?.turn ?? 0,
    },
  };
  await page.addInitScript(
    ({ persisted, randomSeed, storageKey, rngSeedKey }) => {
      try {
        if (sessionStorage.getItem('genk-pd:seeded') === '1') return;
        sessionStorage.setItem('genk-pd:seeded', '1');
        localStorage.clear();
        localStorage.setItem(storageKey, JSON.stringify(persisted));
        if (typeof randomSeed === 'number') {
          localStorage.setItem(rngSeedKey, String(randomSeed));
        }
      } catch {
        // ignore
      }
    },
    { persisted, randomSeed: input.randomSeed, storageKey: STORAGE_KEY, rngSeedKey: RNG_SEED_KEY },
  );
}

/**
 * Build a progress map that pins the next question to `targetCodeId` by saturating every
 * other mandatory code at +3. The target itself starts at score 0 (or `targetScore` if given).
 */
export function pinNextQuestion(targetCodeId: string, targetScore = 0): SeedProgress {
  const progress: SeedProgress = {};
  for (const c of CODES) {
    if (c.importance === 'mandatory' && c.id !== targetCodeId) {
      progress[c.id] = { score: 3, lastAskedAtTurn: -10 };
    }
  }
  if (targetScore !== 0) {
    progress[targetCodeId] = { score: targetScore, lastAskedAtTurn: -10 };
  }
  return progress;
}

/** Helper for completion test: saturate everything in given filter. */
export function saturateAll(importance: 'mandatory' | 'rare' | 'unnecessary'): SeedProgress {
  const progress: SeedProgress = {};
  for (const c of CODES) {
    if (c.importance === importance) {
      progress[c.id] = { score: 3, lastAskedAtTurn: 0 };
    }
  }
  return progress;
}

/**
 * Build a LEA progress map that pins the next question to `targetQuestionId` by saturating
 * all other LEA questions at +3. Target itself starts at 0 (or `targetScore` if given).
 *
 * The full set of LEA question IDs (17 questions) is hard-coded here to avoid runtime imports
 * — this fixture is loaded by Playwright before the app bundle exists.
 */
export const LEA_QUESTION_IDS = [
  'lea.7',
  'lea.9.A',
  'lea.9.B',
  'lea.10',
  'lea.11',
  'lea.12.A',
  'lea.12.C',
  'lea.15',
  'lea.16.B',
  'lea.17.A',
  'lea.18.A',
  'lea.19.A',
  'lea.21.A',
  'lea.23.B',
  'lea.37',
  'lea.zbrojni-prukaz',
  'lea.ridicsky-prukaz',
] as const;

export function pinNextLeaQuestion(targetQuestionId: string, targetScore = 0): SeedProgress {
  const progress: SeedProgress = {};
  for (const id of LEA_QUESTION_IDS) {
    if (id !== targetQuestionId) {
      progress[id] = { score: 3, lastAskedAtTurn: -10 };
    }
  }
  if (targetScore !== 0) {
    progress[targetQuestionId] = { score: targetScore, lastAskedAtTurn: -10 };
  }
  return progress;
}
