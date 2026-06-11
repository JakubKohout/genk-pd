import type { POI } from '../data/types';
import { normalize } from '@/shared/text/normalize';

export const POI_AUTOCOMPLETE_MIN_LENGTH = 2;
export const POI_AUTOCOMPLETE_MAX_RESULTS = 5;

export function suggestPois(
  input: string,
  pois: readonly POI[],
  excludeIds: ReadonlySet<string> = new Set(),
): POI[] {
  const norm = normalize(input);
  if (norm.length < POI_AUTOCOMPLETE_MIN_LENGTH) return [];

  const matches: { poi: POI; pos: number }[] = [];
  for (const poi of pois) {
    if (excludeIds.has(poi.id)) continue;
    let bestPos = -1;
    const haystacks = [poi.name, ...poi.aliases];
    for (const h of haystacks) {
      const pos = normalize(h).indexOf(norm);
      if (pos !== -1 && (bestPos === -1 || pos < bestPos)) bestPos = pos;
    }
    if (bestPos !== -1) matches.push({ poi, pos: bestPos });
  }

  matches.sort((a, b) => a.pos - b.pos || a.poi.name.length - b.poi.name.length);
  return matches.slice(0, POI_AUTOCOMPLETE_MAX_RESULTS).map((m) => m.poi);
}
