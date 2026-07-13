import { describe, expect, it } from 'vitest';
import { parseQuestionsMd } from './parseQuestionsMd';
import { serializeQuestions } from './serializeQuestions';
import type { LawQuestion } from '../data/types';

const CHOICE: LawQuestion = {
  id: 'sasp.choice.vybava.1', source: 'sasp', theme: 'vybava', title: 'T',
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
  it('hlásí neznámý prefix ID', () => {
    const md = validMd().replace(/sasp\.choice\.vybava\.1/g, 'foo.choice.1');
    expect(() => parseQuestionsMd(md)).toThrow(/neznámý prefix/);
  });
  it('hlásí duplicitní ID', () => {
    const md = validMd() + '\n' + validMd();
    expect(() => parseQuestionsMd(md)).toThrow(/duplicitní ID/);
  });
  it('hlásí neznámý typ', () => {
    const md = validMd().replace('typ: výběr', 'typ: kviz');
    expect(() => parseQuestionsMd(md)).toThrow(/neznámý typ "kviz"/);
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
      .replace('typ: výběr', 'typ: kviz');
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
