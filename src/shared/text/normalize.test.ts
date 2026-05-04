import { describe, it, expect } from 'vitest';
import { normalize } from './normalize';

describe('normalize', () => {
  it('lowercases input', () => {
    expect(normalize('Maják')).toBe('majak');
  });

  it('strips Czech diacritics', () => {
    expect(normalize('výstražné světlo')).toBe('vystrazne svetlo');
    expect(normalize('říčka')).toBe('ricka');
    expect(normalize('Žlutý')).toBe('zluty');
  });

  it('collapses internal whitespace and trims', () => {
    expect(normalize('  výstražné   světlo  ')).toBe('vystrazne svetlo');
    expect(normalize('a\tb\n c')).toBe('a b c');
  });

  it('returns empty string for empty/whitespace input', () => {
    expect(normalize('')).toBe('');
    expect(normalize('   ')).toBe('');
  });

  it('preserves digits and punctuation that are not combining marks', () => {
    expect(normalize('§16 B 3b')).toBe('§16 b 3b');
  });
});
