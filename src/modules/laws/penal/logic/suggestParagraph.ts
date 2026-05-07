import { normalize } from '@/shared/text/normalize';
import type { PenalParagraph, PenalSubParagraph } from '../data/types';

export const SUGGEST_MIN_LENGTH = 1;
export const SUGGEST_MAX_RESULTS = 8;

export interface ParagraphSuggestion {
  /** Canonical answer ID — '25b' or '27' (no sub). */
  canonicalId: string;
  /** '§25b' or '§27'. */
  display: string;
  paragraphId: string;
  subId?: string;
  title: string;
  description: string;
}

function toSuggestion(p: PenalParagraph, sub?: PenalSubParagraph): ParagraphSuggestion {
  const num = p.number.replace('§', '');
  const subId = sub?.id;
  return {
    canonicalId: subId ? `${num}${subId}` : num,
    display: subId ? `${p.number}${subId}` : p.number,
    paragraphId: p.id,
    subId,
    title: p.title,
    description: sub?.description ?? p.description,
  };
}

function expand(p: PenalParagraph): ParagraphSuggestion[] {
  if (p.subs.length === 0) return [toSuggestion(p)];
  return p.subs.map((sub) => toSuggestion(p, sub));
}

function suggestionKey(s: ParagraphSuggestion): string {
  return s.subId ? `${s.paragraphId}#${s.subId}` : s.paragraphId;
}

function tryNumericMatch(input: string): { numPrefix: string; subPrefix: string | null } | null {
  const cleaned = input.replace(/§/g, '').toLowerCase().replace(/\s+/g, '');
  if (!cleaned) return null;
  // Numeric prefix optionally followed by single sub letter
  const m = /^(\d+)([a-e]?)$/.exec(cleaned);
  if (!m) return null;
  return { numPrefix: m[1], subPrefix: m[2] || null };
}

/**
 * Mode A autocomplete. Suggests paragraf+sub combinations matching:
 *   1. Numeric ID prefix (e.g., '25' → §25a, §25b, §25c, §25d)
 *   2. Name / alias substring (e.g., 'krad' → §25, §27)
 *
 * `excludeKeys` accepts canonical answer IDs ('25b', '27') already committed,
 * so the same suggestion isn't shown twice.
 */
export function suggestParagraphs(
  input: string,
  paragraphs: readonly PenalParagraph[],
  excludeKeys: ReadonlySet<string>,
): ParagraphSuggestion[] {
  const trimmed = input.trim();
  if (trimmed.length < SUGGEST_MIN_LENGTH) return [];

  const numeric = tryNumericMatch(trimmed);
  const matches: { suggestion: ParagraphSuggestion; rank: number }[] = [];
  const seen = new Set<string>();

  if (numeric) {
    const { numPrefix, subPrefix } = numeric;
    for (const p of paragraphs) {
      const paragraphNum = p.id.replace('penal.', '');
      if (!paragraphNum.startsWith(numPrefix)) continue;
      // If user typed a sub (e.g. '25b'), only the exact-number paragraph counts
      if (subPrefix && paragraphNum !== numPrefix) continue;
      // Distance from exact match — exact number with no extra digits ranks first
      const rank = paragraphNum.length - numPrefix.length;
      for (const s of expand(p)) {
        if (subPrefix && s.subId !== subPrefix) continue;
        if (excludeKeys.has(s.canonicalId)) continue;
        const key = suggestionKey(s);
        if (seen.has(key)) continue;
        seen.add(key);
        matches.push({ suggestion: s, rank });
      }
    }
    matches.sort((a, b) => a.rank - b.rank || a.suggestion.canonicalId.localeCompare(b.suggestion.canonicalId));
  } else {
    const norm = normalize(trimmed);
    if (!norm) return [];
    for (const p of paragraphs) {
      let bestPos = -1;
      const haystacks = [p.title, ...p.aliases];
      for (const h of haystacks) {
        const pos = normalize(h).indexOf(norm);
        if (pos !== -1 && (bestPos === -1 || pos < bestPos)) bestPos = pos;
      }
      if (bestPos === -1) continue;
      for (const s of expand(p)) {
        if (excludeKeys.has(s.canonicalId)) continue;
        const key = suggestionKey(s);
        if (seen.has(key)) continue;
        seen.add(key);
        matches.push({ suggestion: s, rank: bestPos });
      }
    }
    matches.sort((a, b) => a.rank - b.rank || a.suggestion.title.length - b.suggestion.title.length);
  }

  return matches.slice(0, SUGGEST_MAX_RESULTS).map((m) => m.suggestion);
}
