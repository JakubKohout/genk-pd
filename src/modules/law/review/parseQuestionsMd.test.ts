import { describe, expect, it } from 'vitest';
import { parseQuestionsMd } from './parseQuestionsMd';
import { serializeQuestions } from './serializeQuestions';
import type { LawQuestion } from '../data/types';

const CHOICE: LawQuestion = {
  id: 'sasp.choice.vybava.1', theme: 'vybava', title: 'T',
  kind: 'choice', prompt: 'P?',
  options: ['a', 'b', 'c', 'd', 'e'], correctIndices: [0],
};
const validMd = () => serializeQuestions([CHOICE]);

describe('parseQuestionsMd — chybové stavy', () => {
  it('SMAZAT vyřadí otázku a vrátí její id', () => {
    const md = validMd().replace('**Zadání:**', 'SMAZAT\n**Zadání:**');
    const parsed = parseQuestionsMd(md);
    expect(parsed.questions).toHaveLength(0);
    expect(parsed.deletedIds).toEqual(['sasp.choice.vybava.1']);
  });
  it('hlásí nadpis bez ID v backticks s číslem řádku', () => {
    const md = validMd().replace(' `sasp.choice.vybava.1`', '');
    expect(() => parseQuestionsMd(md)).toThrow(/řádek \d+: nadpis otázky/);
  });
  it('hlásí duplicitní ID', () => {
    const md = validMd() + '\n' + validMd();
    expect(() => parseQuestionsMd(md)).toThrow(/duplicitní ID/);
  });
  it('hlásí neznámý typ', () => {
    const md = validMd().replace('type: choice', 'type: kviz');
    expect(() => parseQuestionsMd(md)).toThrow(/neznámý typ "kviz"/);
  });
  it('hlásí neznámé téma', () => {
    const md = validMd().replace('theme: vybava', 'theme: vybva');
    expect(() => parseQuestionsMd(md)).toThrow(/neznámé téma "vybva"/);
  });
  it('hlásí sentinel překlep (new místo NEW)', () => {
    const md = validMd().replace(/`sasp\.choice\.vybava\.1`/g, '`new`');
    expect(() => parseQuestionsMd(md)).toThrow(/překlep sentinelu NEW/);
  });
  it('hlásí rozbitý checkbox', () => {
    const md = validMd().replace('- [ ] b', '- [b');
    expect(() => parseQuestionsMd(md)).toThrow(/možnost musí začínat/);
  });
  it('hlásí méně než 5 možností', () => {
    const md = validMd().replace('- [ ] e\n', '');
    expect(() => parseQuestionsMd(md)).toThrow(/méně než 5 možností/);
  });
  it('hlásí žádnou správnou možnost', () => {
    const md = validMd().replace('- [x] a', '- [ ] a');
    expect(() => parseQuestionsMd(md)).toThrow(/žádná možnost není zaškrtnutá/);
  });
  it('hlásí titulek přes 40 znaků', () => {
    const md = validMd().replace('### T ', `### ${'x'.repeat(41)} `);
    expect(() => parseQuestionsMd(md)).toThrow(/titulek delší než 40/);
  });
  it('hlásí chybějící Zadání', () => {
    const md = validMd().replace(/\*\*Zadání:\*\* P\?\n/, '');
    expect(() => parseQuestionsMd(md)).toThrow(/chybí "\*\*Zadání:\*\*"/);
  });
  it('agreguje víc chyb najednou', () => {
    // dvě různé otázky, každá s jinou chybou — obě hlášky musí být v jednom throw
    const a = validMd().replace('- [x] a', '- [ ] a');
    const b = validMd()
      .replace(/vybava\.1/g, 'vybava.2')
      .replace('type: choice', 'type: kviz');
    expect(() => parseQuestionsMd(a + '\n' + b)).toThrow(/zaškrtnutá[\s\S]*neznámý typ|neznámý typ[\s\S]*zaškrtnutá/);
  });
  it('hlásí nerozpoznaný řádek (překlep v poli)', () => {
    const md = validMd().replace('**Zadání:**', '*Zadání:**');
    expect(() => parseQuestionsMd(md)).toThrow(/nerozpoznaný řádek/);
  });
  it('hlásí nerozpoznaný řádek (překlep v checkboxu bez pomlčky-mezery)', () => {
    const md = validMd().replace('- [ ] c', '-[ ] c');
    expect(() => parseQuestionsMd(md)).toThrow(/nerozpoznaný řádek|možnost musí začínat/);
  });
  it('toleruje CRLF konce řádků', () => {
    const md = validMd().replace(/\n/g, '\r\n');
    const parsed = parseQuestionsMd(md);
    expect(parsed.questions).toHaveLength(1);
  });
});

describe('parseQuestionsMd — nové otázky (NEW)', () => {
  const NEW_SECTION = [
    '### Nová otázka `NEW`',
    '- type: choice | theme: vybava',
    '**Zadání:** Testovací?',
    '**Možnosti:** (zaškrtnuté = správné)',
    '- [x] a',
    '- [ ] b',
    '- [ ] c',
    '- [ ] d',
    '- [ ] e',
  ].join('\n');

  it('NEW section gets generated id q1 when no q-ids exist', () => {
    const parsed = parseQuestionsMd(validMd() + '\n' + NEW_SECTION + '\n');
    expect(parsed.questions.map((q) => q.id)).toContain('q1');
    const nq = parsed.questions.find((q) => q.id === 'q1')!;
    expect(nq.title).toBe('Nová otázka');
    expect(nq.theme).toBe('vybava');
  });

  it('two NEW sections get sequential ids; existing q-ids raise the counter', () => {
    const base = validMd().replace(/sasp\.choice\.vybava\.1/g, 'q7');
    const second = NEW_SECTION.replace('Nová otázka', 'Druhá nová');
    const parsed = parseQuestionsMd(base + '\n' + NEW_SECTION + '\n' + second + '\n');
    const ids = parsed.questions.map((q) => q.id);
    expect(ids).toContain('q8');
    expect(ids).toContain('q9');
  });

  it('NEW enumeration-alias item without key gets a slug key', () => {
    const md = validMd() + '\n' + [
      '### Výčtová nová `NEW`',
      '- type: enumeration-alias | theme: vybava',
      '**Zadání:** Vyjmenuj.',
      '**Položky:**',
      '1. **Služební pouta**',
    ].join('\n') + '\n';
    const parsed = parseQuestionsMd(md);
    const nq = parsed.questions.find((q) => q.title === 'Výčtová nová')!;
    expect(nq.kind).toBe('enumeration');
    expect((nq as { expected: { key: string }[] }).expected[0]!.key).toBe('sluzebni-pouta');
  });

  it('NEW enumeration-paragraph item without key is an error', () => {
    const md = validMd() + '\n' + [
      '### Scénková nová `NEW`',
      '- type: enumeration-paragraph | theme: scenky',
      '**Zadání:** Které paragrafy?',
      '**Položky:**',
      '1. **§25 b**',
    ].join('\n') + '\n';
    expect(() => parseQuestionsMd(md)).toThrow(/key/);
  });

  it('NEW sekce s jinou chybou hlásí titulek, ne placeholder', () => {
    const md = validMd() + '\n' + [
      '### Rozbitá nová `NEW`',
      '- type: choice | theme: vybava',
      '**Zadání:** Testovací?',
      '**Možnosti:** (zaškrtnuté = správné)',
      '- [x] a',
      '- [ ] b',
    ].join('\n') + '\n';
    expect(() => parseQuestionsMd(md)).toThrow(/Rozbitá nová.*méně než 5|méně než 5.*Rozbitá nová/s);
  });

  it('SMAZAT in a NEW section just drops it (no deletedIds entry)', () => {
    const md = validMd() + '\n' + NEW_SECTION + '\nSMAZAT\n';
    const parsed = parseQuestionsMd(md);
    expect(parsed.questions).toHaveLength(1);
    expect(parsed.deletedIds).toEqual([]);
  });
});
