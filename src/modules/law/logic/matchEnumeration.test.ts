import { describe, expect, it } from 'vitest';
import { keywordMatches, matchEnumerationEntry, matchOrdered } from './matchEnumeration';
import type { LawEnumeration } from '../data/types';

const ALIAS_Q: LawEnumeration = {
  id: 'a', theme: 'paragrafy', prompt: 'p',
  kind: 'enumeration', matcher: 'alias',
  expected: [{ key: 'i1', label: 'Maják', aliases: ['varovne svetlo'] }],
};
const PARA_Q: LawEnumeration = {
  id: 'b', theme: 'paragrafy', prompt: 'p',
  kind: 'enumeration', matcher: 'paragraph',
  expected: [{ key: '25b', label: '§25 b', subId: 'b' }, { key: '27', label: '§27' }],
};
const ORDERED: LawEnumeration = {
  id: 'o', theme: 'hodnosti', prompt: 'p',
  kind: 'enumeration', matcher: 'alias', ordered: true,
  expected: [{ key: 'cap', label: 'Captain' }, { key: 'cad', label: 'Cadet' }],
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
  it('true when matched keys align with expected order', () => {
    expect(matchOrdered(ORDERED, ['cap', 'cad'])).toBe(true);
  });
  it('false on wrong order', () => {
    expect(matchOrdered(ORDERED, ['cad', 'cap'])).toBe(false);
  });
  it('false on missing or extra entries', () => {
    expect(matchOrdered(ORDERED, ['cap'])).toBe(false);
    expect(matchOrdered(ORDERED, ['cap', 'cad', 'cap'])).toBe(false);
  });
  it('false on unmatched entry', () => {
    expect(matchOrdered(ORDERED, ['cap', null])).toBe(false);
  });
});

const KW: LawEnumeration = {
  id: 'kw', theme: 'paragrafy', prompt: 'p',
  kind: 'enumeration', matcher: 'alias',
  expected: [
    { key: 'a', label: 'činu upřímně litoval', aliases: ['lítost'], keywords: ['litoval', 'litost'] },
    { key: 'b', label: 'překročená nutná obrana', aliases: [], keywords: ['nutn obran'] },
  ],
};

describe('matchEnumerationEntry — keywords', () => {
  it('matches a paraphrase containing a keyword token', () => {
    expect(matchEnumerationEntry(KW, 'pachatel toho upřímně litoval')).toBe('a');
  });
  it('keyword token is a prefix — Czech inflection matches', () => {
    expect(matchEnumerationEntry(KW, 'projevil lítost nad činem')).toBe('a');
  });
  it('multi-word keyword matches inflected phrase', () => {
    expect(matchEnumerationEntry(KW, 'bránil se nutnou obranou')).toBe('b');
  });
  it('does not match inside a word (no substring match)', () => {
    const q: LawEnumeration = { ...KW, expected: [{ key: 'x', label: 'lest', keywords: ['lest'] }] };
    expect(matchEnumerationEntry(q, 'cítil bolest')).toBeNull();
  });
  it('exact alias of another item wins over keyword containment', () => {
    const q: LawEnumeration = {
      ...KW,
      expected: [
        { key: 'a', label: 'aaa', keywords: ['litost'] },
        { key: 'b', label: 'lítost', aliases: [] },
      ],
    };
    expect(matchEnumerationEntry(q, 'lítost')).toBe('b');
  });
});

describe('keywordMatches', () => {
  it('prefix-run match', () => {
    expect(keywordMatches('branil se nutnou obranou', 'nutn obran')).toBe(true);
  });
  it('non-consecutive tokens do not match', () => {
    expect(keywordMatches('nutna byla jeho obrana', 'nutn obran')).toBe(false);
  });
});
