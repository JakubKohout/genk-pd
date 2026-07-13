import { SASP_CHOICE } from './choice';
import { SASP_TEXT } from './text';
import { SASP_ENUM } from './enumeration';
import { SASP_MATCH } from './match';
import type { LawQuestion } from '../types';

export const SASP_LAW_QUESTIONS: readonly LawQuestion[] = [
  ...SASP_CHOICE, ...SASP_TEXT, ...SASP_ENUM, ...SASP_MATCH,
];
