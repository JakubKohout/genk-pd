import { describe, expect, it } from 'vitest';
import { suggestText, suggestEnumeration } from './suggest';
import type { LawText, LawEnumeration } from '../data/types';

const T: LawText = {
  id: 't', source: 'sasp', theme: 'rto', prompt: 'p',
  kind: 'text', answer: 'Frekvence 1', aliases: ['kanál 1'],
};
const E: LawEnumeration = {
  id: 'e', source: 'lea', theme: 'paragrafy', prompt: 'p',
  kind: 'enumeration', matcher: 'alias',
  expected: [
    { key: 'a', label: 'Maják', aliases: ['varovne svetlo'] },
    { key: 'b', label: 'Houkačka', aliases: [] },
  ],
};

describe('suggestText', () => {
  it('returns the answer when input is a substring (min 2 chars)', () => {
    expect(suggestText(T, 'frek')).toContain('Frekvence 1');
  });
  it('returns [] below min length', () => {
    expect(suggestText(T, 'f')).toEqual([]);
  });
});

describe('suggestEnumeration', () => {
  it('suggests expected labels by substring, excluding already-found keys', () => {
    const out = suggestEnumeration(E, 'ho', new Set());
    expect(out.map((s) => s.label)).toContain('Houkačka');
  });
  it('excludes keys already found', () => {
    const out = suggestEnumeration(E, 'ma', new Set(['a']));
    expect(out).toEqual([]);
  });
});
