import { describe, expect, it } from 'vitest';
import { LAW_QUESTIONS } from './index';
import { SASP_LAW_QUESTIONS } from './sasp';
import { adaptLeaQuestions } from './adaptLea';
import { adaptPenalScenarios } from './adaptPenal';
import { LAW_SOURCES, LAW_THEMES } from './types';

describe('LAW_QUESTIONS', () => {
  it('merges all three sources', () => {
    const expected =
      SASP_LAW_QUESTIONS.length + adaptLeaQuestions().length + adaptPenalScenarios().length;
    expect(LAW_QUESTIONS).toHaveLength(expected);
  });
  it('has unique IDs across sources', () => {
    const ids = LAW_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('every question has a valid source and theme', () => {
    for (const q of LAW_QUESTIONS) {
      expect(LAW_SOURCES).toContain(q.source);
      expect(LAW_THEMES).toContain(q.theme);
    }
  });
  it.todo('every choice has >=5 options (enforced in phase 2)');
});
