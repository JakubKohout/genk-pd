import { readFileSync, writeFileSync } from 'node:fs';
import { parseQuestionsMd } from '../src/modules/law/review/parseQuestionsMd';
import { formatQuestionsTs } from '../src/modules/law/review/formatQuestionsTs';
import { LAW_QUESTIONS } from '../src/modules/law/data/questions';

const mdPath = process.argv[2] ?? 'docs/questions-review.md';
const { questions, deletedIds } = parseQuestionsMd(readFileSync(mdPath, 'utf8'));

const allIds = questions.map((q) => q.id);

// Cross-check proti aktuálnímu datasetu PŘED jakýmkoliv zápisem — id vygenerované
// importem (`q<n>`, sentinel NEW) je vždy legitimní nová otázka; `q<n>`, které už
// v datasetu existuje, je existující otázka. Cokoliv jiného, co v datasetu není,
// je buď překlep sentinelu (`NEWX` apod.), nebo omylem přepsané ID existující
// otázky — obojí by jinak potichu osiřelo (ztráta progress hráče). Radši selhat
// hned, než zapsat cokoliv.
const currentIds = new Set(LAW_QUESTIONS.map((q) => q.id));
const unknown = allIds.filter((id) => !currentIds.has(id) && !/^q\d+$/.test(id));
if (unknown.length > 0) {
  throw new Error('Neznámá ID (překlep nebo editace ID existující otázky?): ' + unknown.join(', '));
}

// Spočítat VŠECHNY tři výstupy před prvním zápisem — buď se zapíšou všechny
// tři, nebo žádný (selhání na 2. souboru by jinak nechalo repo v nekonzistentním
// stavu s questions.ts přepsaným, ale seed.ts/questions.test.ts starým).
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
