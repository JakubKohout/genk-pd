import { normalize } from '@/shared/text/normalize';
import { canonicalAnswerId } from '@/modules/laws/penal/logic/canonicalAnswerId';
import type { LawQuestion } from '../data/types';

export function matchEnumerationEntry(question: LawQuestion, raw: string): string | null {
  if (question.kind !== 'enumeration') return null;
  if (question.matcher === 'paragraph') {
    const cid = canonicalAnswerId(raw);
    if (!cid) return null;
    const hit = question.expected.find((e) => e.key === cid);
    return hit ? hit.key : null;
  }
  const norm = normalize(raw);
  if (!norm) return null;
  for (const e of question.expected) {
    if (normalize(e.label) === norm) return e.key;
    for (const alias of e.aliases ?? []) {
      if (normalize(alias) === norm) return e.key;
    }
  }
  return null;
}

export function matchOrdered(question: LawQuestion, rawLines: string[]): boolean {
  if (question.kind !== 'enumeration' || !question.ordered) return false;
  const got = rawLines.map((s) => normalize(s)).filter((s) => s.length > 0);
  if (got.length !== question.expected.length) return false;
  return question.expected.every((e, i) => normalize(e.label) === got[i]);
}
