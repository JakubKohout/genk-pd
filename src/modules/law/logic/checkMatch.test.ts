import { describe, expect, it } from 'vitest';
import { checkMatch } from './checkMatch';
import type { LawMatch } from '../data/types';

const Q: LawMatch = {
  id: 'x', theme: 'hodnosti', prompt: 'p',
  kind: 'match', leftLabel: 'L', rightLabel: 'R',
  pairs: [{ left: 'SWAT', right: 'David' }, { left: 'DBI', right: 'William' }],
};

describe('checkMatch', () => {
  it('true when every left maps to its correct right', () => {
    expect(checkMatch(Q, { SWAT: 'David', DBI: 'William' })).toBe(true);
  });
  it('false on a wrong pairing', () => {
    expect(checkMatch(Q, { SWAT: 'William', DBI: 'David' })).toBe(false);
  });
  it('false when an assignment is missing', () => {
    expect(checkMatch(Q, { SWAT: 'David' })).toBe(false);
  });
});
