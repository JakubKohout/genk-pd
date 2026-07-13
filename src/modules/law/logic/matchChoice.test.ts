import { describe, expect, it } from 'vitest';
import { matchChoice } from './matchChoice';

describe('matchChoice (set equality)', () => {
  it('true when selected set equals correct set (order-independent)', () => {
    expect(matchChoice([2, 0], [0, 2])).toBe(true);
  });
  it('false when a correct option is missing', () => {
    expect(matchChoice([0], [0, 2])).toBe(false);
  });
  it('false when an extra wrong option is selected', () => {
    expect(matchChoice([0, 1, 2], [0, 2])).toBe(false);
  });
  it('false when nothing selected', () => {
    expect(matchChoice([], [1])).toBe(false);
  });
  it('handles single-correct', () => {
    expect(matchChoice([1], [1])).toBe(true);
  });
});
