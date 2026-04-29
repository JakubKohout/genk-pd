import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildOptions } from './distractors';
import { CODES, findCodeById } from '../data/codes';
import { mulberry32, resetRng, setRng } from '@/shared/rng';

beforeEach(() => setRng(mulberry32(7)));
afterEach(() => resetRng());

describe('buildOptions', () => {
  it('returns exactly 5 unique options including the correct one', () => {
    const correct = findCodeById('10-44')!;
    const opts = buildOptions(correct, CODES);
    expect(opts).toHaveLength(5);
    expect(new Set(opts.map((c) => c.id)).size).toBe(5);
    expect(opts.find((c) => c.id === correct.id)).toBeDefined();
  });

  it('includes 2 codes from the same decade when the decade is rich enough', () => {
    const correct = findCodeById('10-44')!; // decade 40..49
    const opts = buildOptions(correct, CODES);
    const decadeMates = opts.filter(
      (c) => c.id !== correct.id && c.number >= 40 && c.number <= 49,
    );
    expect(decadeMates.length).toBeGreaterThanOrEqual(2);
  });

  it('falls back to nearest-by-number when decade is sparse', () => {
    const correct = findCodeById('10-30')!; // decade 30..39 has only 10-30 and 10-32
    const opts = buildOptions(correct, CODES);
    expect(opts).toHaveLength(5);
    expect(new Set(opts.map((c) => c.id)).size).toBe(5);
    // 10-32 should always appear (only other in decade)
    expect(opts.find((c) => c.id === '10-32')).toBeDefined();
  });

  it('ignores the importance filter (distractors come from full set)', () => {
    // Even though "rare"/"unnecessary" exist, buildOptions doesn't take a filter — confirm by
    // observing that the function never references filtering and includes any code regardless.
    const correct = findCodeById('10-44')!; // rare
    let sawRareOrUnnecessaryDistractor = false;
    for (let i = 0; i < 50; i++) {
      const opts = buildOptions(correct, CODES);
      for (const c of opts) {
        if (c.id !== correct.id && c.importance !== 'mandatory') {
          sawRareOrUnnecessaryDistractor = true;
          break;
        }
      }
      if (sawRareOrUnnecessaryDistractor) break;
    }
    expect(sawRareOrUnnecessaryDistractor).toBe(true);
  });

  it('produces stable options under a fixed seed', () => {
    const correct = findCodeById('10-44')!;
    setRng(mulberry32(123));
    const a = buildOptions(correct, CODES).map((c) => c.id);
    setRng(mulberry32(123));
    const b = buildOptions(correct, CODES).map((c) => c.id);
    expect(a).toEqual(b);
  });
});
