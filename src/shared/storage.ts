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

export type PersistedState = {
  schemaVersion: 1;
  codes: {
    progress: Record<string, ProgressEntry>;
    turn: number;
    settings: {
      importanceFilter: ImportanceFilter;
    };
  };
};

export const initialState: PersistedState = {
  schemaVersion: 1,
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
};

let cachedSnapshot: PersistedState | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): PersistedState {
  if (typeof localStorage === 'undefined') return cloneInitial();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return cloneInitial();
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed?.schemaVersion === 1 && parsed.codes) {
      return {
        schemaVersion: 1,
        codes: {
          progress: parsed.codes.progress ?? {},
          turn: parsed.codes.turn ?? 0,
          settings: {
            importanceFilter: {
              ...initialState.codes.settings.importanceFilter,
              ...(parsed.codes.settings?.importanceFilter ?? {}),
            },
          },
        },
      };
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
