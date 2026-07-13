import type { LawExpected, LawQuestion, LawTheme } from '../data/types';
import { normalize } from '../../../shared/text/normalize';
import { LAW_THEME_KEYS } from '../../../shared/storage';

export interface ParsedReview {
  questions: LawQuestion[];
  deletedIds: string[];
}

const NEW_ID_PLACEHOLDER = '__NEW__';

const KIND_BY_LABEL: Record<string, { kind: LawQuestion['kind']; matcher?: 'alias' | 'paragraph' }> = {
  'choice': { kind: 'choice' },
  'text': { kind: 'text' },
  'enumeration-alias': { kind: 'enumeration', matcher: 'alias' },
  'enumeration-paragraph': { kind: 'enumeration', matcher: 'paragraph' },
  'match': { kind: 'match' },
};

interface Section {
  headingLine: number;
  title: string;
  id: string;
  isNew: boolean;
  lines: { no: number; text: string }[];
}

function splitList(raw: string): string[] {
  return raw.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
}

const FIELD_LABELS = ['Zadání', 'Scénka', 'Vysvětlivka', 'Odpověď', 'Aliasy'];

// Closed grammar: anything the serializer emits inside a section must have a
// matching shape here. An unrecognized line = a likely reviewer typo (a lost
// asterisk, a missing space) — better to report an error than to silently
// drop data.
function isRecognizedLine(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed === '') return true;
  if (/^- type: /.test(text)) return true;
  if (FIELD_LABELS.some((label) => text.startsWith(`**${label}:** `))) return true;
  if (text === '**Možnosti:** (zaškrtnuté = správné)') return true;
  if (text === '**Položky:**') return true;
  if (text === '**Páry:**') return true;
  if (/^- \[[ x]\] /.test(text)) return true;
  if (/^\d+\. \*\*.*\*\*$/.test(text)) return true;
  if (/^ {3}- (aliases|keywords|key|sub): /.test(text)) return true;
  if (/^\|.*\|$/.test(trimmed)) return true;
  return false;
}

export function parseQuestionsMd(md: string): ParsedReview {
  const lines = md.split(/\r?\n/);
  const errors: string[] = [];
  const err = (no: number, msg: string) => errors.push(`řádek ${no}: ${msg}`);

  // 1) split into sections by "### "
  const sections: Section[] = [];
  let current: Section | null = null;
  lines.forEach((text, idx) => {
    const no = idx + 1;
    if (text.startsWith('### ')) {
      const m = /^### (.+) `(NEW|[a-zA-Z0-9.-]+)`\s*$/.exec(text);
      if (!m) {
        err(no, 'nadpis otázky musí končit ID v backticks: ### Titulek `id.otazky`');
        current = null;
        return;
      }
      const isNew = m[2] === 'NEW';
      if (!isNew && /^new$/i.test(m[2]!)) {
        err(no, `ID "${m[2]}" vypadá jako překlep sentinelu NEW — nová otázka se píše s přesně \`NEW\``);
        current = null;
        return;
      }
      current = {
        headingLine: no,
        title: m[1]!,
        id: isNew ? NEW_ID_PLACEHOLDER : m[2]!,
        isNew,
        lines: [],
      };
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
    const label = s.isNew ? s.title : s.id;
    if (!s.isNew) {
      if (seenIds.has(s.id)) {
        err(s.headingLine, `duplicitní ID ${s.id}`);
        continue;
      }
      seenIds.add(s.id);
    }

    if (s.lines.some((l) => l.text.trim() === 'SMAZAT')) {
      if (!s.isNew) deletedIds.push(s.id);
      continue;
    }

    for (const l of s.lines) {
      if (!isRecognizedLine(l.text)) err(l.no, 'nerozpoznaný řádek — zkontroluj překlepy');
    }

    if (s.title.length > 40) err(s.headingLine, `titulek delší než 40 znaků: "${s.title}"`);

    // 2) meta line
    const metaEntry = s.lines.find((l) => l.text.startsWith('- type: '));
    if (!metaEntry) {
      err(s.headingLine, `otázce ${label} chybí řádek "- type: …"`);
      continue;
    }
    const metaParts = metaEntry.text.slice(2).split(' | ').map((p) => p.trim());
    const meta = new Map<string, string>();
    for (const part of metaParts) {
      const ci = part.indexOf(': ');
      if (ci > 0) meta.set(part.slice(0, ci), part.slice(ci + 2));
    }
    const kindInfo = KIND_BY_LABEL[meta.get('type') ?? ''];
    if (!kindInfo) {
      err(metaEntry.no, `neznámý typ "${meta.get('type')}"`);
      continue;
    }
    const themeRaw = meta.get('theme');
    if (!themeRaw) {
      err(metaEntry.no, 'chybí téma');
      continue;
    }
    if (!(LAW_THEME_KEYS as readonly string[]).includes(themeRaw)) {
      err(metaEntry.no, `neznámé téma "${themeRaw}"`);
      continue;
    }
    const theme = themeRaw as LawTheme;
    const ref = meta.get('ref');
    const ordered = meta.get('ordered') === 'true';

    // 3) single-line fields
    // the prefix `**<label>:** ` has length label.length + 6 (2+1+2+1 extra chars)
    const field = (fieldLabel: string): string | undefined =>
      s.lines.find((l) => l.text.startsWith(`**${fieldLabel}:** `))?.text.slice(fieldLabel.length + 6);
    const prompt = field('Zadání');
    if (!prompt) {
      err(s.headingLine, `otázce ${label} chybí "**Zadání:**"`);
      continue;
    }
    const scenario = field('Scénka');
    const note = field('Vysvětlivka');

    const base = {
      id: s.id,
      theme,
      prompt,
      title: s.title,
      ...(ref ? { ref } : {}),
      ...(note ? { note } : {}),
      ...(scenario ? { scenario } : {}),
    };

    // 4) kind-specific body
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
      if (options.length < 5) { err(s.headingLine, `${label}: méně než 5 možností`); continue; }
      if (correctIndices.length === 0) { err(s.headingLine, `${label}: žádná možnost není zaškrtnutá jako správná`); continue; }
      questions.push({ ...base, kind: 'choice', options, correctIndices });
    } else if (kindInfo.kind === 'text') {
      const answer = field('Odpověď');
      if (!answer) { err(s.headingLine, `${label}: chybí "**Odpověď:**"`); continue; }
      const aliases = splitList(field('Aliasy') ?? '');
      questions.push({ ...base, kind: 'text', answer, aliases });
    } else if (kindInfo.kind === 'enumeration') {
      const expected: LawExpected[] = [];
      const usedKeys = new Set<string>();
      let item: LawExpected | null = null;
      let itemLine = s.headingLine;
      const flush = () => {
        if (!item) return;
        if (!item.key) {
          if (s.isNew && kindInfo.matcher === 'alias') {
            const slug = normalize(item.label).replace(/ /g, '-');
            if (usedKeys.has(slug)) {
              err(itemLine, 'duplicitní vygenerovaný key — přejmenuj položku');
              return;
            }
            item.key = slug;
          } else {
            err(itemLine, `${label}: položce "${item.label}" chybí "key:"`);
            return;
          }
        }
        usedKeys.add(item.key);
        expected.push(item);
      };
      for (const l of s.lines) {
        const head = /^\d+\. \*\*(.*)\*\*$/.exec(l.text);
        if (head) {
          flush();
          item = { key: '', label: head[1]! };
          itemLine = l.no;
          continue;
        }
        const sub = /^ {3}- (aliases|keywords|key|sub): (.*)$/.exec(l.text);
        if (sub && item) {
          if (sub[1] === 'aliases') item.aliases = splitList(sub[2]!);
          else if (sub[1] === 'keywords') item.keywords = splitList(sub[2]!);
          else if (sub[1] === 'key') item.key = sub[2]!.trim();
          else item.subId = sub[2]!.trim();
        }
      }
      flush();
      if (expected.length === 0) { err(s.headingLine, `${label}: výčet bez položek`); continue; }
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
      if (rows.length < 4) { err(s.headingLine, `${label}: tabulka párů musí mít záhlaví a aspoň 3 páry`); continue; }
      const cells = rows.map((l) => l.text.trim().slice(1, -1).split('|').map((c) => c.trim()));
      const badRow = rows[cells.findIndex((c) => c.length !== 2)];
      if (badRow && cells.some((c) => c.length !== 2)) {
        err(badRow.no, `${label}: řádek tabulky nemá přesně 2 sloupce`);
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

  let nextQ =
    1 +
    Math.max(
      0,
      ...sections
        .filter((s) => !s.isNew)
        .map((s) => {
          const m = /^q(\d+)$/.exec(s.id);
          return m ? Number(m[1]) : 0;
        }),
    );
  for (const q of questions) {
    if (q.id === NEW_ID_PLACEHOLDER) {
      (q as { id: string }).id = `q${nextQ}`;
      nextQ += 1;
    }
  }

  if (errors.length > 0) throw new Error(errors.join('\n'));
  return { questions, deletedIds };
}
