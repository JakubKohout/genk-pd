import { readFileSync, writeFileSync } from 'node:fs';
import { parseQuestionsMd } from '../src/modules/law/review/parseQuestionsMd';
import { formatQuestionsTs } from '../src/modules/law/review/formatQuestionsTs';
import { LAW_QUESTIONS } from '../src/modules/law/data/questions';

const mdPath = process.argv[2] ?? 'docs/questions-review.md';
const { questions, deletedIds } = parseQuestionsMd(readFileSync(mdPath, 'utf8'));

const allIds = questions.map((q) => q.id);

// Cross-check against the current dataset BEFORE any write — an id generated
// by the import (`q<n>`, sentinel NEW) is always a legitimate new question; a `q<n>`
// that already exists in the dataset is an existing question. Anything else that
// isn't in the dataset is either a typo in the sentinel (`NEWX` etc.), or an
// accidentally overwritten ID of an existing question — either would otherwise
// silently orphan (losing the player's progress). Better to fail fast than write
// anything.
const currentIds = new Set(LAW_QUESTIONS.map((q) => q.id));
const unknown = allIds.filter((id) => !currentIds.has(id) && !/^q\d+$/.test(id));
if (unknown.length > 0) {
  throw new Error('Neznámá ID (překlep nebo editace ID existující otázky?): ' + unknown.join(', '));
}

// Compute ALL three outputs before the first write — either all three get
// written, or none do (a failure on the 2nd file would otherwise leave the repo in
// an inconsistent state, with questions.ts overwritten but seed.ts/questions.test.ts stale).
const questionsTsContent = formatQuestionsTs(questions);

const arrBody = (ids: string[]) => ids.map((i) => `  '${i}',`).join('\n');
const replaceArray = (src: string, name: string, ids: string[]): string => {
  const re = new RegExp(`(export const ${name} = \\[\\n)[\\s\\S]*?(\\n\\] as const;)`);
  if (!re.test(src)) throw new Error(`e2e/fixtures/seed.ts: nenašel jsem pole ${name}`);
  return src.replace(re, `$1${arrBody(ids)}$2`);
};

let seedContent = readFileSync('e2e/fixtures/seed.ts', 'utf8');
seedContent = replaceArray(seedContent, 'LAW_QUESTION_IDS', allIds);

let testContent = readFileSync('src/modules/law/data/questions.test.ts', 'utf8');
const replaceCount = (src: string, re: RegExp, n: number): string => {
  if (!re.test(src)) throw new Error(`questions.test.ts: nenašel jsem count assert ${re}`);
  return src.replace(re, `$1${n}$2`);
};
testContent = replaceCount(testContent, /(expect\(LAW_QUESTIONS\)\.toHaveLength\()\d+(\))/, questions.length);

writeFileSync('src/modules/law/data/questions.ts', questionsTsContent);
writeFileSync('e2e/fixtures/seed.ts', seedContent);
writeFileSync('src/modules/law/data/questions.test.ts', testContent);

const newIds = allIds.filter((i) => /^q\d+$/.test(i));
console.log(`Import hotov: ${questions.length} otázek.`);
if (newIds.length) console.log(`Nové otázky: ${newIds.join(', ')}`);
if (deletedIds.length > 0) console.log(`Smazáno ${deletedIds.length}: ${deletedIds.join(', ')}`);
console.log('Zkontroluj git diff a spusť: npm test');
