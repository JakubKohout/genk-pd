import type { LawQuestion } from '../data/types';

export function checkMatch(
  question: LawQuestion,
  assignments: Record<string, string>,
): boolean {
  if (question.kind !== 'match') return false;
  return question.pairs.every((p) => assignments[p.left] === p.right);
}
