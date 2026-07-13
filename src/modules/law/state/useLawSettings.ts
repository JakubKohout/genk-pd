import { useCallback, useSyncExternalStore } from 'react';
import {
  getSnapshot, loadState, saveState, subscribeState,
  type PersistedState, type LawSourceFilter, type LawThemeFilter, type LawThemeKey,
} from '@/shared/storage';

function setSettings(state: PersistedState, settings: PersistedState['law']['settings']): PersistedState {
  return { ...state, law: { ...state.law, settings } };
}

export function useLawSettings() {
  const state = useSyncExternalStore(subscribeState, getSnapshot, getSnapshot);
  const { sourceFilter, themeFilter } = state.law.settings;

  const setSource = useCallback((key: keyof LawSourceFilter, value: boolean) => {
    const cur = loadState();
    saveState(setSettings(cur, {
      ...cur.law.settings,
      sourceFilter: { ...cur.law.settings.sourceFilter, [key]: value },
    }));
  }, []);

  const setTheme = useCallback((key: LawThemeKey, value: boolean) => {
    const cur = loadState();
    saveState(setSettings(cur, {
      ...cur.law.settings,
      themeFilter: { ...cur.law.settings.themeFilter, [key]: value } as LawThemeFilter,
    }));
  }, []);

  return { sourceFilter, themeFilter, setSource, setTheme };
}
