import { describe, expect, it } from 'vitest';
import { LAW_QUESTIONS } from '../data/questions';
import { serializeQuestions } from './serializeQuestions';
import { parseQuestionsMd } from './parseQuestionsMd';
import type { LawQuestion } from '../data/types';

/** Treats empty optional arrays (aliases/keywords) as "absent" — semantically the same. */
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
