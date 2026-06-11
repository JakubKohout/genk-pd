import type { AnchorPair } from '../logic/transform';
import { MG_LOCATION_BY_ID } from './mapgenieLocations';
import type { Vec2 } from './types';

/**
 * Persistent calibration anchors. Each anchor carries three coords:
 * - `ourCoord`: position in our normalized 0..1 image space (clean-map.jpg)
 * - `mgLocationId` → looked up to MG lat/lng (Mercator-projected for affine fit)
 * - `gtaWorld`: Rockstar GTA V world coords (X, Y; in meters from origin,
 *   Y grows northward). Linear — no projection needed.
 *
 * Values verified via Foxxite/GTAV-Geo-Json area centroids cross-referenced with
 * GTA Wiki / FiveM published coords (±5 m accuracy).
 */
interface DefaultAnchor {
  mgLocationId: number;
  ourCoord: Vec2;
  gtaWorld: Vec2;
  label: string;
}

// ourCoord = gtaToNorm(gtaWorld) using the canonical uniform projection
// from `gtaProjection.ts`. Recompute via that helper if gtaWorld changes.
export const DEFAULT_ANCHORS: readonly DefaultAnchor[] = [
  { mgLocationId: 12624, ourCoord: { x: 0.3614, y: 0.7371 }, gtaWorld: { x: -1109, y: -845 }, label: 'Vespucci Police Department' },
  { mgLocationId: 13825, ourCoord: { x: 0.5175, y: 0.1183 }, gtaWorld: { x: 140, y: 6580 }, label: 'Paleto Forest Motel' },
  { mgLocationId: 12807, ourCoord: { x: 0.9583, y: 0.3554 }, gtaWorld: { x: 3666, y: 3735 }, label: 'Humane Labs and Research' },
  { mgLocationId: 13868, ourCoord: { x: 0.5599, y: 0.9311 }, gtaWorld: { x: 479, y: -3173 }, label: 'Helicopter (Lookout Point, far south)' },
  { mgLocationId: 13326, ourCoord: { x: 0.4453, y: 0.5644 }, gtaWorld: { x: -438, y: 1227 }, label: 'Galileo Observatory' },
  { mgLocationId: 13748, ourCoord: { x: 0.7308, y: 0.4487 }, gtaWorld: { x: 1846, y: 2616 }, label: 'Bolingbroke Penitentiary' },
];

/** Expand to full `AnchorPair[]` by looking up lat/lng from filtered MG data. */
export function buildDefaultAnchors(): AnchorPair[] {
  const out: AnchorPair[] = [];
  for (const a of DEFAULT_ANCHORS) {
    const mg = MG_LOCATION_BY_ID.get(a.mgLocationId);
    if (!mg) continue;
    out.push({
      mgLocationId: a.mgLocationId,
      mgLatLng: { latitude: mg.latitude, longitude: mg.longitude },
      ourCoord: a.ourCoord,
    });
  }
  return out;
}

/** GTA-world → ourCoord pair, used by the streets import pipeline. */
export interface GtaAnchorPair {
  label: string;
  gtaWorld: Vec2;
  ourCoord: Vec2;
}

export function buildGtaAnchors(): GtaAnchorPair[] {
  return DEFAULT_ANCHORS.map((a) => ({
    label: a.label,
    gtaWorld: a.gtaWorld,
    ourCoord: a.ourCoord,
  }));
}
