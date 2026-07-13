import { describe, expect, it } from 'vitest';
import { eligibleQuestions, isLawComplete, pickNextQuestion } from './selection';
import type { LawQuestion } from '../data/types';

const POOL: LawQuestion[] = [
  { id: 'a', theme: 'paragrafy', prompt: 'p', kind: 'text', answer: 'x', aliases: [] },
  { id: 'b', theme: 'rto', prompt: 'p', kind: 'text', answer: 'y', aliases: [] },
];
const allTrueTheme = {
  pojmy: true, hodnosti: true, jednani: true, rto: true, vybava: true,
  zasah: true, zadrzeni: true, kriminalistika: true, paragrafy: true, scenky: true,
};

describe('law selection', () => {
  it('excludes questions whose theme filter is off', () => {
    const e = eligibleQuestions({ progress: {}, turn: 0 }, POOL, { ...allTrueTheme, rto: false });
    expect(e.map((q) => q.id)).toEqual(['a']);
  });
  it('excludes mastered (score >= 2)', () => {
    const e = eligibleQuestions({ progress: { a: { score: 2, lastAskedAtTurn: 0 } }, turn: 1 }, POOL, allTrueTheme);
    expect(e.map((q) => q.id)).toEqual(['b']);
  });
  it('isLawComplete true when nothing eligible', () => {
    expect(isLawComplete({ progress: { a: { score: 2, lastAskedAtTurn: 0 }, b: { score: 2, lastAskedAtTurn: 0 } }, turn: 2 }, POOL, allTrueTheme)).toBe(true);
  });
  it('pickNextQuestion returns an eligible question', () => {
    const picked = pickNextQuestion({ progress: {}, turn: 0 }, POOL, allTrueTheme);
    expect(picked).not.toBeNull();
  });
});
