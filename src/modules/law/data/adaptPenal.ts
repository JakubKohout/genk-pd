import { PENAL_SCENARIOS } from '@/modules/laws/penal/data/scenarios';
import type { PenalScenario } from '@/modules/laws/penal/data/types';
import type { LawQuestion } from './types';

const SCENARIO_PROMPT = 'Které paragrafy se na situaci vztahují?';

function adaptOne(s: PenalScenario): LawQuestion {
  return {
    id: s.id,
    source: 'penal',
    theme: 'paragrafy',
    prompt: SCENARIO_PROMPT,
    ref: s.ref,
    note: s.educationalNote,
    scenario: s.prompt,
    kind: 'enumeration',
    matcher: 'paragraph',
    expected: s.expected.map((e) => {
      const num = e.paragraphId.replace('penal.', '');
      return {
        key: num + (e.subId ?? ''),
        label: `§${num}${e.subId ? ` ${e.subId}` : ''}`,
        subId: e.subId,
      };
    }),
  };
}

export function adaptPenalScenarios(): LawQuestion[] {
  return PENAL_SCENARIOS.map(adaptOne);
}
