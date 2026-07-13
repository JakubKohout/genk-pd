import { normalize } from '@/shared/text/normalize';
import type { LawQuestion } from '../data/types';

const MIN = 2;
const MAX = 5;

export function suggestText(question: LawQuestion, raw: string): string[] {
  if (question.kind !== 'text') return [];
  const norm = normalize(raw);
  if (norm.length < MIN) return [];
  const candidates = [question.answer, ...question.aliases];
  return candidates.filter((c) => normalize(c).includes(norm)).slice(0, MAX);
}

export interface EnumSuggestion {
  key: string;
  label: string;
}

export function suggestEnumeration(
  question: LawQuestion,
  raw: string,
  excludeKeys: Set<string>,
): EnumSuggestion[] {
  if (question.kind !== 'enumeration') return [];
  const norm = normalize(raw);
  if (norm.length < MIN) return [];
  return question.expected
    .filter((e) => !excludeKeys.has(e.key))
    .filter((e) =>
      normalize(e.label).includes(norm) ||
      (e.aliases ?? []).some((a) => normalize(a).includes(norm)),
    )
    .map((e) => ({ key: e.key, label: e.label }))
    .slice(0, MAX);
}
