import type { Code } from '../data/codes';
import type { ImportanceFilter, ProgressEntry } from '@/shared/storage';
import { pickNextFromPool } from '@/shared/quiz/pickNextFromPool';

const MAX_SCORE = 2;

export type SelectionState = {
  progress: Record<string, ProgressEntry>;
  turn: number;
  filter: ImportanceFilter;
};

export function eligibleCodes(state: SelectionState, allCodes: readonly Code[]): Code[] {
  return allCodes.filter((c) => {
    if (!state.filter[c.importance]) return false;
    const score = state.progress[c.id]?.score ?? 0;
    return score < MAX_SCORE;
  });
}

export function pickNextCode(
  state: SelectionState,
  allCodes: readonly Code[],
): Code | null {
  return pickNextFromPool(eligibleCodes(state, allCodes), state.progress, state.turn);
}

export function isComplete(state: SelectionState, allCodes: readonly Code[]): boolean {
  return eligibleCodes(state, allCodes).length === 0;
}
