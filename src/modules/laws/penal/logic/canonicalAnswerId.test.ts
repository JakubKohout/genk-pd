import { describe, expect, it } from 'vitest';
import { canonicalAnswerId } from './canonicalAnswerId';

describe('canonicalAnswerId', () => {
  it('returns canonical form for plain ID', () => {
    expect(canonicalAnswerId('25b')).toBe('25b');
    expect(canonicalAnswerId('25')).toBe('25');
    expect(canonicalAnswerId('102')).toBe('102');
  });

  it('strips § prefix', () => {
    expect(canonicalAnswerId('§25b')).toBe('25b');
    expect(canonicalAnswerId('§27')).toBe('27');
  });

  it('collapses whitespace', () => {
    expect(canonicalAnswerId('25 b')).toBe('25b');
    expect(canonicalAnswerId('§25 b')).toBe('25b');
    expect(canonicalAnswerId('§ 25 b')).toBe('25b');
    expect(canonicalAnswerId('  25b  ')).toBe('25b');
  });

  it('lowercases sub paragraf letter', () => {
    expect(canonicalAnswerId('25B')).toBe('25b');
    expect(canonicalAnswerId('§37C')).toBe('37c');
  });

  it('returns null for empty input', () => {
    expect(canonicalAnswerId('')).toBeNull();
    expect(canonicalAnswerId('   ')).toBeNull();
    expect(canonicalAnswerId('§')).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(canonicalAnswerId('abc')).toBeNull();
    expect(canonicalAnswerId('krádež')).toBeNull();
    expect(canonicalAnswerId('§abc')).toBeNull();
  });

  it('returns null when sub paragraf is out of a-e range', () => {
    expect(canonicalAnswerId('25z')).toBeNull();
    expect(canonicalAnswerId('25f')).toBeNull();
  });

  it('returns null for malformed multi-segment input', () => {
    expect(canonicalAnswerId('25b25')).toBeNull();
    expect(canonicalAnswerId('25 b c')).toBeNull();
    expect(canonicalAnswerId('a25')).toBeNull();
  });
});
