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

type StoredV1 = {
  schemaVersion: 1;
  codes: CodesSlice;
};

// LeaSlice / SaspQuizSlice / SaspTopicFilter are only used in intermediate migration types below.
type LegacyLeaSlice = {
  progress: Record<string, ProgressEntry>;
  turn: number;
};

type LegacySaspTopicFilter = {
  terms: boolean;
  ranks: boolean;
  conduct: boolean;
  radio: boolean;
  equipment: boolean;
  procedures: boolean;
  criminalistics: boolean;
};

type LegacySaspQuizSlice = {
  progress: Record<string, ProgressEntry>;
  turn: number;
};

type LegacySaspSlice = {
  quiz: LegacySaspQuizSlice;
  settings: { topicFilter: LegacySaspTopicFilter };
};

type LegacyPenalQuizSlice = {
  progress: Record<string, ProgressEntry>;
  turn: number;
};

type LegacyPenalSlice = {
  scenarios: LegacyPenalQuizSlice;
  recall: LegacyPenalQuizSlice;
};

type StoredV2 = {
  schemaVersion: 2;
  codes: CodesSlice;
  lea?: LegacyLeaSlice;
};

type StoredV3 = {
  schemaVersion: 3;
  codes: CodesSlice;
  lea: LegacyLeaSlice;
  penal: LegacyPenalSlice;
};

type StoredV4 = {
  schemaVersion: 4;
  codes: CodesSlice;
  lea: LegacyLeaSlice;
  penal: LegacyPenalSlice;
  geo: GeoSlice;
};

// v5 split sasp into test/recall sub-slices; v6 merges them into one quiz slice.
type StoredV5SaspSlice = {
  test: LegacySaspQuizSlice;
  recall: LegacySaspQuizSlice;
  settings: { topicFilter: LegacySaspTopicFilter };
};

type StoredV5 = {
  schemaVersion: 5;
  codes: CodesSlice;
  lea: LegacyLeaSlice;
  penal: LegacyPenalSlice;
  geo: GeoSlice;
  sasp: StoredV5SaspSlice;
};

function migrateV1ToV2(v1: StoredV1): StoredV2 {
  return {
    schemaVersion: 2,
    codes: {
      progress: v1.codes?.progress ?? {},
      turn: v1.codes?.turn ?? 0,
      settings: {
        importanceFilter: {
          ...initialState.codes.settings.importanceFilter,
          ...(v1.codes?.settings?.importanceFilter ?? {}),
        },
      },
    },
    lea: { progress: {}, turn: 0 },
  };
}

function migrateV2ToV3(v2: StoredV2): StoredV3 {
  return {
    schemaVersion: 3,
    codes: {
      progress: v2.codes?.progress ?? {},
      turn: v2.codes?.turn ?? 0,
      settings: {
        importanceFilter: {
          ...initialState.codes.settings.importanceFilter,
          ...(v2.codes?.settings?.importanceFilter ?? {}),
        },
      },
    },
    lea: {
      progress: v2.lea?.progress ?? {},
      turn: v2.lea?.turn ?? 0,
    },
    penal: {
      scenarios: { progress: {}, turn: 0 },
      recall: { progress: {}, turn: 0 },
    },
  };
}

// v3 → v4: geo modul přidán; nový slice startuje prázdný s plným category filtrem.
function migrateV3ToV4(v3: StoredV3): StoredV4 {
  return {
    schemaVersion: 4,
    codes: {
      progress: v3.codes?.progress ?? {},
      turn: v3.codes?.turn ?? 0,
      settings: {
        importanceFilter: {
          ...initialState.codes.settings.importanceFilter,
          ...(v3.codes?.settings?.importanceFilter ?? {}),
        },
      },
    },
    lea: {
      progress: v3.lea?.progress ?? {},
      turn: v3.lea?.turn ?? 0,
    },
    penal: {
      scenarios: {
        progress: v3.penal?.scenarios?.progress ?? {},
        turn: v3.penal?.scenarios?.turn ?? 0,
      },
      recall: {
        progress: v3.penal?.recall?.progress ?? {},
        turn: v3.penal?.recall?.turn ?? 0,
      },
    },
    geo: {
      blind: { progress: {}, turn: 0 },
      name: { progress: {}, turn: 0 },
      settings: {
        categoryFilter: { ...initialState.geo.settings.categoryFilter },
      },
    },
  };
}

// v4 → v5: sasp modul přidán; nové slices startují prázdné s plným topic filtrem.
function migrateV4ToV5(v4: StoredV4): StoredV5 {
  return {
    schemaVersion: 5,
    codes: {
      progress: v4.codes?.progress ?? {},
      turn: v4.codes?.turn ?? 0,
      settings: {
        importanceFilter: {
          ...initialState.codes.settings.importanceFilter,
          ...(v4.codes?.settings?.importanceFilter ?? {}),
        },
      },
    },
    lea: {
      progress: v4.lea?.progress ?? {},
      turn: v4.lea?.turn ?? 0,
    },
    penal: {
      scenarios: {
        progress: v4.penal?.scenarios?.progress ?? {},
        turn: v4.penal?.scenarios?.turn ?? 0,
      },
      recall: {
        progress: v4.penal?.recall?.progress ?? {},
        turn: v4.penal?.recall?.turn ?? 0,
      },
    },
    geo: {
      blind: {
        progress: v4.geo?.blind?.progress ?? {},
        turn: v4.geo?.blind?.turn ?? 0,
      },
      name: {
        progress: v4.geo?.name?.progress ?? {},
        turn: v4.geo?.name?.turn ?? 0,
      },
      settings: {
        categoryFilter: {
          ...initialState.geo.settings.categoryFilter,
          ...(v4.geo?.settings?.categoryFilter ?? {}),
        },
      },
    },
    sasp: {
      test: { progress: {}, turn: 0 },
      recall: { progress: {}, turn: 0 },
      settings: {
        topicFilter: {
          terms: true,
          ranks: true,
          conduct: true,
          radio: true,
          equipment: true,
          procedures: true,
          criminalistics: true,
        },
      },
    },
  };
}

type StoredV6 = {
  schemaVersion: 6;
  codes: CodesSlice;
  lea: LegacyLeaSlice;
  penal: LegacyPenalSlice;
  geo: GeoSlice;
  sasp: LegacySaspSlice;
};

// v5 → v6: sasp test + recall sub-slices sloučeny do jedné quiz slice
// (otázky mají unikátní ID, takže union progress map je bezkolizní).
function migrateV5ToV6(v5: StoredV5): StoredV6 {
  return {
    schemaVersion: 6,
    codes: v5.codes,
    lea: v5.lea,
    penal: v5.penal,
    geo: v5.geo,
    sasp: {
      quiz: {
        progress: {
          ...(v5.sasp?.test?.progress ?? {}),
          ...(v5.sasp?.recall?.progress ?? {}),
        },
        turn: (v5.sasp?.test?.turn ?? 0) + (v5.sasp?.recall?.turn ?? 0),
      },
      settings: {
        topicFilter: {
          terms: v5.sasp?.settings?.topicFilter?.terms ?? true,
          ranks: v5.sasp?.settings?.topicFilter?.ranks ?? true,
          conduct: v5.sasp?.settings?.topicFilter?.conduct ?? true,
          radio: v5.sasp?.settings?.topicFilter?.radio ?? true,
          equipment: v5.sasp?.settings?.topicFilter?.equipment ?? true,
          procedures: v5.sasp?.settings?.topicFilter?.procedures ?? true,
          criminalistics: v5.sasp?.settings?.topicFilter?.criminalistics ?? true,
        },
      },
    },
  };
}

type StoredV7 = {
  schemaVersion: 7;
  codes: CodesSlice;
  lea: LegacyLeaSlice;
  penal: LegacyPenalSlice;
  geo: GeoSlice;
  sasp: LegacySaspSlice;
  law: LawSlice;
};

// v6 → v7: additive law slice (union of lea + penal.scenarios + sasp.quiz progress).
function migrateV6toV7(s: any): StoredV7 {
  const law = emptyLawSlice();
  law.progress = {
    ...(s.lea?.progress ?? {}),
    ...(s.penal?.scenarios?.progress ?? {}),
    ...(s.sasp?.quiz?.progress ?? {}),
  };
  law.turn = (s.lea?.turn ?? 0) + (s.penal?.scenarios?.turn ?? 0) + (s.sasp?.quiz?.turn ?? 0);
  return {
    schemaVersion: 7,
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
    lea: {
      progress: s.lea?.progress ?? {},
      turn: s.lea?.turn ?? 0,
    },
    penal: {
      scenarios: {
        progress: s.penal?.scenarios?.progress ?? {},
        turn: s.penal?.scenarios?.turn ?? 0,
      },
      recall: {
        progress: s.penal?.recall?.progress ?? {},
        turn: s.penal?.recall?.turn ?? 0,
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
    sasp: {
      quiz: {
        progress: s.sasp?.quiz?.progress ?? {},
        turn: s.sasp?.quiz?.turn ?? 0,
      },
      settings: {
        topicFilter: {
          terms: true,
          ranks: true,
          conduct: true,
          radio: true,
          equipment: true,
          procedures: true,
          criminalistics: true,
          ...(s.sasp?.settings?.topicFilter ?? {}),
        },
      },
    },
    law,
  };
}

// v9/v8 → v10: drop law source filter, + scenky theme; terminál všech řetězů i lenient v10 read.
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
      progress: s.law?.progress ?? {},
      turn: s.law?.turn ?? 0,
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
    if (
      (parsed?.schemaVersion === 10 || parsed?.schemaVersion === 9 || parsed?.schemaVersion === 8) &&
      parsed.codes
    ) {
      return normalizeToV10(parsed);
    }
    if (parsed?.schemaVersion === 7 && parsed.codes) {
      return normalizeToV10(parsed);
    }
    if (parsed?.schemaVersion === 6 && parsed.codes) {
      return normalizeToV10(migrateV6toV7(parsed as StoredV6));
    }
    if (parsed?.schemaVersion === 5 && parsed.codes) {
      return normalizeToV10(migrateV6toV7(migrateV5ToV6(parsed as StoredV5)));
    }
    if (parsed?.schemaVersion === 4 && parsed.codes) {
      return normalizeToV10(migrateV6toV7(migrateV5ToV6(migrateV4ToV5(parsed as StoredV4))));
    }
    if (parsed?.schemaVersion === 3 && parsed.codes) {
      return normalizeToV10(
        migrateV6toV7(migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(parsed as StoredV3)))),
      );
    }
    if (parsed?.schemaVersion === 2 && parsed.codes) {
      return normalizeToV10(
        migrateV6toV7(
          migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(parsed as StoredV2)))),
        ),
      );
    }
    if (parsed?.schemaVersion === 1 && parsed.codes) {
      return normalizeToV10(
        migrateV6toV7(
          migrateV5ToV6(
            migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(parsed as StoredV1)))),
          ),
        ),
      );
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
