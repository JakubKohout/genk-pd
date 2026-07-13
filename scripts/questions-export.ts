import { writeFileSync } from 'node:fs';
import { LAW_QUESTIONS } from '../src/modules/law/data/questions';
import { serializeQuestions } from '../src/modules/law/review/serializeQuestions';

const OUT = 'docs/questions-review.md';
writeFileSync(OUT, serializeQuestions(LAW_QUESTIONS));
console.log(`Export hotov: ${OUT} (${LAW_QUESTIONS.length} otázek).`);
