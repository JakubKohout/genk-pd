import { normalize } from '@/shared/text/normalize';
import type { LawQuestion } from '../data/types';

export function matchText(question: LawQuestion, raw: string): boolean {
  if (question.kind !== 'text') return false;
  const norm = normalize(raw);
  if (!norm) return false;
  if (normalize(question.answer) === norm) return true;
  return question.aliases.some((a) => normalize(a) === norm);
}
