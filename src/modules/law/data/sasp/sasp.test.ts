import { describe, expect, it } from 'vitest';
import { normalize } from '@/shared/text/normalize';
import { SASP_LAW_QUESTIONS } from './index';
import { LAW_THEMES } from '../types';

describe('SASP native content (structure)', () => {
  it('all source sasp + valid theme + sasp. id prefix', () => {
    for (const q of SASP_LAW_QUESTIONS) {
      expect(q.source).toBe('sasp');
      expect(LAW_THEMES).toContain(q.theme);
      expect(q.id.startsWith('sasp.')).toBe(true);
    }
  });
  it('unique ids', () => {
    const ids = SASP_LAW_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('choice: >=5 options, >=1 correct, correctIndices in range, distinct options', () => {
    for (const q of SASP_LAW_QUESTIONS) {
      if (q.kind !== 'choice') continue;
      expect(q.options.length).toBeGreaterThanOrEqual(5);
      expect(q.correctIndices.length).toBeGreaterThanOrEqual(1);
      for (const ci of q.correctIndices) {
        expect(ci).toBeGreaterThanOrEqual(0);
        expect(ci).toBeLessThan(q.options.length);
      }
      const norm = q.options.map(normalize);
      expect(new Set(norm).size).toBe(norm.length);
    }
  });
  it('text: aliases do not collide with answer after normalize', () => {
    for (const q of SASP_LAW_QUESTIONS) {
      if (q.kind !== 'text') continue;
      const a = normalize(q.answer);
      for (const al of q.aliases) expect(normalize(al)).not.toBe(a);
    }
  });
  it('match: >=2 pairs, unique left labels and unique right values', () => {
    for (const q of SASP_LAW_QUESTIONS) {
      if (q.kind !== 'match') continue;
      expect(q.pairs.length).toBeGreaterThanOrEqual(2);
      const lefts = q.pairs.map((p) => p.left);
      const rights = q.pairs.map((p) => p.right);
      expect(new Set(lefts).size).toBe(lefts.length);
      expect(new Set(rights).size).toBe(rights.length);
    }
  });
  it('enumeration: non-empty expected, valid matcher', () => {
    for (const q of SASP_LAW_QUESTIONS) {
      if (q.kind !== 'enumeration') continue;
      expect(q.expected.length).toBeGreaterThanOrEqual(2);
      expect(['alias', 'paragraph']).toContain(q.matcher);
    }
  });
  it('every question has a non-empty title (<= 40 chars)', () => {
    for (const q of SASP_LAW_QUESTIONS) {
      expect(q.title, q.id).toBeTruthy();
      expect((q.title ?? '').trim().length, q.id).toBeGreaterThan(0);
      expect((q.title ?? '').length, q.id).toBeLessThanOrEqual(40);
    }
  });
});
