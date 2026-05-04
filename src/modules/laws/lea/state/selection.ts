import type { Question } from '../data/types';
import type { ProgressEntry } from '@/shared/storage';
import { pickNextFromPool } from '@/shared/quiz/pickNextFromPool';

const MAX_SCORE = 3;

export type LeaSelectionState = {
  progress: Record<string, ProgressEntry>;
  turn: number;
};

export function eligibleQuestions(
  state: LeaSelectionState,
  all: readonly Question[],
): Question[] {
  return all.filter((q) => (state.progress[q.id]?.score ?? 0) < MAX_SCORE);
}

export function isLeaComplete(
  state: LeaSelectionState,
  all: readonly Question[],
): boolean {
  return eligibleQuestions(state, all).length === 0;
}

export function pickNextQuestion(
  state: LeaSelectionState,
  all: readonly Question[],
): Question | null {
  return pickNextFromPool(eligibleQuestions(state, all), state.progress, state.turn);
}
