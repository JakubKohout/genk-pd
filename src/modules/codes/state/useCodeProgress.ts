import { useCallback, useSyncExternalStore } from 'react';
import {
  type PersistedState,
  type ProgressEntry,
  loadState,
  saveState,
  subscribeState,
} from '@/shared/storage';

const MIN_SCORE = -3;
const MAX_SCORE = 3;

export function clampScore(s: number): number {
  if (s < MIN_SCORE) return MIN_SCORE;
  if (s > MAX_SCORE) return MAX_SCORE;
  return s;
}

export function useCodeProgress() {
  const state = useSyncExternalStore(subscribeState, loadState, loadState);

  const recordAnswer = useCallback((codeId: string, correct: boolean) => {
    const current = loadState();
    const entry = current.codes.progress[codeId] ?? { score: 0, lastAskedAtTurn: -1 };
    const nextEntry: ProgressEntry = {
      score: clampScore(entry.score + (correct ? 1 : -1)),
      lastAskedAtTurn: current.codes.turn,
    };
    const next: PersistedState = {
      ...current,
      codes: {
        ...current.codes,
        progress: { ...current.codes.progress, [codeId]: nextEntry },
        turn: current.codes.turn + 1,
      },
    };
    saveState(next);
  }, []);

  const reset = useCallback(() => {
    const current = loadState();
    const next: PersistedState = {
      ...current,
      codes: {
        ...current.codes,
        progress: {},
        turn: 0,
      },
    };
    saveState(next);
  }, []);

  return {
    progress: state.codes.progress,
    turn: state.codes.turn,
    recordAnswer,
    reset,
  };
}
