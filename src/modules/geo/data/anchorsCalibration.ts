import type { AnchorPair } from '../logic/transform';
import { MG_LOCATION_BY_ID } from './mapgenieLocations';

/**
 * Persistent calibration anchors for `clean-map.jpg` ↔ Map Genie projection.
 *
 * After fixing `mgLatLngToVec2` to apply Web Mercator forward projection on
 * latitude (Map Genie tiles are Mercator-rendered but lat is stored as raw
 * degrees), these 6 anchors fit with Δ ≤ 0.0005 and LOO ≤ 0.0005 — well within
 * a single pixel at the tile resolution. The 6-param affine model is sufficient
 * because the underlying projection mismatch is now linearized.
 *
 * To re-calibrate or extend: open `/geo/calibrate` → "Anchor & import",
 * adjust the markers, and replace this constant with the new positions.
 */
export const DEFAULT_ANCHORS: readonly Omit<AnchorPair, 'mgLatLng'>[] = [
  { mgLocationId: 12624, ourCoord: { x: 0.316, y: 0.744 } }, // Vespucci Police Department
  { mgLocationId: 13825, ourCoord: { x: 0.359, y: 0.205 } }, // Paleto Forest Motel
  { mgLocationId: 12807, ourCoord: { x: 0.822, y: 0.375 } }, // Humane Labs and Research
  { mgLocationId: 13868, ourCoord: { x: 0.461, y: 0.944 } }, // Helicopter (Lookout Point, far south)
  { mgLocationId: 13326, ourCoord: { x: 0.387, y: 0.590 } }, // Galileo Observatory
  { mgLocationId: 13748, ourCoord: { x: 0.622, y: 0.466 } }, // Bolingbroke Penitentiary
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
