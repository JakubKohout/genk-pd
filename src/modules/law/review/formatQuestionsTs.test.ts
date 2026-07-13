import { describe, expect, it } from 'vitest';
import { formatQuestionsTs } from './formatQuestionsTs';
import type { LawQuestion } from '../data/types';

const Q: LawQuestion[] = [
  {
    id: 'sasp.choice.rto.1', theme: 'rto', title: "Znak 'Henry'",
    kind: 'choice', prompt: 'Jaký znak?',
    options: ['Henry', 'Adam', 'Viktor', 'David', 'Charlie'], correctIndices: [0],
    note: 'Henry.',
  },
  {
    id: 'lea.7', theme: 'paragrafy', title: 'Prokázání',
    kind: 'enumeration', matcher: 'alias', prompt: 'Vyjmenuj.',
    expected: [{ key: 'lea.7.A.1a', label: 'stejnokrojem', aliases: ['uniforma'], keywords: ['stejnokroj'] }],
  },
];

describe('formatQuestionsTs', () => {
  const ts = formatQuestionsTs(Q);

  it('emits file header, import and typed export', () => {
    expect(ts).toContain("import type { LawQuestion } from './types';");
    expect(ts).toContain('export const LAW_QUESTIONS: readonly LawQuestion[] = [');
    expect(ts.trimEnd().endsWith('];')).toBe(true);
  });
  it('escapes single quotes', () => {
    expect(ts).toContain("title: 'Znak \\'Henry\\'',");
  });
  it('emits arrays one item per line with trailing commas', () => {
    expect(ts).toContain("    options: [\n      'Henry',\n      'Adam',");
    expect(ts).toContain('    correctIndices: [\n      0,\n    ],');
  });
  it('emits expected items with canonical key order', () => {
    const item = ts.slice(ts.indexOf('expected: ['));
    expect(item.indexOf("key: 'lea.7.A.1a'")).toBeLessThan(item.indexOf("label: 'stejnokrojem'"));
    expect(item.indexOf('aliases: [')).toBeLessThan(item.indexOf('keywords: ['));
  });
  it('omits absent optional fields', () => {
    expect(ts).not.toContain('scenario:');
    expect(ts).not.toContain('ref:');
    expect(ts).not.toContain('subId:');
  });
});
