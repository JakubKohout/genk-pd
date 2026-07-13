import { LEA_QUESTIONS } from '@/modules/laws/lea/data/questions';
import type { Question } from '@/modules/laws/lea/data/types';
import type { LawQuestion } from './types';

function adaptOne(q: Question): LawQuestion {
  return {
    id: q.id,
    source: 'lea',
    theme: 'paragrafy',
    prompt: q.prompt,
    ref: q.ref,
    note: q.description,
    kind: 'enumeration',
    matcher: 'alias',
    expected: q.items.map((it) => ({ key: it.id, label: it.quote, aliases: it.aliases })),
  };
}

export function adaptLeaQuestions(): LawQuestion[] {
  return LEA_QUESTIONS.map(adaptOne);
}
