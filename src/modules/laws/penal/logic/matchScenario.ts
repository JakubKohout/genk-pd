import type { ExpectedAnswer, PenalParagraph } from '../data/types';
import { canonicalAnswerId } from './canonicalAnswerId';

/**
 * Parse a user-typed paragraf ID for mode A and resolve to an ExpectedAnswer.
 *
 * Strict semantics:
 * - Paragraf must exist in the catalog.
 * - If paragraf has subs, sub MUST be specified and must be valid.
 * - If paragraf has no subs, sub MUST NOT be specified.
 *
 * Returns null on any violation. The caller treats null as a "wrong" answer.
 */
export function matchScenarioAnswer(
  input: string,
  paragraphs: readonly PenalParagraph[],
): ExpectedAnswer | null {
  const canonical = canonicalAnswerId(input);
  if (!canonical) return null;
  const m = /^(\d+)([a-e]?)$/.exec(canonical);
  if (!m) return null;
  const num = m[1];
  const sub = m[2] || undefined;
  const paragraphId = `penal.${num}`;
  const paragraph = paragraphs.find((p) => p.id === paragraphId);
  if (!paragraph) return null;
  if (paragraph.subs.length > 0) {
    if (!sub) return null;
    if (!paragraph.subs.some((s) => s.id === sub)) return null;
    return { paragraphId, subId: sub };
  }
  if (sub) return null;
  return { paragraphId };
}

/** Two ExpectedAnswers refer to the same paragraf+sub combination. */
export function expectedEquals(a: ExpectedAnswer, b: ExpectedAnswer): boolean {
  return a.paragraphId === b.paragraphId && (a.subId ?? null) === (b.subId ?? null);
}
