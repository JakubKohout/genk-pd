import type { AnswerItem } from '../data/types';
import { normalize } from '@/shared/text/normalize';

export function matchAnswer(input: string, items: readonly AnswerItem[]): AnswerItem | null {
  const norm = normalize(input);
  if (!norm) return null;
  for (const item of items) {
    if (normalize(item.quote) === norm) return item;
    for (const alias of item.aliases) {
      if (normalize(alias) === norm) return item;
    }
  }
  return null;
}
