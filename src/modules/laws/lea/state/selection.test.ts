import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eligibleQuestions, isLeaComplete, pickNextQuestion } from './selection';
import { mulberry32, resetRng, setRng } from '@/shared/rng';
import type { Question } from '../data/types';

const Q: Question[] = [
  { id: 'a', prompt: 'A?', description: 'První', ref: '§a', items: [] },
  { id: 'b', prompt: 'B?', description: 'Druhý', ref: '§b', items: [] },
];

describe('eligibleQuestions', () => {
  it('keeps only questions with score < 3', () => {
    const state = {
      progress: { a: { score: 3, lastAskedAtTurn: 0 }, b: { score: 1, lastAskedAtTurn: 0 } },
      turn: 5,
    };
    expect(eligibleQuestions(state, Q).map((q) => q.id)).toEqual(['b']);
  });
});

describe('isLeaComplete', () => {
  it('is true when no questions remain', () => {
    const state = {
      progress: { a: { score: 3, lastAskedAtTurn: 0 }, b: { score: 3, lastAskedAtTurn: 0 } },
      turn: 0,
    };
    expect(isLeaComplete(state, Q)).toBe(true);
  });

  it('is false when at least one question is below 3', () => {
    const state = { progress: { a: { score: 2, lastAskedAtTurn: 0 } }, turn: 0 };
    expect(isLeaComplete(state, Q)).toBe(false);
  });
});

describe('pickNextQuestion', () => {
  beforeEach(() => setRng(mulberry32(1)));
  afterEach(() => resetRng());

  it('returns a question from the eligible pool', () => {
    const state = { progress: {}, turn: 0 };
    const next = pickNextQuestion(state, Q);
    expect(next).not.toBeNull();
    expect(['a', 'b']).toContain(next!.id);
  });

  it('returns null when all questions are mastered', () => {
    const state = {
      progress: { a: { score: 3, lastAskedAtTurn: 0 }, b: { score: 3, lastAskedAtTurn: 0 } },
      turn: 0,
    };
    expect(pickNextQuestion(state, Q)).toBeNull();
  });
});
