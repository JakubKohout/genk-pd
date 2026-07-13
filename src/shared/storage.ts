/**
 * Versioned localStorage store with React-safe snapshot caching.
 * Snapshot is recomputed only when localStorage actually changes (via saveState/clearState
 * or a cross-tab `storage` event). This makes useSyncExternalStore's getSnapshot stable.
 */
const STORAGE_KEY = 'genk-pd:v1';

export type ImportanceFilter = {
  mandatory: boolean;
  rare: boolean;
  unnecessary: boolean;
};

export type ProgressEntry = {
  score: number;
  lastAskedAtTurn: number;
};

export type CodesSlice = {
  progress: Record<string, ProgressEntry>;
  turn: number;
  settings: {
    importanceFilter: ImportanceFilter;
  };
};

export type GeoCategoryFilter = {
  street: boolean;
  highway: boolean;
  city: boolean;
  state: boolean;
};

export type GeoQuizSlice = {
  progress: Record<string, ProgressEntry>;
  turn: number;
};

export type GeoSlice = {
  blind: GeoQuizSlice;
  name: GeoQuizSlice;
  settings: {
    categoryFilter: GeoCategoryFilter;
  };
};

export const LAW_THEME_KEYS = [
  'pojmy',
  'hodnosti',
  'jednani',
  'rto',
  'vybava',
  'zasah',
  'zadrzeni',
  'kriminalistika',
  'paragrafy',
  'scenky',
] as const;
export type LawThemeKey = (typeof LAW_THEME_KEYS)[number];
export type LawTheme = LawThemeKey;
export type LawThemeFilter = Record<LawThemeKey, boolean>;

export interface LawSlice {
  progress: Record<string, ProgressEntry>;
  turn: number;
  settings: { themeFilter: LawThemeFilter };
}

export type PersistedState = {
  schemaVersion: 10;
  codes: CodesSlice;
  geo: GeoSlice;
  law: LawSlice;
};

function defaultLawSettings(): LawSlice['settings'] {
  return {
    themeFilter: Object.fromEntries(LAW_THEME_KEYS.map((k) => [k, true])) as LawThemeFilter,
  };
}

function emptyLawSlice(): LawSlice {
  return { progress: {}, turn: 0, settings: defaultLawSettings() };
}

export const initialState: PersistedState = {
  schemaVersion: 10,
  codes: {
    progress: {},
    turn: 0,
    settings: {
      importanceFilter: {
        mandatory: true,
        rare: true,
        unnecessary: true,
      },
    },
  },
  geo: {
    blind: { progress: {}, turn: 0 },
    name: { progress: {}, turn: 0 },
    settings: {
      categoryFilter: {
        street: true,
        highway: true,
        city: true,
        state: true,
      },
    },
  },
  law: emptyLawSlice(),
};

let cachedSnapshot: PersistedState | null = null;
const listeners = new Set<() => void>();

// Jediný migrační terminál: lenient v10 read pro libovolný historický payload
// (v1 az v10). Aditivní historie (lea / penal.scenarios / sasp) se sjednocuje do
// law slice; zrušené slices a law.settings.sourceFilter zanikají tím, že se
// nekopírují. Reálně nasazené verze byly jen v1 az v4 (main) a v10 — mezitvary
// v5 az v9 existovaly pouze ve vývoji a pokrývají je spready níže.
function normalizeToV10(s: any): PersistedState {
  return {
    schemaVersion: 10,
    codes: {
      progress: s.codes?.progress ?? {},
      turn: s.codes?.turn ?? 0,
      settings: {
        importanceFilter: {
          ...initialState.codes.settings.importanceFilter,
          ...(s.codes?.settings?.importanceFilter ?? {}),
        },
      },
    },
    geo: {
      blind: {
        progress: s.geo?.blind?.progress ?? {},
        turn: s.geo?.blind?.turn ?? 0,
      },
      name: {
        progress: s.geo?.name?.progress ?? {},
        turn: s.geo?.name?.turn ?? 0,
      },
      settings: {
        categoryFilter: {
          ...initialState.geo.settings.categoryFilter,
          ...(s.geo?.settings?.categoryFilter ?? {}),
        },
      },
    },
    law: {
      // Union legacy kvízů (tvary v2 az v7) + law slice (v7+); law vyhrává per-key.
      progress: {
        ...(s.lea?.progress ?? {}),
        ...(s.penal?.scenarios?.progress ?? {}),
        ...(s.sasp?.test?.progress ?? {}),
        ...(s.sasp?.recall?.progress ?? {}),
        ...(s.sasp?.quiz?.progress ?? {}),
        ...(s.law?.progress ?? {}),
      },
      turn:
        s.law?.turn ??
        (s.lea?.turn ?? 0) +
          (s.penal?.scenarios?.turn ?? 0) +
          (s.sasp?.test?.turn ?? 0) +
          (s.sasp?.recall?.turn ?? 0) +
          (s.sasp?.quiz?.turn ?? 0),
      settings: {
        themeFilter: {
          ...defaultLawSettings().themeFilter,
          ...(s.law?.settings?.themeFilter ?? {}),
        },
      },
    },
  };
}

function readFromStorage(): PersistedState {
  if (typeof localStorage === 'undefined') return cloneInitial();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return cloneInitial();
  try {
    const parsed = JSON.parse(raw) as any;
    if (typeof parsed?.schemaVersion === 'number' && parsed.codes) {
      return normalizeToV10(parsed);
    }
  } catch {
    // fall through
  }
  return cloneInitial();
}

export function getSnapshot(): PersistedState {
  if (cachedSnapshot === null) cachedSnapshot = readFromStorage();
  return cachedSnapshot;
}

export function loadState(): PersistedState {
  return getSnapshot();
}

export function saveState(state: PersistedState): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  cachedSnapshot = state;
  emit();
}

export function clearState(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  cachedSnapshot = null;
  emit();
}

export function subscribeState(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== 'undefined' && listeners.size === 1) {
    window.addEventListener('storage', onStorageEvent);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined' && listeners.size === 0) {
      window.removeEventListener('storage', onStorageEvent);
    }
  };
}

function onStorageEvent(e: StorageEvent) {
  if (e.key === STORAGE_KEY || e.key === null) {
    cachedSnapshot = null;
    emit();
  }
}

function emit() {
  for (const l of listeners) l();
}

function cloneInitial(): PersistedState {
  return JSON.parse(JSON.stringify(initialState)) as PersistedState;
}

/** Test-only helper: forget the cached snapshot (call after manually clearing localStorage). */
export function __resetCacheForTests(): void {
  cachedSnapshot = null;
}

export const STORAGE_KEY_FOR_TESTS = STORAGE_KEY;
