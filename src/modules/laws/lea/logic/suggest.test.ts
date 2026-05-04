import { describe, expect, it } from 'vitest';
import { AUTOCOMPLETE_MIN_LENGTH, suggestItems } from './suggest';
import type { AnswerItem } from '../data/types';

const items: AnswerItem[] = [
  { id: 'a', quote: 'výstražné světlo modré či červené barvy', aliases: ['maják'], ref: '§x A' },
  { id: 'b', quote: 'gestem', aliases: ['gesto'], ref: '§x B' },
  { id: 'c', quote: 'varovným výstřelem', aliases: ['varovný výstřel'], ref: '§x C' },
];

describe('suggestItems', () => {
  it('returns nothing below the minimum length', () => {
    expect(AUTOCOMPLETE_MIN_LENGTH).toBe(4);
    expect(suggestItems('maj', items, new Set())).toEqual([]);
  });

  it('matches by alias substring (after normalize)', () => {
    expect(suggestItems('majak', items, new Set()).map((i) => i.id)).toEqual(['a']);
  });

  it('matches by quote substring (after normalize)', () => {
    expect(suggestItems('vystrazne', items, new Set()).map((i) => i.id)).toEqual(['a']);
  });

  it('excludes items in the foundIds set', () => {
    expect(suggestItems('vystrazne', items, new Set(['a']))).toEqual([]);
  });

  it('returns an empty list when no candidate matches', () => {
    expect(suggestItems('nikdy', items, new Set())).toEqual([]);
  });

  it('caps results at 5', () => {
    const many: AnswerItem[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      quote: 'maják číslo ' + i,
      aliases: [],
      ref: '§x',
    }));
    expect(suggestItems('majak', many, new Set())).toHaveLength(5);
  });

  it('sorts earlier matches before later matches', () => {
    const sorted: AnswerItem[] = [
      { id: 'late', quote: 'něco a pak maják', aliases: [], ref: '§x' },
      { id: 'early', quote: 'maják na začátku', aliases: [], ref: '§x' },
    ];
    expect(suggestItems('majak', sorted, new Set()).map((i) => i.id)).toEqual(['early', 'late']);
  });
});
