import { describe, expect, it } from 'vitest';
import { PENAL_PARAGRAPHS } from '../data/paragraphs';
import { expectedEquals, matchScenarioAnswer } from './matchScenario';

describe('matchScenarioAnswer', () => {
  it('returns ExpectedAnswer for paragraf with sub', () => {
    expect(matchScenarioAnswer('25b', PENAL_PARAGRAPHS)).toEqual({
      paragraphId: 'penal.25',
      subId: 'b',
    });
  });

  it('accepts §-prefixed input', () => {
    expect(matchScenarioAnswer('§25b', PENAL_PARAGRAPHS)).toEqual({
      paragraphId: 'penal.25',
      subId: 'b',
    });
    expect(matchScenarioAnswer('§ 25 b', PENAL_PARAGRAPHS)).toEqual({
      paragraphId: 'penal.25',
      subId: 'b',
    });
  });

  it('accepts uppercase sub', () => {
    expect(matchScenarioAnswer('25B', PENAL_PARAGRAPHS)).toEqual({
      paragraphId: 'penal.25',
      subId: 'b',
    });
  });

  it('returns ExpectedAnswer without sub for paragraf with no subs', () => {
    expect(matchScenarioAnswer('27', PENAL_PARAGRAPHS)).toEqual({
      paragraphId: 'penal.27',
    });
    expect(matchScenarioAnswer('§33', PENAL_PARAGRAPHS)).toEqual({
      paragraphId: 'penal.33',
    });
  });

  it('returns null when paragraf has subs but sub is missing', () => {
    // §25 has subs a-d, '25' alone is incomplete
    expect(matchScenarioAnswer('25', PENAL_PARAGRAPHS)).toBeNull();
    expect(matchScenarioAnswer('§37', PENAL_PARAGRAPHS)).toBeNull();
  });

  it('returns null when paragraf has no subs but sub is given', () => {
    // §27 has no subs
    expect(matchScenarioAnswer('27a', PENAL_PARAGRAPHS)).toBeNull();
    expect(matchScenarioAnswer('§33b', PENAL_PARAGRAPHS)).toBeNull();
  });

  it('returns null for non-existent paragraf', () => {
    expect(matchScenarioAnswer('999', PENAL_PARAGRAPHS)).toBeNull();
    expect(matchScenarioAnswer('§99', PENAL_PARAGRAPHS)).toBeNull();
  });

  it('returns null when sub is invalid for the paragraf', () => {
    // §25 has subs a, b, c, d — but no e
    expect(matchScenarioAnswer('25e', PENAL_PARAGRAPHS)).toBeNull();
  });

  it('returns null for empty / unparseable input', () => {
    expect(matchScenarioAnswer('', PENAL_PARAGRAPHS)).toBeNull();
    expect(matchScenarioAnswer('krádež', PENAL_PARAGRAPHS)).toBeNull();
  });
});

describe('expectedEquals', () => {
  it('matches same paragraf and sub', () => {
    expect(expectedEquals(
      { paragraphId: 'penal.25', subId: 'b' },
      { paragraphId: 'penal.25', subId: 'b' },
    )).toBe(true);
  });

  it('differentiates by sub', () => {
    expect(expectedEquals(
      { paragraphId: 'penal.25', subId: 'a' },
      { paragraphId: 'penal.25', subId: 'b' },
    )).toBe(false);
  });

  it('differentiates by paragraf', () => {
    expect(expectedEquals(
      { paragraphId: 'penal.25' },
      { paragraphId: 'penal.27' },
    )).toBe(false);
  });

  it('matches no-sub on both sides', () => {
    expect(expectedEquals(
      { paragraphId: 'penal.27' },
      { paragraphId: 'penal.27' },
    )).toBe(true);
  });

  it('treats undefined sub as different from defined sub', () => {
    expect(expectedEquals(
      { paragraphId: 'penal.25', subId: 'b' },
      { paragraphId: 'penal.25' },
    )).toBe(false);
  });
});
