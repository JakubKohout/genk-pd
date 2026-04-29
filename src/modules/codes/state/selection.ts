import type { Code } from '../data/codes';
import type { ImportanceFilter, ProgressEntry } from '@/shared/storage';
import { weightedRandom } from '@/shared/rng';

const MAX_SCORE = 3;
const COOLDOWN_TURNS = 2;

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
  const eligible = eligibleCodes(state, allCodes);
  if (eligible.length === 0) return null;

  const cooled = eligible.filter((c) => {
    const last = state.progress[c.id]?.lastAskedAtTurn ?? Number.NEGATIVE_INFINITY;
    return state.turn - last >= COOLDOWN_TURNS;
  });
  const pool = cooled.length > 0 ? cooled : eligible;

  const weights = pool.map((c) => 4 - (state.progress[c.id]?.score ?? 0));
  return weightedRandom(pool, weights);
}

export function isComplete(state: SelectionState, allCodes: readonly Code[]): boolean {
  return eligibleCodes(state, allCodes).length === 0;
}
