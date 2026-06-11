import { useCallback, useSyncExternalStore } from 'react';
import {
  getSnapshot,
  loadState,
  saveState,
  subscribeState,
  type GeoQuizSlice,
  type GeoSlice,
  type PersistedState,
  type ProgressEntry,
} from '@/shared/storage';

const MIN_SCORE = -2;
const MAX_SCORE = 2;

function clamp(n: number): number {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, n));
}

type GeoModeKey = 'blind' | 'name';

interface GeoProgressApi {
  progress: Record<string, ProgressEntry>;
  turn: number;
  recordSubmit: (poiId: string, result: { perfect: boolean }) => void;
  recordSkip: (poiId: string) => void;
  reset: () => void;
}

function setSlice(state: PersistedState, key: GeoModeKey, slice: GeoQuizSlice): PersistedState {
  return {
    ...state,
    geo: {
      ...state.geo,
      [key]: slice,
    } as GeoSlice,
  };
}

function useGeoSliceProgress(key: GeoModeKey): GeoProgressApi {
  const state = useSyncExternalStore(subscribeState, getSnapshot, getSnapshot);
  const slice = state.geo[key];

  const recordSubmit = useCallback(
    (poiId: string, result: { perfect: boolean }) => {
      const current = loadState();
      const cur = current.geo[key];
      const prev: ProgressEntry = cur.progress[poiId] ?? {
        score: 0,
        lastAskedAtTurn: cur.turn,
      };
      const delta = result.perfect ? 2 : -2;
      const nextSlice: GeoQuizSlice = {
        turn: cur.turn + 1,
        progress: {
          ...cur.progress,
          [poiId]: {
            score: clamp(prev.score + delta),
            lastAskedAtTurn: cur.turn,
          },
        },
      };
      saveState(setSlice(current, key, nextSlice));
    },
    [key],
  );

  const recordSkip = useCallback(
    (poiId: string) => {
      const current = loadState();
      const cur = current.geo[key];
      const nextSlice: GeoQuizSlice = {
        turn: cur.turn + 1,
        progress: {
          ...cur.progress,
          [poiId]: {
            score: MAX_SCORE,
            lastAskedAtTurn: cur.turn,
          },
        },
      };
      saveState(setSlice(current, key, nextSlice));
    },
    [key],
  );

  const reset = useCallback(() => {
    const current = loadState();
    saveState(setSlice(current, key, { progress: {}, turn: 0 }));
  }, [key]);

  return {
    progress: slice.progress,
    turn: slice.turn,
    recordSubmit,
    recordSkip,
    reset,
  };
}

export function useGeoBlindProgress(): GeoProgressApi {
  return useGeoSliceProgress('blind');
}

export function useGeoNameProgress(): GeoProgressApi {
  return useGeoSliceProgress('name');
}
