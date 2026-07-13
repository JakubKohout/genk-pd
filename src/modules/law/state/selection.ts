import { pickNextFromPool } from '@/shared/quiz/pickNextFromPool';
import type { ProgressEntry, LawThemeFilter } from '@/shared/storage';
import type { LawQuestion } from '../data/types';

const MAX_SCORE = 2;

export type LawSliceState = { progress: Record<string, ProgressEntry>; turn: number };

export function eligibleQuestions(
  state: LawSliceState,
  all: readonly LawQuestion[],
  themeFilter: LawThemeFilter,
): LawQuestion[] {
  return all.filter(
    (q) => themeFilter[q.theme] && (state.progress[q.id]?.score ?? 0) < MAX_SCORE,
  );
}

export function isLawComplete(
  state: LawSliceState,
  all: readonly LawQuestion[],
  themeFilter: LawThemeFilter,
): boolean {
  return eligibleQuestions(state, all, themeFilter).length === 0;
}

export function pickNextQuestion(
  state: LawSliceState,
  all: readonly LawQuestion[],
  themeFilter: LawThemeFilter,
): LawQuestion | null {
  return pickNextFromPool(
    eligibleQuestions(state, all, themeFilter),
    state.progress,
    state.turn,
  );
}
