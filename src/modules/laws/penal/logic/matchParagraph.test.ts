import { describe, expect, it } from 'vitest';
import { PENAL_PARAGRAPHS } from '../data/paragraphs';
import { matchParagraph } from './matchParagraph';

describe('matchParagraph (mode B)', () => {
  it('matches by exact title', () => {
    expect(matchParagraph('Krádež', PENAL_PARAGRAPHS)?.id).toBe('penal.25');
    expect(matchParagraph('Loupež', PENAL_PARAGRAPHS)?.id).toBe('penal.26');
  });

  it('matches by alias', () => {
    expect(matchParagraph('krast', PENAL_PARAGRAPHS)?.id).toBe('penal.25');
    expect(matchParagraph('únos', PENAL_PARAGRAPHS)?.id).toBe('penal.14');
    expect(matchParagraph('ujíždění', PENAL_PARAGRAPHS)?.id).toBe('penal.58');
  });

  it('is case-insensitive after normalize', () => {
    expect(matchParagraph('KRÁDEŽ', PENAL_PARAGRAPHS)?.id).toBe('penal.25');
    expect(matchParagraph('Loupež', PENAL_PARAGRAPHS)?.id).toBe('penal.26');
  });

  it('strips diakritika via normalize', () => {
    expect(matchParagraph('kradez', PENAL_PARAGRAPHS)?.id).toBe('penal.25');
    expect(matchParagraph('loupez', PENAL_PARAGRAPHS)?.id).toBe('penal.26');
    expect(matchParagraph('zhasrtvi', PENAL_PARAGRAPHS)).toBeNull(); // typo, no alias
  });

  it('collapses whitespace', () => {
    expect(matchParagraph('  Krádež  ', PENAL_PARAGRAPHS)?.id).toBe('penal.25');
    expect(matchParagraph('Krádež\t', PENAL_PARAGRAPHS)?.id).toBe('penal.25');
  });

  it('returns null on empty input', () => {
    expect(matchParagraph('', PENAL_PARAGRAPHS)).toBeNull();
    expect(matchParagraph('   ', PENAL_PARAGRAPHS)).toBeNull();
  });

  it('returns null for non-matching input', () => {
    expect(matchParagraph('blah blah', PENAL_PARAGRAPHS)).toBeNull();
    expect(matchParagraph('§25', PENAL_PARAGRAPHS)).toBeNull(); // numeric ID is mode A
  });

  it('matches §27 alias "krádež auta" while §25 still matches "krádež"', () => {
    expect(matchParagraph('krádež auta', PENAL_PARAGRAPHS)?.id).toBe('penal.27');
    expect(matchParagraph('krádež', PENAL_PARAGRAPHS)?.id).toBe('penal.25');
  });
});
