import { normalize } from '@/shared/text/normalize';
import type { PenalParagraph } from '../data/types';

/**
 * Mode B: user types a paragraf name, we match against title + aliases.
 * Strict equality after normalize (NFD diakritika strip + lowercase + whitespace collapse).
 * Returns the first matching paragraf or null.
 */
export function matchParagraph(
  input: string,
  paragraphs: readonly PenalParagraph[],
): PenalParagraph | null {
  const norm = normalize(input);
  if (!norm) return null;
  for (const p of paragraphs) {
    if (normalize(p.title) === norm) return p;
    for (const alias of p.aliases) {
      if (normalize(alias) === norm) return p;
    }
  }
  return null;
}
