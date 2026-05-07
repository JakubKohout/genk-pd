import { pickNextFromPool } from '@/shared/quiz/pickNextFromPool';
import type { ProgressEntry } from '@/shared/storage';
import type { PenalParagraph, PenalScenario } from '../data/types';

const MAX_SCORE = 2;

export type PenalSliceState = {
  progress: Record<string, ProgressEntry>;
  turn: number;
};

export function eligibleScenarios(
  state: PenalSliceState,
  all: readonly PenalScenario[],
): PenalScenario[] {
  return all.filter((s) => (state.progress[s.id]?.score ?? 0) < MAX_SCORE);
}

export function eligibleRecallParagraphs(
  state: PenalSliceState,
  all: readonly PenalParagraph[],
): PenalParagraph[] {
  return all.filter((p) => (state.progress[p.id]?.score ?? 0) < MAX_SCORE);
}

export function isScenariosComplete(
  state: PenalSliceState,
  all: readonly PenalScenario[],
): boolean {
  return eligibleScenarios(state, all).length === 0;
}

export function isRecallComplete(
  state: PenalSliceState,
  all: readonly PenalParagraph[],
): boolean {
  return eligibleRecallParagraphs(state, all).length === 0;
}

export function pickNextScenario(
  state: PenalSliceState,
  all: readonly PenalScenario[],
): PenalScenario | null {
  return pickNextFromPool(eligibleScenarios(state, all), state.progress, state.turn);
}

export function pickNextRecallParagraph(
  state: PenalSliceState,
  all: readonly PenalParagraph[],
): PenalParagraph | null {
  return pickNextFromPool(eligibleRecallParagraphs(state, all), state.progress, state.turn);
}
