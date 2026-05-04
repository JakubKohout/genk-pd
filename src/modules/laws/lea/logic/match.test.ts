import { describe, expect, it } from 'vitest';
import { matchAnswer } from './match';
import type { AnswerItem } from '../data/types';

const items: AnswerItem[] = [
  {
    id: 'a',
    quote: 'výstražným zvukovým a rozhlasovým zařízením s výrazným světlem modré či červené barvy',
    aliases: ['maják', 'majákem', 'výstražné světlo', 'modré světlo'],
    ref: '§16 B 3b',
  },
  {
    id: 'b',
    quote: 'gestem',
    aliases: ['gesto', 'rukou'],
    ref: '§16 B 5b',
  },
];

describe('matchAnswer', () => {
  it('matches via exact alias (canonical)', () => {
    expect(matchAnswer('maják', items)?.id).toBe('a');
  });

  it('matches case-insensitively', () => {
    expect(matchAnswer('MAJÁK', items)?.id).toBe('a');
  });

  it('matches without diacritics', () => {
    expect(matchAnswer('majakem', items)?.id).toBe('a');
    expect(matchAnswer('vystrazne svetlo', items)?.id).toBe('a');
  });

  it('matches the full quote', () => {
    expect(matchAnswer('gestem', items)?.id).toBe('b');
  });

  it('tolerates extra whitespace', () => {
    expect(matchAnswer('  výstražné   světlo  ', items)?.id).toBe('a');
  });

  it('returns null for empty input', () => {
    expect(matchAnswer('', items)).toBeNull();
    expect(matchAnswer('   ', items)).toBeNull();
  });

  it('returns null when nothing matches', () => {
    expect(matchAnswer('blbost', items)).toBeNull();
  });

  it('does not match a substring (only full normalized equality)', () => {
    expect(matchAnswer('výstražné', items)).toBeNull();
  });
});
