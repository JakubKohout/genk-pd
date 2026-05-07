import { useCallback, useSyncExternalStore } from 'react';
import {
  getSnapshot,
  loadState,
  saveState,
  subscribeState,
  type PenalQuizSlice,
  type PenalSlice,
  type PersistedState,
  type ProgressEntry,
} from '@/shared/storage';

const MIN_SCORE = -2;
const MAX_SCORE = 2;

function clamp(n: number): number {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, n));
}

type SliceKey = keyof PenalSlice;

interface PenalProgressApi {
  progress: Record<string, ProgressEntry>;
  turn: number;
  recordSubmit: (questionId: string, result: { perfect: boolean }) => void;
  recordSkip: (questionId: string) => void;
  reset: () => void;
}

function setSlice(state: PersistedState, key: SliceKey, slice: PenalQuizSlice): PersistedState {
  return {
    ...state,
    penal: {
      ...state.penal,
      [key]: slice,
    },
  };
}

function usePenalSliceProgress(key: SliceKey): PenalProgressApi {
  const state = useSyncExternalStore(subscribeState, getSnapshot, getSnapshot);
  const slice = state.penal[key];

  const recordSubmit = useCallback(
    (questionId: string, result: { perfect: boolean }) => {
      const current = loadState();
      const cur = current.penal[key];
      const prev: ProgressEntry = cur.progress[questionId] ?? {
        score: 0,
        lastAskedAtTurn: cur.turn,
      };
      const delta = result.perfect ? 2 : -2;
      const nextSlice: PenalQuizSlice = {
        turn: cur.turn + 1,
        progress: {
          ...cur.progress,
          [questionId]: {
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
    (questionId: string) => {
      const current = loadState();
      const cur = current.penal[key];
      const nextSlice: PenalQuizSlice = {
        turn: cur.turn + 1,
        progress: {
          ...cur.progress,
          [questionId]: {
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

export function usePenalScenarioProgress(): PenalProgressApi {
  return usePenalSliceProgress('scenarios');
}

export function usePenalRecallProgress(): PenalProgressApi {
  return usePenalSliceProgress('recall');
}
