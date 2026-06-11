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

export type LeaSlice = {
  progress: Record<string, ProgressEntry>;
  turn: number;
};

export type PenalQuizSlice = {
  progress: Record<string, ProgressEntry>;
  turn: number;
};

export type PenalSlice = {
  scenarios: PenalQuizSlice;
  recall: PenalQuizSlice;
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

export type PersistedState = {
  schemaVersion: 4;
  codes: CodesSlice;
  lea: LeaSlice;
  penal: PenalSlice;
  geo: GeoSlice;
};

export const initialState: PersistedState = {
  schemaVersion: 4,
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
  lea: {
    progress: {},
    turn: 0,
  },
  penal: {
    scenarios: { progress: {}, turn: 0 },
    recall: { progress: {}, turn: 0 },
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
};

let cachedSnapshot: PersistedState | null = null;
const listeners = new Set<() => void>();

type StoredV1 = {
  schemaVersion: 1;
  codes: CodesSlice;
};

type StoredV2 = {
  schemaVersion: 2;
  codes: CodesSlice;
  lea?: LeaSlice;
};

type StoredV3 = {
  schemaVersion: 3;
  codes: CodesSlice;
  lea: LeaSlice;
  penal: PenalSlice;
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
function migrateV3ToV4(v3: StoredV3): PersistedState {
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

function readFromStorage(): PersistedState {
  if (typeof localStorage === 'undefined') return cloneInitial();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return cloneInitial();
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState | StoredV3 | StoredV2 | StoredV1>;
    if (parsed?.schemaVersion === 4 && parsed.codes) {
      const v4 = parsed as Partial<PersistedState>;
      return {
        schemaVersion: 4,
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
      };
    }
    if (parsed?.schemaVersion === 3 && parsed.codes) {
      return migrateV3ToV4(parsed as StoredV3);
    }
    if (parsed?.schemaVersion === 2 && parsed.codes) {
      return migrateV3ToV4(migrateV2ToV3(parsed as StoredV2));
    }
    if (parsed?.schemaVersion === 1 && parsed.codes) {
      return migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(parsed as StoredV1)));
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
