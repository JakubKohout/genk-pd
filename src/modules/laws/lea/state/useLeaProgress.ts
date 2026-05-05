import { useCallback, useSyncExternalStore } from 'react';
import {
  getSnapshot,
  loadState,
  saveState,
  subscribeState,
  type ProgressEntry,
} from '@/shared/storage';

const MIN_SCORE = -2;
const MAX_SCORE = 2;

function clamp(n: number): number {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, n));
}

export function useLeaProgress() {
  const state = useSyncExternalStore(subscribeState, getSnapshot, getSnapshot);
  const { progress, turn } = state.lea;

  const recordSubmit = useCallback(
    (questionId: string, result: { perfect: boolean }) => {
      const current = loadState();
      const prev: ProgressEntry = current.lea.progress[questionId] ?? {
        score: 0,
        lastAskedAtTurn: current.lea.turn,
      };
      const delta = result.perfect ? 2 : -2;
      const next = { ...current };
      next.lea = {
        ...current.lea,
        turn: current.lea.turn + 1,
        progress: {
          ...current.lea.progress,
          [questionId]: {
            score: clamp(prev.score + delta),
            lastAskedAtTurn: current.lea.turn,
          },
        },
      };
      saveState(next);
    },
    [],
  );

  const recordSkip = useCallback((questionId: string) => {
    const current = loadState();
    const next = { ...current };
    next.lea = {
      ...current.lea,
      turn: current.lea.turn + 1,
      progress: {
        ...current.lea.progress,
        [questionId]: {
          score: MAX_SCORE,
          lastAskedAtTurn: current.lea.turn,
        },
      },
    };
    saveState(next);
  }, []);

  const reset = useCallback(() => {
    const current = loadState();
    saveState({ ...current, lea: { progress: {}, turn: 0 } });
  }, []);

  return { progress, turn, recordSubmit, recordSkip, reset };
}
