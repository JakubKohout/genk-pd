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
