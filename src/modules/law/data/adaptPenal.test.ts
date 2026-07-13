import { describe, expect, it } from 'vitest';
import { PENAL_SCENARIOS } from '@/modules/laws/penal/data/scenarios';
import { adaptPenalScenarios } from './adaptPenal';

describe('adaptPenal', () => {
  const adapted = adaptPenalScenarios();

  it('adapts every scenario to paragraph enumeration', () => {
    expect(adapted).toHaveLength(PENAL_SCENARIOS.length);
    for (const q of adapted) {
      expect(q.source).toBe('penal');
      expect(q.kind).toBe('enumeration');
      if (q.kind === 'enumeration') expect(q.matcher).toBe('paragraph');
    }
  });
  it('moves the scene text into scenario and uses a generic prompt', () => {
    const first = adapted[0];
    expect(first.scenario).toBe(PENAL_SCENARIOS[0].prompt);
    expect(first.prompt).toMatch(/paragrafy/i);
  });
  it('builds canonical expected keys (numeric, no penal. prefix) from paragraphId + subId', () => {
    const withSub = PENAL_SCENARIOS.find((s) => s.expected.some((e) => e.subId));
    expect(withSub).toBeDefined();
    const adaptedWithSub = adapted.find((q) => q.id === withSub!.id);
    const exp = withSub!.expected.find((e) => e.subId)!;
    const num = exp.paragraphId.replace('penal.', '');
    if (adaptedWithSub?.kind === 'enumeration') {
      expect(adaptedWithSub.expected.map((e) => e.key)).toContain(num + exp.subId);
    }
  });

  it('labels use §<num> format (no penal. prefix)', () => {
    const q = adapted[0];
    if (q.kind === 'enumeration') {
      for (const e of q.expected) {
        expect(e.label).toMatch(/^§\d+/);
        expect(e.label).not.toContain('penal.');
        expect(e.key).not.toContain('penal.');
      }
    }
  });

  it('propagates scenario title to adapted question', () => {
    const q = adapted.find((x) => x.id === 'penal.scenario.A1');
    expect(q).toBeDefined();
    expect(q!.title).toBe('Loupež v obchodě s nožem');
  });
});
