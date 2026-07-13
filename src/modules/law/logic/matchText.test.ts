import { describe, expect, it } from 'vitest';
import { matchText } from './matchText';
import type { LawText } from '../data/types';

const Q: LawText = {
  id: 't', source: 'sasp', theme: 'rto', prompt: 'p',
  kind: 'text', answer: 'Frekvence 1', aliases: ['f1', 'kanál 1'],
};

describe('matchText', () => {
  it('matches the answer after normalize (case/diacritics)', () => {
    expect(matchText(Q, 'frekvence 1')).toBe(true);
  });
  it('matches an alias', () => {
    expect(matchText(Q, 'F1')).toBe(true);
  });
  it('false on miss', () => {
    expect(matchText(Q, 'nesmysl')).toBe(false);
  });
  it('false for non-text kinds', () => {
    expect(matchText({ ...Q, kind: 'match' } as never, 'x')).toBe(false);
  });
});
