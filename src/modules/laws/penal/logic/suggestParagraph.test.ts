import { describe, expect, it } from 'vitest';
import { PENAL_PARAGRAPHS } from '../data/paragraphs';
import { SUGGEST_MAX_RESULTS, suggestParagraphs } from './suggestParagraph';

const NONE = new Set<string>();

describe('suggestParagraphs (mode A autocomplete)', () => {
  it('returns empty for empty input', () => {
    expect(suggestParagraphs('', PENAL_PARAGRAPHS, NONE)).toEqual([]);
    expect(suggestParagraphs('   ', PENAL_PARAGRAPHS, NONE)).toEqual([]);
  });

  it('expands a numeric ID to all sub-paragraphs', () => {
    // §25 has subs a/b/c/d
    const result = suggestParagraphs('25', PENAL_PARAGRAPHS, NONE);
    const ids = result.map((s) => s.canonicalId);
    expect(ids).toContain('25a');
    expect(ids).toContain('25b');
    expect(ids).toContain('25c');
    expect(ids).toContain('25d');
  });

  it('returns single suggestion for paragraf with no subs', () => {
    // §27 has no subs
    const result = suggestParagraphs('27', PENAL_PARAGRAPHS, NONE);
    expect(result.length).toBe(1);
    expect(result[0].canonicalId).toBe('27');
    expect(result[0].subId).toBeUndefined();
  });

  it('exact-sub query returns just that suggestion', () => {
    const result = suggestParagraphs('25b', PENAL_PARAGRAPHS, NONE);
    expect(result.length).toBe(1);
    expect(result[0].canonicalId).toBe('25b');
    expect(result[0].title).toBe('Krádež');
  });

  it('sets human-readable display field with § prefix', () => {
    const result = suggestParagraphs('25b', PENAL_PARAGRAPHS, NONE);
    expect(result[0].display).toBe('§25b');
  });

  it('sets paragraph description for paragrafs without sub, sub description otherwise', () => {
    const noSub = suggestParagraphs('27', PENAL_PARAGRAPHS, NONE);
    expect(noSub[0].description).toContain('Vloupání');

    const withSub = suggestParagraphs('25b', PENAL_PARAGRAPHS, NONE);
    expect(withSub[0].description).toContain('20 001');
  });

  it('matches by name substring after normalize', () => {
    // 'krad' → §25 Krádež + §27 (alias 'krádež auta')
    const result = suggestParagraphs('krad', PENAL_PARAGRAPHS, NONE);
    const paragraphIds = new Set(result.map((s) => s.paragraphId));
    expect(paragraphIds).toContain('penal.25');
    expect(paragraphIds).toContain('penal.27');
  });

  it('matches case- and diakritika-insensitively', () => {
    expect(suggestParagraphs('KRÁDEŽ', PENAL_PARAGRAPHS, NONE).map((s) => s.paragraphId)).toContain(
      'penal.25',
    );
    expect(suggestParagraphs('kradez', PENAL_PARAGRAPHS, NONE).map((s) => s.paragraphId)).toContain(
      'penal.25',
    );
  });

  it('respects excludeKeys to hide already-committed answers', () => {
    const exclude = new Set(['25a', '25b']);
    const result = suggestParagraphs('25', PENAL_PARAGRAPHS, exclude);
    const ids = result.map((s) => s.canonicalId);
    expect(ids).not.toContain('25a');
    expect(ids).not.toContain('25b');
    expect(ids).toContain('25c');
    expect(ids).toContain('25d');
  });

  it('limits results to SUGGEST_MAX_RESULTS', () => {
    // 'r' should match many paragrafy via aliases starting with 'r'
    const result = suggestParagraphs('r', PENAL_PARAGRAPHS, NONE);
    expect(result.length).toBeLessThanOrEqual(SUGGEST_MAX_RESULTS);
  });

  it('numeric prefix prefers exact-length match', () => {
    // '2' would match §2, §20-29, §200+ — §2 should rank first
    const result = suggestParagraphs('2', PENAL_PARAGRAPHS, NONE);
    expect(result[0].paragraphId).toBe('penal.2');
  });

  it('returns empty for unknown numeric ID', () => {
    expect(suggestParagraphs('999', PENAL_PARAGRAPHS, NONE)).toEqual([]);
  });
});
