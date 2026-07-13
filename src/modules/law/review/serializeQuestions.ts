import type { LawEnumeration, LawQuestion } from '../data/types';

const LEGEND = `# Přehled otázek — Teorie (/law)

> Návod pro recenzenta — co jednotlivá pole znamenají:
>
> - Nadpis otázky: \`### Titulek \\\`id\\\`\` — id v backticks je technický klíč, NEEDITUJ ho.
> - \`type\` — druh otázky (kód, needituj): choice = výběr z možností,
>   text = volná textová odpověď, enumeration-alias = vyjmenování položek,
>   enumeration-paragraph = určení paragrafů ke scénce, match = přiřazování dvojic.
> - \`theme\` — kategorie otázky (kód): pojmy, hodnosti, jednani, rto, vybava,
>   zasah, zadrzeni, kriminalistika, paragrafy, scenky.
> - \`ref\` — odkaz na paragraf/zdroj, jen informativní.
> - \`ordered: true\` — u výčtu záleží na pořadí položek.
> - Možnosti: [x] = správná odpověď, [ ] = špatná; zaškrtnutí můžeš měnit.
> - Aliasy (u textových otázek a položek jako \`aliases:\`) — alternativní PŘESNÁ
>   znění, která se uznávají jako správná odpověď. Odděluj středníkem.
> - \`keywords:\` — kmeny slov pro tolerantní uznání parafráze (odpověď se uzná,
>   když kmen obsahuje). Měň jen s rozmyslem — moc obecný kmen uzná i špatnou odpověď.
> - \`key:\` a \`sub:\` — technické klíče vyhodnocení, NEEDITUJ.
> - Texty (Zadání, Scénka, možnosti, Vysvětlivka, položky) přepisuj volně.
> - Smazání otázky: napiš do její sekce na samostatný řádek slovo SMAZAT.
> - Nová otázka: přidej sekci \`### Titulek \\\`NEW\\\`\` s řádkem
>   \`- type: … | theme: …\` a tělem podle typu (viz existující otázky stejného
>   typu). ID se vygeneruje automaticky při importu. U výčtových položek můžeš
>   \`key:\` vynechat (vygeneruje se), u enumeration-paragraph je povinný
>   (číslo paragrafu, např. 25b).
`;

function kindLabel(q: LawQuestion): string {
  if (q.kind === 'enumeration') {
    return q.matcher === 'paragraph' ? 'enumeration-paragraph' : 'enumeration-alias';
  }
  return q.kind;
}

function assertLine(value: string, what: string, id: string): void {
  if (value.includes('\n')) throw new Error(`${id}: ${what} obsahuje nový řádek — neserializovatelné`);
}

function assertNoChar(value: string, ch: string, what: string, id: string): void {
  if (value.includes(ch)) throw new Error(`${id}: ${what} obsahuje "${ch}" — neserializovatelné`);
}

function metaLine(q: LawQuestion): string {
  const parts = [`type: ${kindLabel(q)}`, `theme: ${q.theme}`];
  if (q.ref) parts.push(`ref: ${q.ref}`);
  if (q.kind === 'enumeration' && (q as LawEnumeration).ordered) parts.push('ordered: true');
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
    assertLine(q.answer, 'answer', q.id);
    lines.push(`**Odpověď:** ${q.answer}`);
    q.aliases.forEach((alias) => {
      assertLine(alias, 'alias', q.id);
      assertNoChar(alias, ';', 'alias', q.id);
    });
    lines.push(`**Aliasy:** ${q.aliases.join('; ')}`);
  } else if (q.kind === 'enumeration') {
    lines.push('**Položky:**');
    q.expected.forEach((e, i) => {
      assertLine(e.label, 'enumeration label', q.id);
      lines.push(`${i + 1}. **${e.label}**`);
      if (e.aliases?.length) {
        e.aliases.forEach((alias) => {
          assertLine(alias, 'enumeration alias', q.id);
          assertNoChar(alias, ';', 'enumeration alias', q.id);
        });
        lines.push(`   - aliases: ${e.aliases.join('; ')}`);
      }
      if (e.keywords?.length) {
        e.keywords.forEach((keyword) => {
          assertLine(keyword, 'enumeration keyword', q.id);
          assertNoChar(keyword, ';', 'enumeration keyword', q.id);
        });
        lines.push(`   - keywords: ${e.keywords.join('; ')}`);
      }
      assertLine(e.key, 'enumeration key', q.id);
      lines.push(`   - key: ${e.key}`);
      if (e.subId) {
        assertLine(e.subId, 'enumeration subId', q.id);
        lines.push(`   - sub: ${e.subId}`);
      }
    });
  } else {
    assertLine(q.leftLabel, 'match leftLabel', q.id);
    assertLine(q.rightLabel, 'match rightLabel', q.id);
    for (const cell of [q.leftLabel, q.rightLabel, ...q.pairs.flatMap((p) => [p.left, p.right])]) {
      if (cell.includes('|')) throw new Error(`${q.id}: text páru obsahuje "|" — neserializovatelné`);
    }
    q.pairs.forEach((p) => {
      assertLine(p.left, 'match pair left', q.id);
      assertLine(p.right, 'match pair right', q.id);
    });
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
    if (q.ref) assertNoChar(q.ref, '|', 'ref', q.id);
    const g = `## ${q.theme}`;
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
