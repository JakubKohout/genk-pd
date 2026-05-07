import { describe, expect, it } from 'vitest';
import { PENAL_SCENARIOS } from './scenarios';
import { RECALL_PARAGRAPHS } from './recallPool';

describe('RECALL_PARAGRAPHS pool', () => {
  it('contains exactly the paragrafy referenced by some scenario', () => {
    const referenced = new Set<string>();
    for (const s of PENAL_SCENARIOS) {
      for (const e of s.expected) referenced.add(e.paragraphId);
    }
    expect(RECALL_PARAGRAPHS.length).toBe(referenced.size);
    for (const p of RECALL_PARAGRAPHS) {
      expect(referenced.has(p.id)).toBe(true);
    }
  });

  it('omits general-provision paragrafy (§1, §2, §3, §4, §5, §6) since none appear in scenarios', () => {
    const ids = new Set(RECALL_PARAGRAPHS.map((p) => p.id));
    expect(ids.has('penal.1')).toBe(false);
    expect(ids.has('penal.2')).toBe(false);
    expect(ids.has('penal.3')).toBe(false);
    expect(ids.has('penal.4')).toBe(false);
    expect(ids.has('penal.5')).toBe(false);
    expect(ids.has('penal.6')).toBe(false);
  });

  it('includes core paragrafy that scénky cover', () => {
    const ids = new Set(RECALL_PARAGRAPHS.map((p) => p.id));
    for (const expected of [
      'penal.7', 'penal.8', 'penal.11', 'penal.14', 'penal.25', 'penal.26',
      'penal.27', 'penal.29', 'penal.33', 'penal.37', 'penal.46', 'penal.47',
      'penal.51', 'penal.58', 'penal.59',
    ]) {
      expect(ids.has(expected), expected).toBe(true);
    }
  });
});
