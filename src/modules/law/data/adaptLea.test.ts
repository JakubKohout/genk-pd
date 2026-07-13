import { describe, expect, it } from 'vitest';
import { LEA_QUESTIONS } from '@/modules/laws/lea/data/questions';
import { adaptLeaQuestions } from './adaptLea';

describe('adaptLea', () => {
  const adapted = adaptLeaQuestions();

  it('adapts every LEA question to enumeration', () => {
    expect(adapted).toHaveLength(LEA_QUESTIONS.length);
    for (const q of adapted) {
      expect(q.source).toBe('lea');
      expect(q.kind).toBe('enumeration');
      if (q.kind === 'enumeration') expect(q.matcher).toBe('alias');
    }
  });
  it('maps items to expected with id/quote/aliases', () => {
    const first = adapted[0];
    const src = LEA_QUESTIONS[0];
    if (first.kind === 'enumeration') {
      expect(first.expected).toHaveLength(src.items.length);
      expect(first.expected[0].key).toBe(src.items[0].id);
      expect(first.expected[0].label).toBe(src.items[0].quote);
    }
  });
});
