import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eligibleCodes, isComplete, pickNextCode, type SelectionState } from './selection';
import { CODES } from '../data/codes';
import { mulberry32, resetRng, setRng } from '@/shared/rng';

const allMandatory: SelectionState['filter'] = {
  mandatory: true,
  rare: false,
  unnecessary: false,
};

function emptyState(filter: SelectionState['filter'] = allMandatory): SelectionState {
  return { progress: {}, turn: 0, filter };
}

beforeEach(() => setRng(mulberry32(42)));
afterEach(() => resetRng());

describe('eligibleCodes', () => {
  it('filters by importance', () => {
    const onlyMandatory = eligibleCodes(emptyState({ mandatory: true, rare: false, unnecessary: false }), CODES);
    expect(onlyMandatory.every((c) => c.importance === 'mandatory')).toBe(true);

    const all = eligibleCodes(emptyState({ mandatory: true, rare: true, unnecessary: true }), CODES);
    expect(all.length).toBe(CODES.length);
  });

  it('excludes codes at +3', () => {
    const state: SelectionState = {
      progress: { '10-44': { score: 3, lastAskedAtTurn: 0 } },
      turn: 5,
      filter: { mandatory: true, rare: true, unnecessary: false },
    };
    const eligible = eligibleCodes(state, CODES);
    expect(eligible.find((c) => c.id === '10-44')).toBeUndefined();
  });
});

describe('pickNextCode', () => {
  it('returns null when nothing is eligible', () => {
    const state: SelectionState = emptyState({ mandatory: false, rare: false, unnecessary: false });
    expect(pickNextCode(state, CODES)).toBeNull();
  });

  it('respects cooldown of 2 turns (just-asked code is not picked)', () => {
    const state: SelectionState = {
      progress: { '10-0': { score: 0, lastAskedAtTurn: 4 } },
      turn: 5,
      filter: allMandatory,
    };
    for (let i = 0; i < 50; i++) {
      const picked = pickNextCode(state, CODES)!;
      expect(picked.id).not.toBe('10-0');
    }
  });

  it('cooldown unlocks after 2 turns', () => {
    const state: SelectionState = {
      progress: { '10-0': { score: 0, lastAskedAtTurn: 3 } },
      turn: 5,
      filter: allMandatory,
    };
    const picks = new Set<string>();
    for (let i = 0; i < 200; i++) picks.add(pickNextCode(state, CODES)!.id);
    expect(picks.has('10-0')).toBe(true);
  });

  it('cooldown is bypassed when it would empty the pool', () => {
    // Only 1 mandatory code, just asked → should still return that code.
    const tinyCodes = [CODES.find((c) => c.id === '10-44')!];
    const state: SelectionState = {
      progress: { '10-44': { score: 0, lastAskedAtTurn: 5 } },
      turn: 5,
      filter: { mandatory: false, rare: true, unnecessary: false }, // 10-44 is rare
    };
    expect(pickNextCode(state, tinyCodes)?.id).toBe('10-44');
  });

  it('weights toward lower scores (lowest-score code appears more often)', () => {
    const state: SelectionState = {
      progress: {
        '10-0': { score: -3, lastAskedAtTurn: -10 },
        '10-1': { score: 2, lastAskedAtTurn: -10 },
      },
      turn: 0,
      filter: { mandatory: true, rare: false, unnecessary: false },
    };
    // Restrict the pool to two codes by faking allCodes input:
    const subset = [CODES.find((c) => c.id === '10-0')!, CODES.find((c) => c.id === '10-1')!];

    let lowScoreHits = 0;
    let highScoreHits = 0;
    for (let i = 0; i < 1000; i++) {
      const pick = pickNextCode(state, subset)!;
      if (pick.id === '10-0') lowScoreHits++;
      else if (pick.id === '10-1') highScoreHits++;
    }
    // weight(-3)=7, weight(+2)=2. Low-score should win clearly.
    expect(lowScoreHits).toBeGreaterThan(highScoreHits * 2);
  });

  it('never picks a code at +3', () => {
    const state: SelectionState = {
      progress: Object.fromEntries(
        CODES.filter((c) => c.importance === 'mandatory').map((c, i) =>
          i === 0 ? [c.id, { score: 3, lastAskedAtTurn: -10 }] : [c.id, { score: 0, lastAskedAtTurn: -10 }],
        ),
      ),
      turn: 100,
      filter: allMandatory,
    };
    const blocked = CODES.find((c) => c.importance === 'mandatory')!.id;
    for (let i = 0; i < 200; i++) {
      expect(pickNextCode(state, CODES)?.id).not.toBe(blocked);
    }
  });
});

describe('isComplete', () => {
  it('returns false when there are eligible codes', () => {
    expect(isComplete(emptyState(), CODES)).toBe(false);
  });

  it('returns true when all eligible codes reached +3', () => {
    const progress: Record<string, { score: number; lastAskedAtTurn: number }> = {};
    for (const c of CODES) {
      if (c.importance === 'mandatory') progress[c.id] = { score: 3, lastAskedAtTurn: 0 };
    }
    const state: SelectionState = { progress, turn: 100, filter: allMandatory };
    expect(isComplete(state, CODES)).toBe(true);
  });
});
