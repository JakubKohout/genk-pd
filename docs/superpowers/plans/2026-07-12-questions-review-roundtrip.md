# Questions Review Round-trip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Markdown export/import datasetu `LAW_QUESTIONS`, aby méně technický recenzent mohl otázky projít, upravit a promazat, a změny se strojově propsaly zpět do TS.

**Architecture:** Čisté funkce v `src/modules/law/review/` (serialize → md, parse → dataset, format → TS soubor), tenké CLI wrappery ve `scripts/` spouštěné přes `tsx`. Zdroj pravdy zůstává `questions.ts`; markdown je přechodný artefakt (gitignored). Bezztrátovost garantuje round-trip test nad celým reálným datasetem. Spec: `docs/superpowers/specs/2026-07-12-questions-review-roundtrip-design.md`.

**Tech Stack:** TypeScript 5.6, Vitest 2, tsx (nová devDep), node:fs.

## Global Constraints

- Zdroj pravdy zůstává `src/modules/law/data/questions.ts`; `docs/questions-review.md` jde do `.gitignore`.
- Review modul (`src/modules/law/review/`) i scripts používají VÝHRADNĚ relativní importy — žádný alias `@/` (tsx alias nezná; review kód žádné `@/` importy nepotřebuje).
- Přidávání nových otázek přes markdown NENÍ v rozsahu — parser nezná ID → chyba není potřeba řešit speciálně, prostě neexistuje cesta jak přidat (parser bere ID z nadpisu; nová sekce s vymyšleným ID projde parserem, ale věcné invarianty chytí `questions.test.ts` — to je přijatelné).
- Chybové hlášky parseru česky, s číslem řádku: `řádek N: <popis>`.
- Import přegeneruje: `questions.ts` (celý), `e2e/fixtures/seed.ts` (tři ID pole + count komentáře — Gotcha 43 strojově), `src/modules/law/data/questions.test.ts` (4 čísla counts).
- Žádné emoji. Komentáře jen kde „proč" není zřejmé. TDD.
- Oddělovač víceprvkových hodnot v md je `; `.
- `npm test` po importu je součást workflow (skript ho připomene, nespouští).

## Markdown grammar (závazná pro serialize i parse)

```markdown
# Přehled otázek — Teorie (/law)
> ...legenda...

## <SOURCE_LABEL> — <téma>

### <title> `<id>`
- typ: <výběr|text|výčet (aliasy)|výčet (paragrafy)|přiřazování> | téma: <theme> [| ref: <ref>] [| pořadí závazné: ano]
**Zadání:** <prompt>
[**Scénka:** <scenario>]
<kind-specifické tělo>
[**Vysvětlivka:** <note>]
```

Kind-specifická těla:

```markdown
# choice
**Možnosti:** (zaškrtnuté = správné)
- [x] <option>
- [ ] <option>

# text
**Odpověď:** <answer>
**Aliasy:** <a>; <b>; <c>          (řádek vždy přítomen, i prázdný)

# enumeration
**Položky:**
1. **<label>**
   - aliasy: <a>; <b>              (jen pokud aliases neprázdné)
   - keywords: <k1>; <k2>          (jen pokud keywords neprázdné)
   - klíč: <key>                   (vždy)
   - sub: <subId>                  (jen pokud subId)

# match
**Páry:**

| <leftLabel> | <rightLabel> |
| --- | --- |
| <left> | <right> |
```

Smazání: samostatný řádek `SMAZAT` (po trim) kdekoli v sekci otázky. Všechna pole datasetu jsou jednořádkové stringy (TS literály bez `\n`) — každé md pole je jeden řádek.

---

### Task 1: serializeQuestions (dataset → markdown)

**Files:**
- Create: `src/modules/law/review/serializeQuestions.ts`
- Test: `src/modules/law/review/serializeQuestions.test.ts`

**Interfaces:**
- Consumes: `LawQuestion` union z `../data/types` (relativní import).
- Produces: `serializeQuestions(questions: readonly LawQuestion[]): string` — kompletní md dle grammar výše; hází `Error` při neserializovatelném vstupu (chybějící `title`, backtick v title, `|` nebo newline v match textech, newline v kterémkoli poli).

- [ ] **Step 1: Failing test**

```ts
// src/modules/law/review/serializeQuestions.test.ts
import { describe, expect, it } from 'vitest';
import { serializeQuestions } from './serializeQuestions';
import type { LawQuestion } from '../data/types';

const FIXTURE: LawQuestion[] = [
  {
    id: 'sasp.choice.vybava.1', source: 'sasp', theme: 'vybava',
    title: 'Taser dosah', kind: 'choice',
    prompt: 'Jaký je dosah?', scenario: 'Na místě zásahu.',
    options: ['10 m', '5 m', '15 m', '20 m', '8 m'],
    correctIndices: [0, 2],
    note: 'Dosah je 10 m.',
  },
  {
    id: 'sasp.text.zasah.felony-code', source: 'sasp', theme: 'zasah',
    title: 'Kód felony stopu', kind: 'text',
    prompt: 'Jaký kód?', answer: 'Code 5', aliases: ['kód 5', 'pětka'],
  },
  {
    id: 'lea.7', source: 'lea', theme: 'paragrafy', title: 'Prokázání',
    kind: 'enumeration', matcher: 'alias', ref: '§7 A',
    prompt: 'Vyjmenuj.',
    expected: [
      { key: 'lea.7.A.1a', label: 'stejnokrojem', aliases: ['uniforma'], keywords: ['stejnokroj'] },
      { key: 'lea.7.A.2a', label: 'odznakem' },
    ],
  },
  {
    id: 'penal.scenario.A1', source: 'penal', theme: 'paragrafy', title: 'Loupež',
    kind: 'enumeration', matcher: 'paragraph', ordered: true,
    prompt: 'Které paragrafy?',
    expected: [{ key: '26a', label: '§26 a', subId: 'a' }],
  },
  {
    id: 'sasp.match.rto.channels', source: 'sasp', theme: 'rto', title: 'Kanály',
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
    expect(md).toContain('- typ: výběr | téma: vybava');
    expect(md).toContain('- typ: výčet (aliasy) | téma: paragrafy | ref: §7 A');
    expect(md).toContain('- typ: výčet (paragrafy) | téma: paragrafy | pořadí závazné: ano');
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
  it('emits enumeration items with aliasy/keywords/klíč/sub sublines', () => {
    expect(md).toContain('1. **stejnokrojem**');
    expect(md).toContain('   - aliasy: uniforma');
    expect(md).toContain('   - keywords: stejnokroj');
    expect(md).toContain('   - klíč: lea.7.A.1a');
    expect(md).toContain('   - sub: a');
  });
  it('omits aliasy/keywords sublines when absent', () => {
    const item = md.slice(md.indexOf('2. **odznakem**'), md.indexOf('### Loupež'));
    expect(item).not.toContain('- aliasy:');
    expect(item).not.toContain('- keywords:');
  });
  it('emits match table with labels as header', () => {
    expect(md).toContain('| Kanál | Účel |');
    expect(md).toContain('| F1 | hlavní |');
  });
  it('groups questions under source/theme headings', () => {
    expect(md).toContain('## SASP — vybava');
    expect(md).toContain('## LEA — paragrafy');
  });
  it('throws on pipe in match pair text', () => {
    const bad = [{ ...FIXTURE[4], pairs: [{ left: 'a|b', right: 'x' }, { left: 'c', right: 'y' }, { left: 'd', right: 'z' }] }] as LawQuestion[];
    expect(() => serializeQuestions(bad)).toThrow(/\|/);
  });
  it('throws on missing title', () => {
    const bad = [{ ...FIXTURE[0], title: undefined }] as LawQuestion[];
    expect(() => serializeQuestions(bad)).toThrow(/title/);
  });
});
```

- [ ] **Step 2: Ověřit fail**

Run: `npx vitest run src/modules/law/review/`
Expected: FAIL — modul neexistuje.

- [ ] **Step 3: Implementace**

```ts
// src/modules/law/review/serializeQuestions.ts
import type { LawEnumeration, LawQuestion } from '../data/types';

const SOURCE_LABEL: Record<LawQuestion['source'], string> = {
  lea: 'LEA',
  penal: 'Penal (scénky)',
  sasp: 'SASP',
};

const LEGEND = `# Přehled otázek — Teorie (/law)

> Návod pro recenzenta:
> - Texty (zadání, scénky, možnosti, vysvětlivky, položky) klidně přepisuj přímo v tomto souboru.
> - U možností značí [x] správnou odpověď, [ ] špatnou — zaškrtnutí můžeš měnit.
> - Celou otázku smažeš tak, že do její sekce napíšeš na samostatný řádek slovo SMAZAT.
> - Víc hodnot (aliasy, keywords) odděluj středníkem.
> - Řádky "- typ:" a "klíč:"/"sub:" jsou technické — needituj je bez domluvy.
> - Nové otázky tímto souborem přidat nejde, jen upravovat a mazat.
`;

function kindLabel(q: LawQuestion): string {
  if (q.kind === 'enumeration') {
    return q.matcher === 'paragraph' ? 'výčet (paragrafy)' : 'výčet (aliasy)';
  }
  return { choice: 'výběr', text: 'text', match: 'přiřazování' }[q.kind];
}

function assertLine(value: string, what: string, id: string): void {
  if (value.includes('\n')) throw new Error(`${id}: ${what} obsahuje nový řádek — neserializovatelné`);
}

function metaLine(q: LawQuestion): string {
  const parts = [`typ: ${kindLabel(q)}`, `téma: ${q.theme}`];
  if (q.ref) parts.push(`ref: ${q.ref}`);
  if (q.kind === 'enumeration' && (q as LawEnumeration).ordered) parts.push('pořadí závazné: ano');
  return `- ${parts.join(' | ')}`;
}

function body(q: LawQuestion): string[] {
  const lines: string[] = [];
  if (q.kind === 'choice') {
    lines.push('**Možnosti:** (zaškrtnuté = správné)');
    q.options.forEach((opt, i) => {
      assertLine(opt, 'možnost', q.id);
      lines.push(`- [${q.correctIndices.includes(i) ? 'x' : ' '}] ${opt}`);
    });
  } else if (q.kind === 'text') {
    lines.push(`**Odpověď:** ${q.answer}`);
    lines.push(`**Aliasy:** ${q.aliases.join('; ')}`);
  } else if (q.kind === 'enumeration') {
    lines.push('**Položky:**');
    q.expected.forEach((e, i) => {
      lines.push(`${i + 1}. **${e.label}**`);
      if (e.aliases?.length) lines.push(`   - aliasy: ${e.aliases.join('; ')}`);
      if (e.keywords?.length) lines.push(`   - keywords: ${e.keywords.join('; ')}`);
      lines.push(`   - klíč: ${e.key}`);
      if (e.subId) lines.push(`   - sub: ${e.subId}`);
    });
  } else {
    for (const cell of [q.leftLabel, q.rightLabel, ...q.pairs.flatMap((p) => [p.left, p.right])]) {
      if (cell.includes('|')) throw new Error(`${q.id}: text páru obsahuje "|" — neserializovatelné`);
    }
    lines.push('**Páry:**', '');
    lines.push(`| ${q.leftLabel} | ${q.rightLabel} |`);
    lines.push('| --- | --- |');
    q.pairs.forEach((p) => lines.push(`| ${p.left} | ${p.right} |`));
  }
  return lines;
}

export function serializeQuestions(questions: readonly LawQuestion[]): string {
  const out: string[] = [LEGEND];
  let group = '';
  for (const q of questions) {
    if (!q.title) throw new Error(`${q.id}: chybí title — neserializovatelné`);
    if (q.title.includes('`')) throw new Error(`${q.id}: title obsahuje backtick`);
    for (const [what, v] of [['prompt', q.prompt], ['title', q.title], ['scenario', q.scenario ?? ''], ['note', q.note ?? '']] as const) {
      assertLine(v, what, q.id);
    }
    const g = `## ${SOURCE_LABEL[q.source]} — ${q.theme}`;
    if (g !== group) {
      group = g;
      out.push(g, '');
    }
    out.push(`### ${q.title} \`${q.id}\``);
    out.push(metaLine(q));
    out.push(`**Zadání:** ${q.prompt}`);
    if (q.scenario) out.push(`**Scénka:** ${q.scenario}`);
    out.push(...body(q));
    if (q.note) out.push(`**Vysvětlivka:** ${q.note}`);
    out.push('');
  }
  return out.join('\n');
}
```

- [ ] **Step 4: Ověřit pass**

Run: `npx vitest run src/modules/law/review/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/law/review/serializeQuestions.ts src/modules/law/review/serializeQuestions.test.ts
git commit -m "feat(law): serializace otazek do review markdownu"
```

---

### Task 2: parseQuestionsMd — happy path + round-trip nad celým datasetem

**Files:**
- Create: `src/modules/law/review/parseQuestionsMd.ts`
- Test: `src/modules/law/review/roundtrip.test.ts`

**Interfaces:**
- Consumes: `serializeQuestions` (Task 1), `LAW_QUESTIONS` z `../data/questions`, typy z `../data/types`.
- Produces: `parseQuestionsMd(md: string): { questions: LawQuestion[]; deletedIds: string[] }` — inverze serializace; hází `Error` s hláškami `řádek N: …` (agregované přes `\n`). Task 3 rozšíří chybové stavy — struktura parseru s tím musí počítat (sběr chyb do pole).

- [ ] **Step 1: Failing round-trip test**

```ts
// src/modules/law/review/roundtrip.test.ts
import { describe, expect, it } from 'vitest';
import { LAW_QUESTIONS } from '../data/questions';
import { serializeQuestions } from './serializeQuestions';
import { parseQuestionsMd } from './parseQuestionsMd';
import type { LawQuestion } from '../data/types';

/** Prázdné volitelné arrays (aliases/keywords) srovná s "chybí" — sémanticky totéž. */
function strip(qs: readonly LawQuestion[]): unknown {
  return JSON.parse(
    JSON.stringify(qs, (key, value) =>
      (key === 'aliases' || key === 'keywords') && Array.isArray(value) && value.length === 0
        ? undefined
        : value,
    ),
  );
}

describe('review round-trip', () => {
  it('parse(serialize(LAW_QUESTIONS)) reproduces the whole dataset losslessly', () => {
    const { questions, deletedIds } = parseQuestionsMd(serializeQuestions(LAW_QUESTIONS));
    expect(deletedIds).toEqual([]);
    expect(questions).toHaveLength(LAW_QUESTIONS.length);
    expect(strip(questions)).toEqual(strip(LAW_QUESTIONS));
  });
});
```

Pozn.: text otázky mají `aliases` povinné — serializace emituje `**Aliasy:**` řádek vždy (i prázdný) a parser pro `kind: 'text'` vždy nastaví pole (prázdný string → `[]`), takže `strip` je potřeba jen pro `expected[].aliases/keywords`.

- [ ] **Step 2: Ověřit fail**

Run: `npx vitest run src/modules/law/review/roundtrip.test.ts`
Expected: FAIL — `parseQuestionsMd` neexistuje.

- [ ] **Step 3: Implementace**

```ts
// src/modules/law/review/parseQuestionsMd.ts
import type { LawExpected, LawQuestion, LawSource, LawTheme } from '../data/types';

export interface ParsedReview {
  questions: LawQuestion[];
  deletedIds: string[];
}

const KIND_BY_LABEL: Record<string, { kind: LawQuestion['kind']; matcher?: 'alias' | 'paragraph' }> = {
  'výběr': { kind: 'choice' },
  'text': { kind: 'text' },
  'výčet (aliasy)': { kind: 'enumeration', matcher: 'alias' },
  'výčet (paragrafy)': { kind: 'enumeration', matcher: 'paragraph' },
  'přiřazování': { kind: 'match' },
};

interface Section {
  headingLine: number;
  title: string;
  id: string;
  lines: { no: number; text: string }[];
}

function splitList(raw: string): string[] {
  return raw.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
}

function sourceFromId(id: string): LawSource | null {
  if (id.startsWith('lea.')) return 'lea';
  if (id.startsWith('penal.')) return 'penal';
  if (id.startsWith('sasp.')) return 'sasp';
  return null;
}

export function parseQuestionsMd(md: string): ParsedReview {
  const lines = md.split('\n');
  const errors: string[] = [];
  const err = (no: number, msg: string) => errors.push(`řádek ${no}: ${msg}`);

  // 1) rozřezat na sekce podle "### "
  const sections: Section[] = [];
  let current: Section | null = null;
  lines.forEach((text, idx) => {
    const no = idx + 1;
    if (text.startsWith('### ')) {
      const m = /^### (.+) `([a-z0-9.-]+)`\s*$/.exec(text);
      if (!m) {
        err(no, 'nadpis otázky musí končit ID v backticks: ### Titulek `id.otazky`');
        current = null;
        return;
      }
      current = { headingLine: no, title: m[1]!, id: m[2]!, lines: [] };
      sections.push(current);
      return;
    }
    if (text.startsWith('## ') || text.startsWith('# ')) {
      current = null;
      return;
    }
    if (current) current.lines.push({ no, text });
  });

  const questions: LawQuestion[] = [];
  const deletedIds: string[] = [];
  const seenIds = new Set<string>();

  for (const s of sections) {
    if (seenIds.has(s.id)) {
      err(s.headingLine, `duplicitní ID ${s.id}`);
      continue;
    }
    seenIds.add(s.id);

    if (s.lines.some((l) => l.text.trim() === 'SMAZAT')) {
      deletedIds.push(s.id);
      continue;
    }

    const source = sourceFromId(s.id);
    if (!source) {
      err(s.headingLine, `neznámý prefix ID ${s.id} (očekávám lea./penal./sasp.)`);
      continue;
    }
    if (s.title.length > 40) err(s.headingLine, `titulek delší než 40 znaků: "${s.title}"`);

    // 2) meta řádek
    const metaEntry = s.lines.find((l) => l.text.startsWith('- typ: '));
    if (!metaEntry) {
      err(s.headingLine, `otázce ${s.id} chybí řádek "- typ: …"`);
      continue;
    }
    const metaParts = metaEntry.text.slice(2).split(' | ').map((p) => p.trim());
    const meta = new Map<string, string>();
    for (const part of metaParts) {
      const ci = part.indexOf(': ');
      if (ci > 0) meta.set(part.slice(0, ci), part.slice(ci + 2));
    }
    const kindInfo = KIND_BY_LABEL[meta.get('typ') ?? ''];
    if (!kindInfo) {
      err(metaEntry.no, `neznámý typ "${meta.get('typ')}"`);
      continue;
    }
    const theme = meta.get('téma') as LawTheme | undefined;
    if (!theme) {
      err(metaEntry.no, 'chybí téma');
      continue;
    }
    const ref = meta.get('ref');
    const ordered = meta.get('pořadí závazné') === 'ano';

    // 3) jednořádková pole
    // prefix `**<label>:** ` má délku label.length + 6 (2+1+2+1 znaků navíc)
    const field = (label: string): string | undefined =>
      s.lines.find((l) => l.text.startsWith(`**${label}:** `))?.text.slice(label.length + 6);
    const prompt = field('Zadání');
    if (!prompt) {
      err(s.headingLine, `otázce ${s.id} chybí "**Zadání:**"`);
      continue;
    }
    const scenario = field('Scénka');
    const note = field('Vysvětlivka');

    const base = {
      id: s.id,
      source,
      theme,
      prompt,
      title: s.title,
      ...(ref ? { ref } : {}),
      ...(note ? { note } : {}),
      ...(scenario ? { scenario } : {}),
    };

    // 4) kind-specifické tělo
    if (kindInfo.kind === 'choice') {
      const options: string[] = [];
      const correctIndices: number[] = [];
      for (const l of s.lines) {
        const m = /^- \[( |x)\] (.*)$/.exec(l.text);
        if (m) {
          if (m[1] === 'x') correctIndices.push(options.length);
          options.push(m[2]!);
        } else if (/^- \[/.test(l.text)) {
          err(l.no, 'možnost musí začínat "- [x] " nebo "- [ ] "');
        }
      }
      if (options.length < 5) { err(s.headingLine, `${s.id}: méně než 5 možností`); continue; }
      if (correctIndices.length === 0) { err(s.headingLine, `${s.id}: žádná možnost není zaškrtnutá jako správná`); continue; }
      questions.push({ ...base, kind: 'choice', options, correctIndices });
    } else if (kindInfo.kind === 'text') {
      const answer = field('Odpověď');
      if (!answer) { err(s.headingLine, `${s.id}: chybí "**Odpověď:**"`); continue; }
      const aliases = splitList(field('Aliasy') ?? '');
      questions.push({ ...base, kind: 'text', answer, aliases });
    } else if (kindInfo.kind === 'enumeration') {
      const expected: LawExpected[] = [];
      let item: LawExpected | null = null;
      const flush = (no: number) => {
        if (!item) return;
        if (!item.key) { err(no, `${s.id}: položce "${item.label}" chybí "klíč:"`); return; }
        expected.push(item);
      };
      for (const l of s.lines) {
        const head = /^\d+\. \*\*(.*)\*\*$/.exec(l.text);
        if (head) {
          flush(l.no);
          item = { key: '', label: head[1]! };
          continue;
        }
        const sub = /^ {3}- (aliasy|keywords|klíč|sub): (.*)$/.exec(l.text);
        if (sub && item) {
          if (sub[1] === 'aliasy') item.aliases = splitList(sub[2]!);
          else if (sub[1] === 'keywords') item.keywords = splitList(sub[2]!);
          else if (sub[1] === 'klíč') item.key = sub[2]!.trim();
          else item.subId = sub[2]!.trim();
        }
      }
      flush(s.lines.at(-1)?.no ?? s.headingLine);
      if (expected.length === 0) { err(s.headingLine, `${s.id}: výčet bez položek`); continue; }
      questions.push({
        ...base,
        kind: 'enumeration',
        matcher: kindInfo.matcher!,
        ...(ordered ? { ordered: true } : {}),
        expected,
      });
    } else {
      const rows = s.lines.filter(
        (l) => /^\|.*\|$/.test(l.text.trim()) && !/^\|[\s|-]+\|$/.test(l.text.trim()),
      );
      if (rows.length < 4) { err(s.headingLine, `${s.id}: tabulka párů musí mít záhlaví a aspoň 3 páry`); continue; }
      const cells = rows.map((l) => l.text.trim().slice(1, -1).split('|').map((c) => c.trim()));
      const badRow = rows[cells.findIndex((c) => c.length !== 2)];
      if (badRow && cells.some((c) => c.length !== 2)) {
        err(badRow.no, `${s.id}: řádek tabulky nemá přesně 2 sloupce`);
        continue;
      }
      const [header, ...pairRows] = cells;
      questions.push({
        ...base,
        kind: 'match',
        leftLabel: header![0]!,
        rightLabel: header![1]!,
        pairs: pairRows.map((c) => ({ left: c[0]!, right: c[1]! })),
      });
    }
  }

  if (errors.length > 0) throw new Error(errors.join('\n'));
  return { questions, deletedIds };
}
```

- [ ] **Step 4: Ověřit pass (round-trip nad 137 otázkami)**

Run: `npx vitest run src/modules/law/review/`
Expected: PASS — round-trip test projde nad celým reálným datasetem. Pokud selže na konkrétní otázce, diff z `toEqual` ukáže která — opravit serializaci/parser, ne data.

- [ ] **Step 5: Commit**

```bash
git add src/modules/law/review/parseQuestionsMd.ts src/modules/law/review/roundtrip.test.ts
git commit -m "feat(law): parser review markdownu + round-trip test nad celym datasetem"
```

---

### Task 3: parseQuestionsMd — chybové stavy a SMAZAT

**Files:**
- Modify: `src/modules/law/review/parseQuestionsMd.ts` (jen pokud testy odhalí díru — struktura z Tasku 2 už chyby sbírá)
- Test: `src/modules/law/review/parseQuestionsMd.test.ts`

**Interfaces:**
- Consumes: `parseQuestionsMd`, `serializeQuestions` (pro výrobu validního md k mutování).

- [ ] **Step 1: Testy chybových stavů**

```ts
// src/modules/law/review/parseQuestionsMd.test.ts
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
});
```

- [ ] **Step 2: Spustit — očekávám převážně PASS (parser z Tasku 2 chyby už sbírá); opravit implementaci tam, kde test odhalí díru**

Run: `npx vitest run src/modules/law/review/parseQuestionsMd.test.ts`
Expected: PASS (po případných opravách).

Pozn. k testu „agreguje víc chyb": první replace mutuje jen první výskyt — první otázka přijde o správnou možnost, druhá o validní typ; throw message musí obsahovat obě hlášky oddělené `\n`.

- [ ] **Step 3: Celý review modul + commit**

Run: `npx vitest run src/modules/law/review/`
Expected: PASS.

```bash
git add src/modules/law/review/
git commit -m "test(law): chybove stavy parseru review markdownu"
```

---

### Task 4: formatQuestionsTs (dataset → obsah questions.ts)

**Files:**
- Create: `src/modules/law/review/formatQuestionsTs.ts`
- Test: `src/modules/law/review/formatQuestionsTs.test.ts`

**Interfaces:**
- Consumes: typy z `../data/types`.
- Produces: `formatQuestionsTs(questions: readonly LawQuestion[]): string` — kompletní obsah souboru `questions.ts` (header + import + literál), stabilní formát: 2 mezery odsazení, single quotes s escapováním `\` a `'`, jedna property na řádek, trailing commas, kanonické pořadí klíčů: `id, source, theme, title, kind, prompt, scenario, ref, note` + kind-specifické (`options, correctIndices` | `answer, aliases` | `matcher, ordered, expected` | `leftLabel, rightLabel, pairs`); u `expected` položek `key, label, subId, aliases, keywords`.

- [ ] **Step 1: Failing test**

```ts
// src/modules/law/review/formatQuestionsTs.test.ts
import { describe, expect, it } from 'vitest';
import { formatQuestionsTs } from './formatQuestionsTs';
import type { LawQuestion } from '../data/types';

const Q: LawQuestion[] = [
  {
    id: 'sasp.choice.rto.1', source: 'sasp', theme: 'rto', title: "Znak 'Henry'",
    kind: 'choice', prompt: 'Jaký znak?',
    options: ['Henry', 'Adam', 'Viktor', 'David', 'Charlie'], correctIndices: [0],
    note: 'Henry.',
  },
  {
    id: 'lea.7', source: 'lea', theme: 'paragrafy', title: 'Prokázání',
    kind: 'enumeration', matcher: 'alias', prompt: 'Vyjmenuj.',
    expected: [{ key: 'lea.7.A.1a', label: 'stejnokrojem', aliases: ['uniforma'], keywords: ['stejnokroj'] }],
  },
];

describe('formatQuestionsTs', () => {
  const ts = formatQuestionsTs(Q);

  it('emits file header, import and typed export', () => {
    expect(ts).toContain("import type { LawQuestion } from './types';");
    expect(ts).toContain('export const LAW_QUESTIONS: readonly LawQuestion[] = [');
    expect(ts.trimEnd().endsWith('];')).toBe(true);
  });
  it('escapes single quotes', () => {
    expect(ts).toContain("title: 'Znak \\'Henry\\'',");
  });
  it('emits arrays one item per line with trailing commas', () => {
    expect(ts).toContain("    options: [\n      'Henry',\n      'Adam',");
    expect(ts).toContain('    correctIndices: [\n      0,\n    ],');
  });
  it('emits expected items with canonical key order', () => {
    const item = ts.slice(ts.indexOf('expected: ['));
    expect(item.indexOf("key: 'lea.7.A.1a'")).toBeLessThan(item.indexOf("label: 'stejnokrojem'"));
    expect(item.indexOf('aliases: [')).toBeLessThan(item.indexOf('keywords: ['));
  });
  it('omits absent optional fields', () => {
    expect(ts).not.toContain('scenario:');
    expect(ts).not.toContain('ref:');
    expect(ts).not.toContain('subId:');
  });
});
```

- [ ] **Step 2: Ověřit fail**

Run: `npx vitest run src/modules/law/review/formatQuestionsTs.test.ts`
Expected: FAIL — modul neexistuje.

- [ ] **Step 3: Implementace**

```ts
// src/modules/law/review/formatQuestionsTs.ts
import type { LawExpected, LawQuestion } from '../data/types';

const HEADER = `import type { LawQuestion } from './types';

// Jediný zdroj pravdy pro Teorie kvíz. Strukturu validuje questions.test.ts.
// Soubor lze přegenerovat z review markdownu: npm run questions:import (viz CLAUDE.md).
export const LAW_QUESTIONS: readonly LawQuestion[] = [
`;

const S = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function strArray(indent: string, name: string, values: readonly string[]): string {
  const inner = values.map((v) => `${indent}  ${S(v)},`).join('\n');
  return `${indent}${name}: [\n${inner}\n${indent}],`;
}

function numArray(indent: string, name: string, values: readonly number[]): string {
  const inner = values.map((v) => `${indent}  ${v},`).join('\n');
  return `${indent}${name}: [\n${inner}\n${indent}],`;
}

function expectedItem(e: LawExpected): string {
  const l: string[] = ['      {'];
  l.push(`        key: ${S(e.key)},`);
  l.push(`        label: ${S(e.label)},`);
  if (e.subId) l.push(`        subId: ${S(e.subId)},`);
  if (e.aliases?.length) l.push(strArray('        ', 'aliases', e.aliases));
  if (e.keywords?.length) l.push(strArray('        ', 'keywords', e.keywords));
  l.push('      },');
  return l.join('\n');
}

function questionLiteral(q: LawQuestion): string {
  const l: string[] = ['  {'];
  l.push(`    id: ${S(q.id)},`);
  l.push(`    source: ${S(q.source)},`);
  l.push(`    theme: ${S(q.theme)},`);
  if (q.title) l.push(`    title: ${S(q.title)},`);
  l.push(`    kind: ${S(q.kind)},`);
  l.push(`    prompt: ${S(q.prompt)},`);
  if (q.scenario) l.push(`    scenario: ${S(q.scenario)},`);
  if (q.ref) l.push(`    ref: ${S(q.ref)},`);
  if (q.note) l.push(`    note: ${S(q.note)},`);
  if (q.kind === 'choice') {
    l.push(strArray('    ', 'options', q.options));
    l.push(numArray('    ', 'correctIndices', q.correctIndices));
  } else if (q.kind === 'text') {
    l.push(`    answer: ${S(q.answer)},`);
    l.push(strArray('    ', 'aliases', q.aliases));
  } else if (q.kind === 'enumeration') {
    l.push(`    matcher: ${S(q.matcher)},`);
    if (q.ordered) l.push('    ordered: true,');
    l.push('    expected: [');
    for (const e of q.expected) l.push(expectedItem(e));
    l.push('    ],');
  } else {
    l.push(`    leftLabel: ${S(q.leftLabel)},`);
    l.push(`    rightLabel: ${S(q.rightLabel)},`);
    l.push('    pairs: [');
    for (const p of q.pairs) {
      l.push(`      { left: ${S(p.left)}, right: ${S(p.right)} },`);
    }
    l.push('    ],');
  }
  l.push('  },');
  return l.join('\n');
}

export function formatQuestionsTs(questions: readonly LawQuestion[]): string {
  return HEADER + questions.map(questionLiteral).join('\n') + '\n];\n';
}
```

- [ ] **Step 4: Ověřit pass + syntaktická validita výstupu**

Run: `npx vitest run src/modules/law/review/formatQuestionsTs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/law/review/formatQuestionsTs.ts src/modules/law/review/formatQuestionsTs.test.ts
git commit -m "feat(law): generovani questions.ts literalu z datasetu"
```

---

### Task 5: CLI skripty, tsx, npm scripts, gitignore, end-to-end smoke + normalizace + dokumentace

**Files:**
- Create: `scripts/questions-export.ts`, `scripts/questions-import.ts`
- Modify: `package.json` (devDep `tsx`, scripts `questions:export` / `questions:import`), `.gitignore` (`docs/questions-review.md`), `CLAUDE.md`
- Regenerated by smoke run: `src/modules/law/data/questions.ts`, `e2e/fixtures/seed.ts`, `src/modules/law/data/questions.test.ts`

**Interfaces:**
- Consumes: `serializeQuestions`, `parseQuestionsMd`, `formatQuestionsTs`, `LAW_QUESTIONS` (relativní importy ze `../src/modules/law/...`).

- [ ] **Step 1: Instalace tsx + npm scripts**

```bash
npm install -D tsx
```

Do `package.json` sekce `"scripts"` přidat:

```json
"questions:export": "tsx scripts/questions-export.ts",
"questions:import": "tsx scripts/questions-import.ts"
```

- [ ] **Step 2: Export skript**

```ts
// scripts/questions-export.ts
import { writeFileSync } from 'node:fs';
import { LAW_QUESTIONS } from '../src/modules/law/data/questions';
import { serializeQuestions } from '../src/modules/law/review/serializeQuestions';

const OUT = 'docs/questions-review.md';
writeFileSync(OUT, serializeQuestions(LAW_QUESTIONS));
console.log(`Export hotov: ${OUT} (${LAW_QUESTIONS.length} otázek).`);
```

- [ ] **Step 3: Import skript**

```ts
// scripts/questions-import.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { parseQuestionsMd } from '../src/modules/law/review/parseQuestionsMd';
import { formatQuestionsTs } from '../src/modules/law/review/formatQuestionsTs';

const mdPath = process.argv[2] ?? 'docs/questions-review.md';
const { questions, deletedIds } = parseQuestionsMd(readFileSync(mdPath, 'utf8'));

writeFileSync('src/modules/law/data/questions.ts', formatQuestionsTs(questions));

const idsBySource = (src: string) => questions.filter((q) => q.source === src).map((q) => q.id);
const lea = idsBySource('lea');
const penal = idsBySource('penal');
const sasp = idsBySource('sasp');

const arrBody = (ids: string[]) => ids.map((i) => `  '${i}',`).join('\n');
const replaceArray = (src: string, name: string, ids: string[]): string => {
  const re = new RegExp(`(export const ${name} = \\[\\n)[\\s\\S]*?(\\n\\] as const;)`);
  if (!re.test(src)) throw new Error(`e2e/fixtures/seed.ts: nenašel jsem pole ${name}`);
  return src.replace(re, `$1${arrBody(ids)}$2`);
};

let seed = readFileSync('e2e/fixtures/seed.ts', 'utf8');
seed = replaceArray(seed, 'LEA_QUESTION_IDS', lea);
seed = replaceArray(seed, 'PENAL_SCENARIO_IDS', penal);
seed = replaceArray(seed, 'SASP_QUESTION_IDS', sasp);
seed = seed
  .replace(/\/\/ LEA \(\d+\)/, `// LEA (${lea.length})`)
  .replace(/\/\/ Penal scenarios \(\d+\)/, `// Penal scenarios (${penal.length})`)
  .replace(/\/\/ SASP \(\d+\)/, `// SASP (${sasp.length})`);
writeFileSync('e2e/fixtures/seed.ts', seed);

let test = readFileSync('src/modules/law/data/questions.test.ts', 'utf8');
const replaceCount = (src: string, re: RegExp, n: number): string => {
  if (!re.test(src)) throw new Error(`questions.test.ts: nenašel jsem count assert ${re}`);
  return src.replace(re, `$1${n}$2`);
};
test = replaceCount(test, /(bySource\('lea'\)\)\.toHaveLength\()\d+(\))/, lea.length);
test = replaceCount(test, /(bySource\('penal'\)\)\.toHaveLength\()\d+(\))/, penal.length);
test = replaceCount(test, /(bySource\('sasp'\)\)\.toHaveLength\()\d+(\))/, sasp.length);
test = replaceCount(test, /(expect\(LAW_QUESTIONS\)\.toHaveLength\()\d+(\))/, questions.length);
writeFileSync('src/modules/law/data/questions.test.ts', test);

console.log(`Import hotov: ${questions.length} otázek (${lea.length} LEA + ${penal.length} Penal + ${sasp.length} SASP).`);
if (deletedIds.length > 0) console.log(`Smazáno ${deletedIds.length}: ${deletedIds.join(', ')}`);
console.log('Zkontroluj git diff a spusť: npm test');
```

- [ ] **Step 4: .gitignore**

Do `.gitignore` přidat řádek:

```
docs/questions-review.md
```

- [ ] **Step 5: End-to-end smoke + jednorázová normalizace questions.ts**

```bash
npm run questions:export
npm run questions:import
npx vitest run src/modules/law/
npm test
```

Expected: export vypíše 137 otázek; import vypíše `137 otázek (17 LEA + 28 Penal + 92 SASP)`; VŠECHNY testy zelené. `git diff` ukáže velkou jednorázovou normalizaci `questions.ts` (kanonické pořadí klíčů) — `seed.ts` a `questions.test.ts` beze změny obsahu (stejná IDs, stejná čísla; případný re-order v seed polích je OK, protože pořadí = pořadí datasetu). Sémantickou shodu garantuje round-trip test + zelená `questions.test.ts` (kolize, prefixy, per-kind invarianty) + E2E:

```bash
npm run test:e2e -- e2e/law/
```

Expected: 25/25.

- [ ] **Step 6: CLAUDE.md**

1. Sekce `## Příkazy` — do bloku přidat:

```
npm run questions:export   # dataset -> docs/questions-review.md (review pro netechnickeho recenzenta)
npm run questions:import   # docs/questions-review.md (nebo argv cesta) -> questions.ts + seed.ts + counts
```

2. Do sekce o Teorie modulu (za odstavec „Nový obsah do Teorie…") přidat odstavec:

```
Review workflow pro netechnického recenzenta: `npm run questions:export` vygeneruje
`docs/questions-review.md` (gitignored, plná serializace datasetu s legendou);
recenzent upraví texty / checkboxy správnosti / napíše `SMAZAT` do sekce otázky;
`npm run questions:import <cesta>` markdown zparsuje (české chyby s číslem řádku)
a přegeneruje `questions.ts` + `LAW_QUESTION_IDS` v `e2e/fixtures/seed.ts` +
counts v `questions.test.ts` (Gotcha 43 strojově). Bezztrátovost hlídá
round-trip test v `src/modules/law/review/`. Přidávání otázek jde dál jen v TS.
```

3. Do adresářové struktury přidat `src/modules/law/review/` (serializeQuestions, parseQuestionsMd, formatQuestionsTs + testy) a `scripts/questions-export.ts` / `questions-import.ts`.

- [ ] **Step 7: Finální testy + commit**

```bash
npm run test:all
git add package.json package-lock.json .gitignore scripts/questions-export.ts scripts/questions-import.ts src/modules/law/data/questions.ts e2e/fixtures/seed.ts src/modules/law/data/questions.test.ts CLAUDE.md
git commit -m "feat(law): review round-trip CLI (export/import) + normalizace questions.ts"
```

Expected: `npm run test:all` kompletně zelené (420 testů + nové review testy).
