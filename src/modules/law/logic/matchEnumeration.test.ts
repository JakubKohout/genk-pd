import { describe, expect, it } from 'vitest';
import { matchEnumerationEntry, matchOrdered } from './matchEnumeration';
import type { LawEnumeration } from '../data/types';

const ALIAS_Q: LawEnumeration = {
  id: 'a', source: 'lea', theme: 'paragrafy', prompt: 'p',
  kind: 'enumeration', matcher: 'alias',
  expected: [{ key: 'i1', label: 'Maják', aliases: ['varovne svetlo'] }],
};
const PARA_Q: LawEnumeration = {
  id: 'b', source: 'penal', theme: 'paragrafy', prompt: 'p',
  kind: 'enumeration', matcher: 'paragraph',
  expected: [{ key: '25b', label: '§25 b', subId: 'b' }, { key: '27', label: '§27' }],
};
const ORDER_Q: LawEnumeration = {
  id: 'c', source: 'sasp', theme: 'hodnosti', prompt: 'p',
  kind: 'enumeration', matcher: 'alias', ordered: true,
  expected: [{ key: 'Captain', label: 'Captain' }, { key: 'Cadet', label: 'Cadet' }],
};

describe('matchEnumerationEntry', () => {
  it('alias: matches label after normalize (diacritics/case)', () => {
    expect(matchEnumerationEntry(ALIAS_Q, 'majak')).toBe('i1');
  });
  it('alias: matches an alias', () => {
    expect(matchEnumerationEntry(ALIAS_Q, 'varovne svetlo')).toBe('i1');
  });
  it('alias: returns null on miss', () => {
    expect(matchEnumerationEntry(ALIAS_Q, 'nic')).toBeNull();
  });
  it('paragraph: canonicalizes §25 b -> 25b', () => {
    expect(matchEnumerationEntry(PARA_Q, '§25 b')).toBe('25b');
  });
  it('paragraph: wrong sub returns null', () => {
    expect(matchEnumerationEntry(PARA_Q, '25a')).toBeNull();
  });
});

describe('matchOrdered', () => {
  it('true on exact order', () => {
    expect(matchOrdered(ORDER_Q, ['Captain', 'Cadet'])).toBe(true);
  });
  it('false on swapped order', () => {
    expect(matchOrdered(ORDER_Q, ['Cadet', 'Captain'])).toBe(false);
  });
});
