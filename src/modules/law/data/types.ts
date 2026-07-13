import { LAW_THEME_KEYS, type LawTheme } from '@/shared/storage';
export type { LawTheme };
export const LAW_THEMES = LAW_THEME_KEYS;

interface LawBase {
  id: string;
  theme: LawTheme;
  prompt: string;
  /** Short title for the chip in LawSidePanel (falls back to prompt). */
  title?: string;
  ref?: string;
  note?: string;
  scenario?: string;
}

export interface LawChoice extends LawBase {
  kind: 'choice';
  options: string[];
  correctIndices: number[];
}
export interface LawText extends LawBase {
  kind: 'text';
  answer: string;
  aliases: string[];
}
export interface LawExpected {
  key: string;
  label: string;
  aliases?: string[];
  /** Stem keywords for tolerant paraphrase matching (prefix-run after normalize). */
  keywords?: string[];
  subId?: string;
}
export interface LawEnumeration extends LawBase {
  kind: 'enumeration';
  expected: LawExpected[];
  ordered?: boolean;
  matcher: 'alias' | 'paragraph';
}
export interface LawMatch extends LawBase {
  kind: 'match';
  leftLabel: string;
  rightLabel: string;
  pairs: { left: string; right: string }[];
}
export type LawQuestion = LawChoice | LawText | LawEnumeration | LawMatch;
