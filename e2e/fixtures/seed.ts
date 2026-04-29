import { type Page } from '@playwright/test';
import { CODES } from '../../src/modules/codes/data/codes';

export const STORAGE_KEY = 'genk-pd:v1';
export const RNG_SEED_KEY = 'genk-pd:rng-seed';

export type SeedProgress = Record<string, { score: number; lastAskedAtTurn: number }>;

export type SeedInput = {
  progress?: SeedProgress;
  turn?: number;
  importanceFilter?: { mandatory?: boolean; rare?: boolean; unnecessary?: boolean };
  randomSeed?: number;
};

/**
 * Inject deterministic state and an RNG seed into localStorage BEFORE the app boots.
 * Use BEFORE page.goto(). Reads are picked up by storage.ts and rng.ts at module load.
 */
export async function seed(page: Page, input: SeedInput): Promise<void> {
  const persisted = {
    schemaVersion: 1 as const,
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
  };
  await page.addInitScript(
    ({ persisted, randomSeed, storageKey, rngSeedKey }) => {
      try {
        // Seed only on the FIRST navigation of the test. Subsequent reloads must keep
        // whatever the app wrote to localStorage so we can verify persistence.
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
