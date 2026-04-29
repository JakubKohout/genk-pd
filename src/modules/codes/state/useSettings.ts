import { useCallback, useSyncExternalStore } from 'react';
import {
  type ImportanceFilter,
  type PersistedState,
  loadState,
  saveState,
  subscribeState,
} from '@/shared/storage';
import type { Importance } from '../data/codes';

export function useSettings() {
  const state = useSyncExternalStore(subscribeState, loadState, loadState);

  const setImportance = useCallback((importance: Importance, enabled: boolean) => {
    const current = loadState();
    const nextFilter: ImportanceFilter = {
      ...current.codes.settings.importanceFilter,
      [importance]: enabled,
    };
    const next: PersistedState = {
      ...current,
      codes: {
        ...current.codes,
        settings: { importanceFilter: nextFilter },
      },
    };
    saveState(next);
  }, []);

  return {
    importanceFilter: state.codes.settings.importanceFilter,
    setImportance,
  };
}
