import { canonicalAnswerId } from './canonicalAnswerId';
import type { PenalParagraph } from '../data/paragraphs';

export type ParagraphLookup =
  | { kind: 'valid'; display: string }
  | { kind: 'unknown' }
  | { kind: 'unparseable' };

/**
 * Distinguishes feedback for the paragraph matcher: a valid (existing)
 * paragraph can be named, while a parseable-but-nonexistent number is
 * distinguished from unparseable input.
 */
export function lookupParagraph(
  raw: string,
  paragraphs: readonly PenalParagraph[],
): ParagraphLookup {
  const cid = canonicalAnswerId(raw);
  if (!cid) return { kind: 'unparseable' };
  const m = /^(\d+)([a-e]?)$/.exec(cid);
  if (!m) return { kind: 'unparseable' };
  const para = paragraphs.find((p) => p.id === `penal.${m[1]}`);
  if (!para) return { kind: 'unknown' };
  if (m[2]) {
    if (!para.subs.some((s) => s.id === m[2])) return { kind: 'unknown' };
    return { kind: 'valid', display: `§${m[1]} ${m[2]} — ${para.title}` };
  }
  return { kind: 'valid', display: `§${m[1]} — ${para.title}` };
}
