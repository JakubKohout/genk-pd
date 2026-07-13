import { normalize } from '@/shared/text/normalize';
import { canonicalAnswerId } from './canonicalAnswerId';
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
  for (const e of question.expected) {
    for (const kw of e.keywords ?? []) {
      if (keywordMatches(norm, kw)) return e.key;
    }
  }
  return null;
}

export function keywordMatches(normInput: string, keyword: string): boolean {
  const kwTokens = normalize(keyword).split(' ').filter(Boolean);
  if (kwTokens.length === 0) return false;
  const inTokens = normInput.split(' ').filter(Boolean);
  outer: for (let i = 0; i + kwTokens.length <= inTokens.length; i++) {
    for (let j = 0; j < kwTokens.length; j++) {
      if (!inTokens[i + j]!.startsWith(kwTokens[j]!)) continue outer;
    }
    return true;
  }
  return false;
}

export function matchOrdered(
  question: LawQuestion,
  matchedKeys: readonly (string | null)[],
): boolean {
  if (question.kind !== 'enumeration' || !question.ordered) return false;
  if (matchedKeys.length !== question.expected.length) return false;
  return question.expected.every((e, i) => matchedKeys[i] === e.key);
}
