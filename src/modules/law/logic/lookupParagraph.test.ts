import { describe, expect, it } from 'vitest';
import { lookupParagraph } from './lookupParagraph';
import { PENAL_PARAGRAPHS } from '../data/paragraphs';

describe('lookupParagraph', () => {
  it('resolves a valid paragraph with sub to display with title', () => {
    expect(lookupParagraph('26a', PENAL_PARAGRAPHS)).toEqual({
      kind: 'valid',
      display: '§26 a — Loupež',
    });
  });

  it('resolves a valid paragraph without sub', () => {
    expect(lookupParagraph('§9', PENAL_PARAGRAPHS)).toEqual({
      kind: 'valid',
      display: '§9 — Mučení a jiné nelidské a kruté zacházení',
    });
  });

  it('reports a parseable but non-existent paragraph number as unknown', () => {
    expect(lookupParagraph('99', PENAL_PARAGRAPHS)).toEqual({ kind: 'unknown' });
  });

  it('reports a valid paragraph with non-existent sub as unknown', () => {
    // §9 has no subs
    expect(lookupParagraph('9b', PENAL_PARAGRAPHS)).toEqual({ kind: 'unknown' });
  });

  it('reports unparseable input as unparseable', () => {
    expect(lookupParagraph('loupež někde', PENAL_PARAGRAPHS)).toEqual({ kind: 'unparseable' });
  });
});
