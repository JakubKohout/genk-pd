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

const FIELD_LABELS = ['Zadání', 'Scénka', 'Vysvětlivka', 'Odpověď', 'Aliasy'];

// Uzavřená gramatika: cokoliv, co serializer uvnitř sekce vypisuje, musí sem
// mít odpovídající tvar. Nerozpoznaný řádek = pravděpodobný překlep
// recenzenta (ztracená hvězdička, chybějící mezera) — radši nahlásit chybu
// než tiše zahodit data.
function isRecognizedLine(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed === '') return true;
  if (/^- typ: /.test(text)) return true;
  if (FIELD_LABELS.some((label) => text.startsWith(`**${label}:** `))) return true;
  if (text === '**Možnosti:** (zaškrtnuté = správné)') return true;
  if (text === '**Položky:**') return true;
  if (text === '**Páry:**') return true;
  if (/^- \[[ x]\] /.test(text)) return true;
  if (/^\d+\. \*\*.*\*\*$/.test(text)) return true;
  if (/^ {3}- (aliasy|keywords|klíč|sub): /.test(text)) return true;
  if (/^\|.*\|$/.test(trimmed)) return true;
  return false;
}

export function parseQuestionsMd(md: string): ParsedReview {
  const lines = md.split(/\r?\n/);
  const errors: string[] = [];
  const err = (no: number, msg: string) => errors.push(`řádek ${no}: ${msg}`);

  // 1) rozřezat na sekce podle "### "
  const sections: Section[] = [];
  let current: Section | null = null;
  lines.forEach((text, idx) => {
    const no = idx + 1;
    if (text.startsWith('### ')) {
      const m = /^### (.+) `([a-zA-Z0-9.-]+)`\s*$/.exec(text);
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

    for (const l of s.lines) {
      if (!isRecognizedLine(l.text)) err(l.no, 'nerozpoznaný řádek — zkontroluj překlepy');
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
