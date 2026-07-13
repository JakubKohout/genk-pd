import { readFileSync, writeFileSync } from 'node:fs';
import { parseQuestionsMd } from '../src/modules/law/review/parseQuestionsMd';
import { formatQuestionsTs } from '../src/modules/law/review/formatQuestionsTs';

const mdPath = process.argv[2] ?? 'docs/questions-review.md';
const { questions, deletedIds } = parseQuestionsMd(readFileSync(mdPath, 'utf8'));

// Spočítat VŠECHNY tři výstupy před prvním zápisem — buď se zapíšou všechny
// tři, nebo žádný (selhání na 2. souboru by jinak nechalo repo v nekonzistentním
// stavu s questions.ts přepsaným, ale seed.ts/questions.test.ts starým).
const questionsTsContent = formatQuestionsTs(questions);

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

let seedContent = readFileSync('e2e/fixtures/seed.ts', 'utf8');
seedContent = replaceArray(seedContent, 'LEA_QUESTION_IDS', lea);
seedContent = replaceArray(seedContent, 'PENAL_SCENARIO_IDS', penal);
seedContent = replaceArray(seedContent, 'SASP_QUESTION_IDS', sasp);
seedContent = seedContent
  .replace(/\/\/ LEA \(\d+\)/, `// LEA (${lea.length})`)
  .replace(/\/\/ Penal scenarios \(\d+\)/, `// Penal scenarios (${penal.length})`)
  .replace(/\/\/ SASP \(\d+\)/, `// SASP (${sasp.length})`);

let testContent = readFileSync('src/modules/law/data/questions.test.ts', 'utf8');
const replaceCount = (src: string, re: RegExp, n: number): string => {
  if (!re.test(src)) throw new Error(`questions.test.ts: nenašel jsem count assert ${re}`);
  return src.replace(re, `$1${n}$2`);
};
testContent = replaceCount(testContent, /(bySource\('lea'\)\)\.toHaveLength\()\d+(\))/, lea.length);
testContent = replaceCount(testContent, /(bySource\('penal'\)\)\.toHaveLength\()\d+(\))/, penal.length);
testContent = replaceCount(testContent, /(bySource\('sasp'\)\)\.toHaveLength\()\d+(\))/, sasp.length);
testContent = replaceCount(testContent, /(expect\(LAW_QUESTIONS\)\.toHaveLength\()\d+(\))/, questions.length);

writeFileSync('src/modules/law/data/questions.ts', questionsTsContent);
writeFileSync('e2e/fixtures/seed.ts', seedContent);
writeFileSync('src/modules/law/data/questions.test.ts', testContent);

console.log(`Import hotov: ${questions.length} otázek (${lea.length} LEA + ${penal.length} Penal + ${sasp.length} SASP).`);
if (deletedIds.length > 0) console.log(`Smazáno ${deletedIds.length}: ${deletedIds.join(', ')}`);
console.log('Zkontroluj git diff a spusť: npm test');
