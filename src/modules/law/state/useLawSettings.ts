import { useCallback, useSyncExternalStore } from 'react';
import {
  getSnapshot, loadState, saveState, subscribeState,
  type PersistedState, type LawThemeFilter, type LawThemeKey,
} from '@/shared/storage';

function setSettings(state: PersistedState, settings: PersistedState['law']['settings']): PersistedState {
  return { ...state, law: { ...state.law, settings } };
}

export function useLawSettings() {
  const state = useSyncExternalStore(subscribeState, getSnapshot, getSnapshot);
  const { themeFilter } = state.law.settings;

  const setTheme = useCallback((key: LawThemeKey, value: boolean) => {
    const cur = loadState();
    saveState(setSettings(cur, {
      themeFilter: { ...cur.law.settings.themeFilter, [key]: value } as LawThemeFilter,
    }));
  }, []);

  return { themeFilter, setTheme };
}
