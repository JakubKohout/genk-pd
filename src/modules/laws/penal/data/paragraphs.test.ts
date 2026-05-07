import { describe, expect, it } from 'vitest';
import { normalize } from '@/shared/text/normalize';
import { PENAL_PARAGRAPHS } from './paragraphs';

describe('PENAL_PARAGRAPHS data', () => {
  it('contains the expected number of paragraphs', () => {
    expect(PENAL_PARAGRAPHS.length).toBe(75);
  });

  it('has unique paragraph IDs', () => {
    const ids = PENAL_PARAGRAPHS.map((p) => p.id);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
  });

  it('uses canonical penal.<num> IDs', () => {
    for (const p of PENAL_PARAGRAPHS) {
      expect(p.id).toMatch(/^penal\.\d+$/);
    }
  });

  it('has §-prefixed numbers matching IDs', () => {
    for (const p of PENAL_PARAGRAPHS) {
      const num = p.id.replace('penal.', '');
      expect(p.number).toBe(`§${num}`);
    }
  });

  it('has non-empty title and description for every paragraph', () => {
    for (const p of PENAL_PARAGRAPHS) {
      expect(p.title.trim().length).toBeGreaterThan(0);
      expect(p.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('has at least one alias per paragraph', () => {
    for (const p of PENAL_PARAGRAPHS) {
      expect(p.aliases.length).toBeGreaterThan(0);
    }
  });

  it('has unique sub-paragraph IDs within each paragraph', () => {
    for (const p of PENAL_PARAGRAPHS) {
      const subIds = p.subs.map((s) => s.id);
      const set = new Set(subIds);
      expect(set.size, `paragraph ${p.number}`).toBe(subIds.length);
    }
  });

  it('uses single-letter sub IDs (a/b/c/d/e)', () => {
    for (const p of PENAL_PARAGRAPHS) {
      for (const s of p.subs) {
        expect(s.id, `paragraph ${p.number} sub ${s.id}`).toMatch(/^[a-e]$/);
      }
    }
  });

  it('has non-colliding aliases across paragraphs (mode B match would be ambiguous otherwise)', () => {
    const seen = new Map<string, string>();
    for (const p of PENAL_PARAGRAPHS) {
      const candidates = [p.title, ...p.aliases];
      for (const c of candidates) {
        const norm = normalize(c);
        const prior = seen.get(norm);
        if (prior && prior !== p.id) {
          throw new Error(
            `alias collision: "${c}" (normalized "${norm}") matches both ${prior} and ${p.id}`,
          );
        }
        seen.set(norm, p.id);
      }
    }
  });

  it('has all 11 categories represented', () => {
    const categories = new Set(PENAL_PARAGRAPHS.map((p) => p.category));
    expect(categories).toEqual(
      new Set([
        'obecna',
        'zivot-zdravi',
        'svoboda',
        'sexualni',
        'majetek',
        'doprava',
        'verejna-bezpecnost',
        'spravedlnost',
        'environmental',
        'morni',
        'ostatni',
      ]),
    );
  });
});
