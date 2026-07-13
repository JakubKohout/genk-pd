import { describe, expect, it } from 'vitest';
import { serializeQuestions } from './serializeQuestions';
import type { LawQuestion } from '../data/types';

const FIXTURE: LawQuestion[] = [
  {
    id: 'sasp.choice.vybava.1', theme: 'vybava',
    title: 'Taser dosah', kind: 'choice',
    prompt: 'Jaký je dosah?', scenario: 'Na místě zásahu.',
    options: ['10 m', '5 m', '15 m', '20 m', '8 m'],
    correctIndices: [0, 2],
    note: 'Dosah je 10 m.',
  },
  {
    id: 'sasp.text.zasah.felony-code', theme: 'zasah',
    title: 'Kód felony stopu', kind: 'text',
    prompt: 'Jaký kód?', answer: 'Code 5', aliases: ['kód 5', 'pětka'],
  },
  {
    id: 'lea.7', theme: 'paragrafy', title: 'Prokázání',
    kind: 'enumeration', matcher: 'alias', ref: '§7 A',
    prompt: 'Vyjmenuj.',
    expected: [
      { key: 'lea.7.A.1a', label: 'stejnokrojem', aliases: ['uniforma'], keywords: ['stejnokroj'] },
      { key: 'lea.7.A.2a', label: 'odznakem' },
    ],
  },
  {
    id: 'penal.scenario.A1', theme: 'scenky', title: 'Loupež',
    kind: 'enumeration', matcher: 'paragraph', ordered: true,
    prompt: 'Které paragrafy?',
    expected: [{ key: '26a', label: '§26 a', subId: 'a' }],
  },
  {
    id: 'sasp.match.rto.channels', theme: 'rto', title: 'Kanály',
    kind: 'match', prompt: 'Spáruj.',
    leftLabel: 'Kanál', rightLabel: 'Účel',
    pairs: [
      { left: 'F1', right: 'hlavní' },
      { left: 'F6', right: 'SWAT' },
      { left: 'F8', right: 'DBI' },
    ],
  },
];

describe('serializeQuestions', () => {
  const md = serializeQuestions(FIXTURE);

  it('emits heading with title and backticked id', () => {
    expect(md).toContain('### Taser dosah `sasp.choice.vybava.1`');
  });
  it('emits meta line with kind, theme, ref and ordered flag', () => {
    expect(md).toContain('- type: choice | theme: vybava');
    expect(md).toContain('- type: enumeration-alias | theme: paragrafy | ref: §7 A');
    expect(md).toContain('- type: enumeration-paragraph | theme: scenky | ordered: true');
  });
  it('emits checkboxes reflecting correctIndices', () => {
    expect(md).toContain('- [x] 10 m');
    expect(md).toContain('- [ ] 5 m');
    expect(md).toContain('- [x] 15 m');
  });
  it('emits scenario, note, answer and aliases lines', () => {
    expect(md).toContain('**Scénka:** Na místě zásahu.');
    expect(md).toContain('**Vysvětlivka:** Dosah je 10 m.');
    expect(md).toContain('**Odpověď:** Code 5');
    expect(md).toContain('**Aliasy:** kód 5; pětka');
  });
  it('emits enumeration items with aliases/keywords/key/sub sublines', () => {
    expect(md).toContain('1. **stejnokrojem**');
    expect(md).toContain('   - aliases: uniforma');
    expect(md).toContain('   - keywords: stejnokroj');
    expect(md).toContain('   - key: lea.7.A.1a');
    expect(md).toContain('   - sub: a');
  });
  it('omits aliases/keywords sublines when absent', () => {
    const item = md.slice(md.indexOf('2. **odznakem**'), md.indexOf('### Loupež'));
    expect(item).not.toContain('- aliases:');
    expect(item).not.toContain('- keywords:');
  });
  it('emits match table with labels as header', () => {
    expect(md).toContain('| Kanál | Účel |');
    expect(md).toContain('| F1 | hlavní |');
  });
  it('groups questions under theme headings', () => {
    expect(md).toContain('## vybava');
    expect(md).toContain('## paragrafy');
  });
  it('throws on pipe in match pair text', () => {
    const bad = [{ ...FIXTURE[4], pairs: [{ left: 'a|b', right: 'x' }, { left: 'c', right: 'y' }, { left: 'd', right: 'z' }] }] as LawQuestion[];
    expect(() => serializeQuestions(bad)).toThrow(/\|/);
  });
  it('throws on missing title', () => {
    const bad = [{ ...FIXTURE[0], title: undefined }] as LawQuestion[];
    expect(() => serializeQuestions(bad)).toThrow(/title/);
  });
  it('throws on backtick in title', () => {
    const bad = [{ ...FIXTURE[0], title: 'Znak `x`' }] as LawQuestion[];
    expect(() => serializeQuestions(bad)).toThrow(/backtick/);
  });
  it('throws on newline in an enumeration label', () => {
    const bad = [{
      ...FIXTURE[2],
      expected: [{ key: 'k1', label: 'první\nřádek' }],
    }] as LawQuestion[];
    expect(() => serializeQuestions(bad)).toThrow(/nový řádek/);
  });
  it('throws on newline in a match pair cell', () => {
    const bad = [{
      ...FIXTURE[4],
      pairs: [{ left: 'a\nb', right: 'x' }, { left: 'c', right: 'y' }, { left: 'd', right: 'z' }],
    }] as LawQuestion[];
    expect(() => serializeQuestions(bad)).toThrow(/nový řádek/);
  });
  it('throws on semicolon in an alias', () => {
    const bad = [{ ...FIXTURE[1], aliases: ['obsahuje; strednik'] }] as LawQuestion[];
    expect(() => serializeQuestions(bad)).toThrow(/střednÍk|strednik|;/i);
  });
  it('throws on pipe in ref', () => {
    const bad = [{ ...FIXTURE[2], ref: '§7 | A' }] as LawQuestion[];
    expect(() => serializeQuestions(bad)).toThrow(/\|/);
  });
  it('legend explains fields including type codes and keywords semantics', () => {
    expect(md).toContain('enumeration-alias');
    expect(md).toContain('keywords');
    expect(md).toContain('NEW');
  });
});
