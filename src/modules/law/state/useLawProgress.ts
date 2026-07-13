import { useCallback, useSyncExternalStore } from 'react';
import {
  getSnapshot, loadState, saveState, subscribeState,
  type PersistedState, type ProgressEntry, type LawSlice,
} from '@/shared/storage';

const MIN_SCORE = -2;
const MAX_SCORE = 2;
const clamp = (n: number) => Math.max(MIN_SCORE, Math.min(MAX_SCORE, n));

interface LawProgressApi {
  progress: Record<string, ProgressEntry>;
  turn: number;
  recordSubmit: (id: string, result: { perfect: boolean }) => void;
  recordSkip: (id: string) => void;
  reset: () => void;
}

function setLaw(state: PersistedState, patch: Partial<LawSlice>): PersistedState {
  return { ...state, law: { ...state.law, ...patch } };
}

export function useLawProgress(): LawProgressApi {
  const state = useSyncExternalStore(subscribeState, getSnapshot, getSnapshot);
  const slice = state.law;

  const recordSubmit = useCallback((id: string, result: { perfect: boolean }) => {
    const current = loadState();
    const cur = current.law;
    const prev = cur.progress[id] ?? { score: 0, lastAskedAtTurn: cur.turn };
    const delta = result.perfect ? 2 : -2;
    saveState(setLaw(current, {
      turn: cur.turn + 1,
      progress: { ...cur.progress, [id]: { score: clamp(prev.score + delta), lastAskedAtTurn: cur.turn } },
    }));
  }, []);

  const recordSkip = useCallback((id: string) => {
    const current = loadState();
    const cur = current.law;
    saveState(setLaw(current, {
      turn: cur.turn + 1,
      progress: { ...cur.progress, [id]: { score: MAX_SCORE, lastAskedAtTurn: cur.turn } },
    }));
  }, []);

  const reset = useCallback(() => {
    saveState(setLaw(loadState(), { progress: {}, turn: 0 }));
  }, []);

  return { progress: slice.progress, turn: slice.turn, recordSubmit, recordSkip, reset };
}
