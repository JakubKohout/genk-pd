import { LAW_SOURCE_KEYS, LAW_THEME_KEYS, type LawSource, type LawTheme } from '@/shared/storage';
export type { LawSource, LawTheme };
export const LAW_SOURCES = LAW_SOURCE_KEYS;
export const LAW_THEMES = LAW_THEME_KEYS;

interface LawBase {
  id: string;
  source: LawSource;
  theme: LawTheme;
  prompt: string;
  /** Krátký titulek pro chip v LawSidePanel (fallback na prompt). */
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
