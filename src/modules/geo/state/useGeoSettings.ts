import { useCallback, useSyncExternalStore } from 'react';
import {
  getSnapshot,
  loadState,
  saveState,
  subscribeState,
  type GeoCategoryFilter,
} from '@/shared/storage';

interface GeoSettingsApi {
  categoryFilter: GeoCategoryFilter;
  setCategory: (category: keyof GeoCategoryFilter, enabled: boolean) => void;
}

export function useGeoSettings(): GeoSettingsApi {
  const state = useSyncExternalStore(subscribeState, getSnapshot, getSnapshot);
  const categoryFilter = state.geo.settings.categoryFilter;

  const setCategory = useCallback(
    (category: keyof GeoCategoryFilter, enabled: boolean) => {
      const current = loadState();
      saveState({
        ...current,
        geo: {
          ...current.geo,
          settings: {
            ...current.geo.settings,
            categoryFilter: {
              ...current.geo.settings.categoryFilter,
              [category]: enabled,
            },
          },
        },
      });
    },
    [],
  );

  return { categoryFilter, setCategory };
}
