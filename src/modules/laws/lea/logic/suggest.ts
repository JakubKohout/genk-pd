import type { AnswerItem } from '../data/types';
import { normalize } from '@/shared/text/normalize';

export const AUTOCOMPLETE_MIN_LENGTH = 4;
export const AUTOCOMPLETE_MAX_RESULTS = 5;

export function suggestItems(
  input: string,
  items: readonly AnswerItem[],
  excludeIds: ReadonlySet<string>,
): AnswerItem[] {
  const norm = normalize(input);
  if (norm.length < AUTOCOMPLETE_MIN_LENGTH) return [];

  const matches: { item: AnswerItem; pos: number }[] = [];
  for (const item of items) {
    if (excludeIds.has(item.id)) continue;
    let bestPos = -1;
    const haystacks = [item.quote, ...item.aliases];
    for (const h of haystacks) {
      const pos = normalize(h).indexOf(norm);
      if (pos !== -1 && (bestPos === -1 || pos < bestPos)) bestPos = pos;
    }
    if (bestPos !== -1) matches.push({ item, pos: bestPos });
  }

  matches.sort((a, b) => a.pos - b.pos || a.item.quote.length - b.item.quote.length);
  return matches.slice(0, AUTOCOMPLETE_MAX_RESULTS).map((m) => m.item);
}
