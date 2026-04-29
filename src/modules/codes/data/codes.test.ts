import { describe, expect, it } from 'vitest';
import { CODES, findCodeById, findCodeByNumber, IMPORTANCE_LABELS } from './codes';

describe('CODES dataset', () => {
  it('has all the canonical codes from docs/codes.md', () => {
    // 56 source rows - 2 (10-14 B and 10-99 B merged into A) = 54.
    expect(CODES.length).toBe(54);
  });

  it('has unique ids', () => {
    const ids = CODES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique numbers', () => {
    const numbers = CODES.map((c) => c.number);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('uses canonical id form "10-N"', () => {
    for (const c of CODES) {
      expect(c.id).toBe(`10-${c.number}`);
    }
  });

  it('unifies A/B variants into one record (10-14, 10-99)', () => {
    const c1014 = findCodeById('10-14');
    expect(c1014).toBeDefined();
    expect(c1014!.meaning).toMatch(/Distribuce/);
    expect(c1014!.meaning).toMatch(/pytláctví/);

    const c1099 = findCodeById('10-99');
    expect(c1099).toBeDefined();
    expect(c1099!.meaning).toMatch(/panic button/);
  });

  it('looks up codes by number', () => {
    expect(findCodeByNumber(44)?.meaning).toBe('Osoba zemřela');
    expect(findCodeByNumber(100)?.meaning).toBe('Officer down');
    expect(findCodeByNumber(999)).toBeUndefined();
  });

  it('exposes all importance labels', () => {
    expect(IMPORTANCE_LABELS.mandatory).toBe('Povinný');
    expect(IMPORTANCE_LABELS.rare).toBe('Zřídka');
    expect(IMPORTANCE_LABELS.unnecessary).toBe('Nepotřebný');
  });
});
