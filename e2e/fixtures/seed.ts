import { type Page } from '@playwright/test';
import { CODES } from '../../src/modules/codes/data/codes';
import { GEO_POI_IDS } from './geo-poi-ids';

export const STORAGE_KEY = 'genk-pd:v1';
export const RNG_SEED_KEY = 'genk-pd:rng-seed';

export type SeedProgress = Record<string, { score: number; lastAskedAtTurn: number }>;

export type SeedInput = {
  progress?: SeedProgress;
  turn?: number;
  importanceFilter?: { mandatory?: boolean; rare?: boolean; unnecessary?: boolean };
  penal?: {
    recall?: { progress?: SeedProgress; turn?: number };
  };
  geo?: {
    blind?: { progress?: SeedProgress; turn?: number };
    name?: { progress?: SeedProgress; turn?: number };
    categoryFilter?: {
      street?: boolean;
      highway?: boolean;
      city?: boolean;
      state?: boolean;
    };
  };
  law?: { progress?: SeedProgress; turn?: number };
  randomSeed?: number;
};

/**
 * Inject deterministic state and an RNG seed into localStorage BEFORE the app boots.
 * Use BEFORE page.goto(). Reads are picked up by storage.ts and rng.ts at module load.
 */
export async function seed(page: Page, input: SeedInput): Promise<void> {
  await page.route('**/api*.mixpanel.com/**', (route) => route.abort());
  await page.route('**/*.mxpnl.com/**', (route) => route.abort());

  const persisted = {
    schemaVersion: 8 as const,
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
    penal: {
      recall: {
        progress: input.penal?.recall?.progress ?? {},
        turn: input.penal?.recall?.turn ?? 0,
      },
    },
    geo: {
      blind: {
        progress: input.geo?.blind?.progress ?? {},
        turn: input.geo?.blind?.turn ?? 0,
      },
      name: {
        progress: input.geo?.name?.progress ?? {},
        turn: input.geo?.name?.turn ?? 0,
      },
      settings: {
        categoryFilter: {
          street: input.geo?.categoryFilter?.street ?? true,
          highway: input.geo?.categoryFilter?.highway ?? true,
          city: input.geo?.categoryFilter?.city ?? true,
          state: input.geo?.categoryFilter?.state ?? true,
        },
      },
    },
    law: {
      progress: input.law?.progress ?? {},
      turn: input.law?.turn ?? 0,
      settings: {
        sourceFilter: { lea: true, penal: true, sasp: true },
        themeFilter: {
          pojmy: true, hodnosti: true, jednani: true, rto: true, vybava: true,
          zasah: true, zadrzeni: true, kriminalistika: true, paragrafy: true,
        },
      },
    },
  };
  await page.addInitScript(
    ({ persisted, randomSeed, storageKey, rngSeedKey }) => {
      // Set unconditionally on every navigation so analytics stays disabled
      // even after sessionStorage seed-once short-circuits below.
      (window as Window & { __GENK_E2E__?: boolean }).__GENK_E2E__ = true;
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
 * other mandatory code at +2. The target itself starts at score 0 (or `targetScore` if given).
 */
export function pinNextQuestion(targetCodeId: string, targetScore = 0): SeedProgress {
  const progress: SeedProgress = {};
  for (const c of CODES) {
    if (c.importance === 'mandatory' && c.id !== targetCodeId) {
      progress[c.id] = { score: 2, lastAskedAtTurn: -10 };
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
      progress[c.id] = { score: 2, lastAskedAtTurn: 0 };
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
      progress[id] = { score: 2, lastAskedAtTurn: -10 };
    }
  }
  if (targetScore !== 0) {
    progress[targetQuestionId] = { score: targetScore, lastAskedAtTurn: -10 };
  }
  return progress;
}

/**
 * Penal scenario IDs hard-coded for E2E (must match src/modules/laws/penal/data/scenarios.ts).
 */
export const PENAL_SCENARIO_IDS = [
  'penal.scenario.A1',
  'penal.scenario.A2',
  'penal.scenario.A3',
  'penal.scenario.A4',
  'penal.scenario.A5',
  'penal.scenario.A6',
  'penal.scenario.B1',
  'penal.scenario.B2',
  'penal.scenario.B3',
  'penal.scenario.B4',
  'penal.scenario.B5',
  'penal.scenario.B6',
  'penal.scenario.B7',
  'penal.scenario.C1',
  'penal.scenario.C2',
  'penal.scenario.C3',
  'penal.scenario.C4',
  'penal.scenario.D2',
  'penal.scenario.D3',
  'penal.scenario.E1',
  'penal.scenario.E2',
  'penal.scenario.E3',
  'penal.scenario.E4',
  'penal.scenario.E5',
  'penal.scenario.E6',
  'penal.scenario.E7',
  'penal.scenario.E8',
  'penal.scenario.E9',
] as const;

/**
 * Penal main paragraf IDs (must match src/modules/laws/penal/data/paragraphs.ts).
 */
export const PENAL_PARAGRAPH_IDS = [
  'penal.1', 'penal.2', 'penal.3', 'penal.4', 'penal.5', 'penal.6',
  'penal.7', 'penal.8', 'penal.9', 'penal.10', 'penal.11', 'penal.12',
  'penal.13', 'penal.14', 'penal.15', 'penal.16', 'penal.17', 'penal.18',
  'penal.19', 'penal.20', 'penal.21', 'penal.22', 'penal.23', 'penal.24',
  'penal.25', 'penal.26', 'penal.27', 'penal.28', 'penal.29', 'penal.30',
  'penal.31', 'penal.32', 'penal.33', 'penal.34', 'penal.35', 'penal.36',
  'penal.37', 'penal.38', 'penal.39', 'penal.40', 'penal.41', 'penal.42',
  'penal.43', 'penal.44', 'penal.45', 'penal.46', 'penal.47', 'penal.48',
  'penal.49', 'penal.50', 'penal.51', 'penal.52', 'penal.53', 'penal.54',
  'penal.55', 'penal.56', 'penal.57', 'penal.58', 'penal.59', 'penal.60',
  'penal.61', 'penal.62', 'penal.68', 'penal.69', 'penal.70', 'penal.71',
  'penal.72', 'penal.73', 'penal.74', 'penal.75', 'penal.76', 'penal.77',
  'penal.100', 'penal.101', 'penal.102',
] as const;

export function pinNextPenalScenario(targetId: string, targetScore = 0): SeedProgress {
  const progress: SeedProgress = {};
  for (const id of PENAL_SCENARIO_IDS) {
    if (id !== targetId) {
      progress[id] = { score: 2, lastAskedAtTurn: -10 };
    }
  }
  if (targetScore !== 0) {
    progress[targetId] = { score: targetScore, lastAskedAtTurn: -10 };
  }
  return progress;
}

export function pinNextPenalParagraph(targetId: string, targetScore = 0): SeedProgress {
  const progress: SeedProgress = {};
  for (const id of PENAL_PARAGRAPH_IDS) {
    if (id !== targetId) {
      progress[id] = { score: 2, lastAskedAtTurn: -10 };
    }
  }
  if (targetScore !== 0) {
    progress[targetId] = { score: targetScore, lastAskedAtTurn: -10 };
  }
  return progress;
}

/** Re-exported from generated file (kept in sync with pois.ts via import script). */
export { GEO_POI_IDS };

export function pinNextGeoPoi(targetId: string, targetScore = 0): SeedProgress {
  const progress: SeedProgress = {};
  for (const id of GEO_POI_IDS) {
    if (id !== targetId) {
      progress[id] = { score: 2, lastAskedAtTurn: -10 };
    }
  }
  if (targetScore !== 0) {
    progress[targetId] = { score: targetScore, lastAskedAtTurn: -10 };
  }
  return progress;
}

/**
 * SASP law pool question IDs — native SASP content (choice/text/enum/match).
 * Must match src/modules/law/data/sasp/ (SASP_LAW_QUESTIONS).
 */
export const SASP_QUESTION_IDS = [
  'sasp.choice.pojmy.1',
  'sasp.choice.pojmy.2',
  'sasp.choice.pojmy.3',
  'sasp.choice.pojmy.4',
  'sasp.choice.pojmy.5',
  'sasp.choice.pojmy.6',
  'sasp.choice.hodnosti.1',
  'sasp.scenario.hodnosti.1',
  'sasp.choice.jednani.1',
  'sasp.choice.jednani.2',
  'sasp.scenario.jednani.1',
  'sasp.choice.jednani.3',
  'sasp.choice.jednani.4',
  'sasp.choice.rto.1',
  'sasp.choice.rto.2',
  'sasp.choice.rto.3',
  'sasp.scenario.rto.1',
  'sasp.choice.jednani.5',
  'sasp.choice.vybava.1',
  'sasp.choice.vybava.2',
  'sasp.choice.vybava.3',
  'sasp.choice.vybava.4',
  'sasp.choice.vybava.5',
  'sasp.choice.vybava.6',
  'sasp.choice.vybava.7',
  'sasp.choice.vybava.8',
  'sasp.choice.vybava.9',
  'sasp.choice.vybava.10',
  'sasp.choice.vybava.11',
  'sasp.choice.vybava.12',
  'sasp.choice.vybava.13',
  'sasp.choice.vybava.14',
  'sasp.scenario.zasah.1',
  'sasp.scenario.zasah.2',
  'sasp.scenario.zasah.3',
  'sasp.scenario.zasah.4',
  'sasp.scenario.zasah.5',
  'sasp.scenario.zasah.6',
  'sasp.choice.zasah.1',
  'sasp.choice.zasah.2',
  'sasp.choice.zasah.3',
  'sasp.choice.zasah.4',
  'sasp.choice.zasah.5',
  'sasp.choice.zasah.6',
  'sasp.choice.zasah.7',
  'sasp.choice.zasah.8',
  'sasp.choice.zasah.9',
  'sasp.choice.zasah.10',
  'sasp.choice.zasah.11',
  'sasp.choice.zasah.12',
  'sasp.choice.zasah.13',
  'sasp.choice.zasah.14',
  'sasp.choice.zasah.15',
  'sasp.choice.zasah.16',
  'sasp.choice.zasah.17',
  'sasp.choice.zasah.18',
  'sasp.choice.zasah.19',
  'sasp.choice.zasah.20',
  'sasp.choice.zasah.21',
  'sasp.choice.zasah.22',
  'sasp.choice.zasah.23',
  'sasp.choice.zasah.24',
  'sasp.choice.zasah.25',
  'sasp.choice.zasah.26',
  'sasp.choice.zadrzeni.1',
  'sasp.choice.zadrzeni.2',
  'sasp.choice.zadrzeni.3',
  'sasp.choice.zadrzeni.4',
  'sasp.choice.zadrzeni.5',
  'sasp.choice.zadrzeni.6',
  'sasp.choice.zadrzeni.7',
  'sasp.choice.zadrzeni.8',
  'sasp.choice.zadrzeni.9',
  'sasp.choice.zadrzeni.10',
  'sasp.choice.zadrzeni.11',
  'sasp.choice.zadrzeni.12',
  'sasp.choice.kriminalistika.1',
  'sasp.choice.kriminalistika.2',
  'sasp.choice.kriminalistika.3',
  'sasp.choice.kriminalistika.4',
  'sasp.choice.kriminalistika.5',
  'sasp.choice.kriminalistika.6',
  'sasp.choice.kriminalistika.7',
  'sasp.choice.kriminalistika.8',
  'sasp.choice.kriminalistika.9',
  'sasp.choice.kriminalistika.10',
  'sasp.text.rto.1',
  'sasp.text.zasah.felony-code',
  'sasp.enum.hodnosti.ladder',
  'sasp.enum.zasah.felony-order',
  'sasp.match.rto.channels',
  'sasp.match.rto.priorities',
  'sasp.match.hodnosti.callsigns',
  'sasp.match.kriminalistika.traces',
] as const;

export function pinNextSaspQuestion(targetId: string, targetScore = 0): SeedProgress {
  const progress: SeedProgress = {};
  for (const id of SASP_QUESTION_IDS) {
    if (id !== targetId) {
      progress[id] = { score: 2, lastAskedAtTurn: -10 };
    }
  }
  if (targetScore !== 0) {
    progress[targetId] = { score: targetScore, lastAskedAtTurn: -10 };
  }
  return progress;
}

/**
 * Unified law quiz question IDs — LEA (enumeration) + Penal scenarios (enumeration) +
 * SASP (choice/text/order) adapted into the law pool.
 * Must stay in sync with the respective source arrays.
 */
export const LAW_QUESTION_IDS: readonly string[] = [
  // LEA (17)
  ...LEA_QUESTION_IDS,
  // Penal scenarios (28)
  ...PENAL_SCENARIO_IDS,
  // SASP (95)
  ...SASP_QUESTION_IDS,
];

export function pinNextLawQuestion(targetId: string, targetScore = 0): SeedProgress {
  const progress: SeedProgress = {};
  for (const id of LAW_QUESTION_IDS) {
    if (id !== targetId) {
      progress[id] = { score: 2, lastAskedAtTurn: -10 };
    }
  }
  if (targetScore !== 0) {
    progress[targetId] = { score: targetScore, lastAskedAtTurn: -10 };
  }
  return progress;
}
