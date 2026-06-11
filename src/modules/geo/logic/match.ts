import type { POI } from '../data/types';
import { normalize } from '@/shared/text/normalize';

export function matchPoi(input: string, pois: readonly POI[]): POI | null {
  const norm = normalize(input);
  if (!norm) return null;
  for (const poi of pois) {
    if (normalize(poi.name) === norm) return poi;
    for (const alias of poi.aliases) {
      if (normalize(alias) === norm) return poi;
    }
  }
  return null;
}
