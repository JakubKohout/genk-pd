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
  landmark: boolean;
  pd: boolean;
  fire: boolean;
  ems: boolean;
  ammu: boolean;
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
  schemaVersion: 6;
  codes: CodesSlice;
  lea: LeaSlice;
  penal: PenalSlice;
  geo: GeoSlice;
};

export const initialState: PersistedState = {
  schemaVersion: 6,
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
        landmark: true,
        pd: true,
        fire: true,
        ems: true,
        ammu: true,
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

type StoredV4 = {
  schemaVersion: 4;
  codes: CodesSlice;
  lea: LeaSlice;
  penal: PenalSlice;
  geo: {
    blind: GeoQuizSlice;
    name: GeoQuizSlice;
    settings: {
      categoryFilter: Partial<GeoCategoryFilter>;
    };
  };
};

type StoredV5 = {
  schemaVersion: 5;
  codes: CodesSlice;
  lea: LeaSlice;
  penal: PenalSlice;
  geo: GeoSlice;
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
        categoryFilter: {},
      },
    },
  };
}

function migrateV4ToV5(v4: StoredV4): StoredV5 {
  return {
    schemaVersion: 5,
    codes: v4.codes,
    lea: v4.lea,
    penal: v4.penal,
    geo: {
      blind: { progress: {}, turn: 0 },
      name: { progress: {}, turn: 0 },
      settings: {
        categoryFilter: {
          ...initialState.geo.settings.categoryFilter,
          ...(v4.geo?.settings?.categoryFilter ?? {}),
        },
      },
    },
  };
}

function migrateV5ToV6(v5: StoredV5): PersistedState {
  return {
    schemaVersion: 6,
    codes: v5.codes,
    lea: v5.lea,
    penal: v5.penal,
    geo: {
      blind: { progress: {}, turn: 0 },
      name: { progress: {}, turn: 0 },
      settings: {
        categoryFilter: {
          ...initialState.geo.settings.categoryFilter,
          ...(v5.geo?.settings?.categoryFilter ?? {}),
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
    const parsed = JSON.parse(raw) as Partial<
      PersistedState | StoredV5 | StoredV4 | StoredV3 | StoredV2 | StoredV1
    >;
    if (parsed?.schemaVersion === 6 && parsed.codes) {
      const v6 = parsed as Partial<PersistedState>;
      return {
        schemaVersion: 6,
        codes: {
          progress: v6.codes?.progress ?? {},
          turn: v6.codes?.turn ?? 0,
          settings: {
            importanceFilter: {
              ...initialState.codes.settings.importanceFilter,
              ...(v6.codes?.settings?.importanceFilter ?? {}),
            },
          },
        },
        lea: {
          progress: v6.lea?.progress ?? {},
          turn: v6.lea?.turn ?? 0,
        },
        penal: {
          scenarios: {
            progress: v6.penal?.scenarios?.progress ?? {},
            turn: v6.penal?.scenarios?.turn ?? 0,
          },
          recall: {
            progress: v6.penal?.recall?.progress ?? {},
            turn: v6.penal?.recall?.turn ?? 0,
          },
        },
        geo: {
          blind: {
            progress: v6.geo?.blind?.progress ?? {},
            turn: v6.geo?.blind?.turn ?? 0,
          },
          name: {
            progress: v6.geo?.name?.progress ?? {},
            turn: v6.geo?.name?.turn ?? 0,
          },
          settings: {
            categoryFilter: {
              ...initialState.geo.settings.categoryFilter,
              ...(v6.geo?.settings?.categoryFilter ?? {}),
            },
          },
        },
      };
    }
    if (parsed?.schemaVersion === 5 && parsed.codes) {
      return migrateV5ToV6(parsed as StoredV5);
    }
    if (parsed?.schemaVersion === 4 && parsed.codes) {
      return migrateV5ToV6(migrateV4ToV5(parsed as StoredV4));
    }
    if (parsed?.schemaVersion === 3 && parsed.codes) {
      return migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(parsed as StoredV3)));
    }
    if (parsed?.schemaVersion === 2 && parsed.codes) {
      return migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(parsed as StoredV2))));
    }
    if (parsed?.schemaVersion === 1 && parsed.codes) {
      return migrateV5ToV6(
        migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(parsed as StoredV1)))),
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
