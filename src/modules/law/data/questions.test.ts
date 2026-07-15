import { describe, expect, it } from 'vitest';
import { LAW_QUESTIONS } from './questions';
import { LAW_THEMES } from './types';
import { normalize } from '@/shared/text/normalize';
import { canonicalAnswerId } from '../logic/canonicalAnswerId';
import { keywordMatches } from '../logic/matchEnumeration';
import { PENAL_PARAGRAPHS } from './paragraphs';

describe('LAW_QUESTIONS dataset', () => {
  it('has expected counts', () => {
    expect(LAW_QUESTIONS).toHaveLength(136);
  });

  it('has unique IDs', () => {
    const ids = LAW_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every question has a valid theme', () => {
    for (const q of LAW_QUESTIONS) {
      expect(LAW_THEMES, q.id).toContain(q.theme);
    }
  });

  it('every question has a non-empty title of at most 40 chars', () => {
    for (const q of LAW_QUESTIONS) {
      expect(q.title, q.id).toBeTruthy();
      expect((q.title ?? '').trim().length, q.id).toBeGreaterThan(0);
      expect((q.title ?? '').length, q.id).toBeLessThanOrEqual(40);
    }
  });

  describe('choice', () => {
    it('has at least 5 options and valid, unique correct indices', () => {
      for (const q of LAW_QUESTIONS) {
        if (q.kind !== 'choice') continue;
        expect(q.options.length, q.id).toBeGreaterThanOrEqual(5);
        expect(q.correctIndices.length, q.id).toBeGreaterThanOrEqual(1);
        expect(new Set(q.correctIndices).size, q.id).toBe(q.correctIndices.length);
        for (const i of q.correctIndices) {
          expect(i, q.id).toBeGreaterThanOrEqual(0);
          expect(i, q.id).toBeLessThan(q.options.length);
        }
      }
    });
  });

  describe('text', () => {
    it('aliases are unique and do not collide with the answer after normalize', () => {
      for (const q of LAW_QUESTIONS) {
        if (q.kind !== 'text') continue;
        const canonical = normalize(q.answer);
        const normalized = q.aliases.map((a) => normalize(a));
        for (const a of normalized) expect(a, q.id).not.toBe(canonical);
        expect(new Set(normalized).size, q.id).toBe(q.aliases.length);
      }
    });
  });

  describe('enumeration', () => {
    it('has at least one expected item and a valid matcher', () => {
      for (const q of LAW_QUESTIONS) {
        if (q.kind !== 'enumeration') continue;
        expect(q.expected.length, q.id).toBeGreaterThan(0);
        expect(['alias', 'paragraph'], q.id).toContain(q.matcher);
      }
    });

    it('keywords have tokens of at least 3 chars after normalize', () => {
      for (const q of LAW_QUESTIONS) {
        if (q.kind !== 'enumeration') continue;
        for (const e of q.expected) {
          for (const kw of e.keywords ?? []) {
            for (const token of normalize(kw).split(' ').filter(Boolean)) {
              expect(token.length, `${q.id}/${e.key}: keyword "${kw}"`).toBeGreaterThanOrEqual(3);
            }
          }
        }
      }
    });

    it('keywords do not collide with other items in the same question', () => {
      for (const q of LAW_QUESTIONS) {
        if (q.kind !== 'enumeration' || q.matcher !== 'alias') continue;
        for (const a of q.expected) {
          for (const kw of a.keywords ?? []) {
            for (const b of q.expected) {
              if (b.key === a.key) continue;
              const targets = [b.label, ...(b.aliases ?? []), ...(b.keywords ?? [])];
              for (const t of targets) {
                expect(
                  keywordMatches(normalize(t), kw),
                  `${q.id}: keyword "${kw}" (${a.key}) matchuje "${t}" (${b.key})`,
                ).toBe(false);
              }
            }
          }
        }
      }
    });

    it('paragraph-matcher keys are canonical and resolve to existing paragraphs/subs', () => {
      const byId = new Map(PENAL_PARAGRAPHS.map((p) => [p.id, p]));
      for (const q of LAW_QUESTIONS) {
        if (q.kind !== 'enumeration' || q.matcher !== 'paragraph') continue;
        for (const e of q.expected) {
          const cid = canonicalAnswerId(e.key);
          expect(cid, `${q.id}: ${e.key}`).toBe(e.key);
          const m = /^(\d+)([a-e]?)$/.exec(e.key)!;
          const para = byId.get(`penal.${m[1]}`);
          expect(para, `${q.id}: penal.${m[1]}`).toBeTruthy();
          if (m[2]) {
            expect(
              para!.subs.some((s) => s.id === m[2]),
              `${q.id}: §${m[1]} sub ${m[2]}`,
            ).toBe(true);
          }
        }
      }
    });
  });

  describe('match', () => {
    it('has at least 3 pairs with non-empty sides and unique lefts', () => {
      for (const q of LAW_QUESTIONS) {
        if (q.kind !== 'match') continue;
        expect(q.pairs.length, q.id).toBeGreaterThanOrEqual(3);
        for (const p of q.pairs) {
          expect(p.left.trim(), q.id).not.toBe('');
          expect(p.right.trim(), q.id).not.toBe('');
        }
        expect(new Set(q.pairs.map((p) => p.left)).size, q.id).toBe(q.pairs.length);
      }
    });
  });
});
