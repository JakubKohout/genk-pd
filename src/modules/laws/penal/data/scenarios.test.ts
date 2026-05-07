import { describe, expect, it } from 'vitest';
import { PENAL_PARAGRAPHS } from './paragraphs';
import { PENAL_SCENARIOS } from './scenarios';

const paragraphById = new Map(PENAL_PARAGRAPHS.map((p) => [p.id, p]));

describe('PENAL_SCENARIOS data', () => {
  it('contains the expected number of scenarios', () => {
    expect(PENAL_SCENARIOS.length).toBe(28);
  });

  it('has unique scenario IDs', () => {
    const ids = PENAL_SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses canonical penal.scenario.<ref> IDs', () => {
    for (const s of PENAL_SCENARIOS) {
      expect(s.id).toBe(`penal.scenario.${s.ref}`);
    }
  });

  it('has unique refs (A1, A2, … E9)', () => {
    const refs = PENAL_SCENARIOS.map((s) => s.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it('uses ref pattern matching A-E + 1-9', () => {
    for (const s of PENAL_SCENARIOS) {
      expect(s.ref).toMatch(/^[A-E][1-9]$/);
    }
  });

  it('has non-empty prompt', () => {
    for (const s of PENAL_SCENARIOS) {
      expect(s.prompt.trim().length).toBeGreaterThan(0);
    }
  });

  it('expects 1–3 paragraphs per scenario', () => {
    for (const s of PENAL_SCENARIOS) {
      expect(s.expected.length, s.ref).toBeGreaterThanOrEqual(1);
      expect(s.expected.length, s.ref).toBeLessThanOrEqual(3);
    }
  });

  it('has every expected.paragraphId existing in PENAL_PARAGRAPHS', () => {
    for (const s of PENAL_SCENARIOS) {
      for (const e of s.expected) {
        expect(paragraphById.has(e.paragraphId), `${s.ref}: ${e.paragraphId}`).toBe(true);
      }
    }
  });

  it('has every expected.subId existing in paragraph.subs (if specified)', () => {
    for (const s of PENAL_SCENARIOS) {
      for (const e of s.expected) {
        if (!e.subId) continue;
        const p = paragraphById.get(e.paragraphId)!;
        const subIds = p.subs.map((sub) => sub.id);
        expect(subIds, `${s.ref}: ${e.paragraphId} has no sub ${e.subId}`).toContain(e.subId);
      }
    }
  });

  it('omits subId when paragraph has no subs', () => {
    for (const s of PENAL_SCENARIOS) {
      for (const e of s.expected) {
        const p = paragraphById.get(e.paragraphId)!;
        if (p.subs.length === 0) {
          expect(e.subId, `${s.ref}: ${e.paragraphId} has no subs but subId="${e.subId}" was given`).toBeUndefined();
        }
      }
    }
  });

  it('has unique expected entries within a single scenario (no duplicate paragraf+sub)', () => {
    for (const s of PENAL_SCENARIOS) {
      const keys = s.expected.map((e) => `${e.paragraphId}#${e.subId ?? '_'}`);
      expect(new Set(keys).size, s.ref).toBe(keys.length);
    }
  });
});
