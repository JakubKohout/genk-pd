import { describe, expect, it } from 'vitest';
import { eligibleQuestions, isLawComplete, pickNextQuestion } from './selection';
import type { LawQuestion } from '../data/types';

const POOL: LawQuestion[] = [
  { id: 'a', source: 'lea', theme: 'paragrafy', prompt: 'p', kind: 'text', answer: 'x', aliases: [] },
  { id: 'b', source: 'sasp', theme: 'rto', prompt: 'p', kind: 'text', answer: 'y', aliases: [] },
];
const allTrueSource = { lea: true, penal: true, sasp: true };
const allTrueTheme = {
  pojmy: true, hodnosti: true, jednani: true, rto: true, vybava: true,
  zasah: true, zadrzeni: true, kriminalistika: true, paragrafy: true,
};

describe('law selection', () => {
  it('excludes questions whose source filter is off', () => {
    const e = eligibleQuestions({ progress: {}, turn: 0 }, POOL, { ...allTrueSource, sasp: false }, allTrueTheme);
    expect(e.map((q) => q.id)).toEqual(['a']);
  });
  it('excludes questions whose theme filter is off', () => {
    const e = eligibleQuestions({ progress: {}, turn: 0 }, POOL, allTrueSource, { ...allTrueTheme, rto: false });
    expect(e.map((q) => q.id)).toEqual(['a']);
  });
  it('excludes mastered (score >= 2)', () => {
    const e = eligibleQuestions({ progress: { a: { score: 2, lastAskedAtTurn: 0 } }, turn: 1 }, POOL, allTrueSource, allTrueTheme);
    expect(e.map((q) => q.id)).toEqual(['b']);
  });
  it('isLawComplete true when nothing eligible', () => {
    expect(isLawComplete({ progress: { a: { score: 2, lastAskedAtTurn: 0 }, b: { score: 2, lastAskedAtTurn: 0 } }, turn: 2 }, POOL, allTrueSource, allTrueTheme)).toBe(true);
  });
  it('pickNextQuestion returns an eligible question', () => {
    const picked = pickNextQuestion({ progress: {}, turn: 0 }, POOL, allTrueSource, allTrueTheme);
    expect(picked).not.toBeNull();
  });
});
