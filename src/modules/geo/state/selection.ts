import type { POI, POICategory } from '../data/types';
import type { GeoCategoryFilter, ProgressEntry } from '@/shared/storage';
import { pickNextFromPool } from '@/shared/quiz/pickNextFromPool';

const MAX_SCORE = 2;

export type GeoSelectionState = {
  progress: Record<string, ProgressEntry>;
  turn: number;
};

export function isCategoryEnabled(filter: GeoCategoryFilter, category: POICategory): boolean {
  return filter[category];
}

export function eligiblePois(
  state: GeoSelectionState,
  pois: readonly POI[],
  filter: GeoCategoryFilter,
): POI[] {
  return pois.filter((p) => {
    if (!isCategoryEnabled(filter, p.category)) return false;
    return (state.progress[p.id]?.score ?? 0) < MAX_SCORE;
  });
}

export function isGeoComplete(
  state: GeoSelectionState,
  pois: readonly POI[],
  filter: GeoCategoryFilter,
): boolean {
  return eligiblePois(state, pois, filter).length === 0;
}

export function pickNextPoi(
  state: GeoSelectionState,
  pois: readonly POI[],
  filter: GeoCategoryFilter,
): POI | null {
  return pickNextFromPool(eligiblePois(state, pois, filter), state.progress, state.turn);
}
