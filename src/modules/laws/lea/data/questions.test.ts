import { describe, expect, it } from 'vitest';
import { LEA_QUESTIONS } from './questions';
import { normalize } from '@/shared/text/normalize';

describe('LEA_QUESTIONS', () => {
  it('contains 17 questions and 95 answer items in total', () => {
    expect(LEA_QUESTIONS).toHaveLength(17);
    const totalItems = LEA_QUESTIONS.reduce((sum, q) => sum + q.items.length, 0);
    expect(totalItems).toBe(95);
  });

  it('has unique question IDs', () => {
    const ids = LEA_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique item IDs (across all questions)', () => {
    const ids = LEA_QUESTIONS.flatMap((q) => q.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a non-empty description for every question', () => {
    for (const q of LEA_QUESTIONS) {
      expect(q.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('has non-empty quote and ref for every item', () => {
    for (const q of LEA_QUESTIONS) {
      for (const item of q.items) {
        expect(item.quote.trim().length).toBeGreaterThan(0);
        expect(item.ref.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('aliases are unique within an item (after normalize)', () => {
    for (const q of LEA_QUESTIONS) {
      for (const item of q.items) {
        const norms = item.aliases.map(normalize);
        expect(new Set(norms).size).toBe(norms.length);
      }
    }
  });

  it('aliases do not collide between items inside one question (would cause ambiguous match)', () => {
    for (const q of LEA_QUESTIONS) {
      const seen = new Map<string, string>();
      for (const item of q.items) {
        for (const alias of [item.quote, ...item.aliases]) {
          const norm = normalize(alias);
          const owner = seen.get(norm);
          if (owner && owner !== item.id) {
            throw new Error(
              `Alias collision in ${q.id}: "${alias}" maps to both ${owner} and ${item.id}`,
            );
          }
          seen.set(norm, item.id);
        }
      }
    }
  });
});
