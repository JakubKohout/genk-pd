import { SASP_LAW_QUESTIONS } from './sasp';
import { adaptLeaQuestions } from './adaptLea';
import { adaptPenalScenarios } from './adaptPenal';
import type { LawQuestion } from './types';

export const LAW_QUESTIONS: readonly LawQuestion[] = [
  ...adaptLeaQuestions(),
  ...adaptPenalScenarios(),
  ...SASP_LAW_QUESTIONS,
];
