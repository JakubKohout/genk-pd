import type { Vec2 } from '../data/types';
import type { MapGenieLocation } from '../data/mapgenieLocations';
import {
  applyAffine,
  applyAffine6,
  applyTps,
  fitAffine,
  fitAffine6,
  fitTps,
  type Affine6Transform,
  type AffineTransform,
  type CalibrationPair,
  type TpsTransform,
} from './calibrate';

/**
 * Map Genie latitude/longitude → linearized (x, y) coords ready for affine fit.
 *
 * Map Genie's tile image is rendered in **Web Mercator projection** but their
 * location records store raw latitude in degrees. If we feed raw lat to a
 * linear (affine) fit, the residuals don't converge even with many anchors
 * because the actual relationship between MG-lat and image-pixel-y is the
 * Mercator forward transform:
 *
 *     y_merc(lat) = log(tan(π/4 + lat · π/360))
 *
 * Applying this projection here makes the (lng, y_merc) → image-pixel
 * relationship affine. Longitude is already linear in Mercator x (just scaled),
 * so no projection is needed for x.
 *
 * Verified empirically: ratio Δour_y/Δlat varies 1.9× across the map (clear
 * non-linearity), but Δour_y/Δy_merc is constant within 2 %.
 */
export function mgLatLngToVec2(loc: Pick<MapGenieLocation, 'latitude' | 'longitude'>): Vec2 {
  const latRad = ((45 + loc.latitude / 2) * Math.PI) / 180;
  return { x: loc.longitude, y: Math.log(Math.tan(latRad)) };
}

export type MgTransform =
  | { kind: 'affine4'; t: AffineTransform }
  | { kind: 'affine6'; t: Affine6Transform }
  | { kind: 'tps'; t: TpsTransform };

export type TransformMode = 'auto' | 'affine6' | 'tps';

export function applyMgTransform(
  loc: Pick<MapGenieLocation, 'latitude' | 'longitude'>,
  t: MgTransform,
): Vec2 {
  const p = mgLatLngToVec2(loc);
  if (t.kind === 'tps') return applyTps(p, t.t);
  if (t.kind === 'affine6') return applyAffine6(p, t.t);
  return applyAffine(p, t.t);
}

/** A user-placed anchor pair: Map Genie location ↔ our-map click position. */
export interface AnchorPair {
  mgLocationId: number;
  mgLatLng: { latitude: number; longitude: number };
  ourCoord: Vec2;
}

export function fitAnchorTransform(anchors: readonly AnchorPair[]): AffineTransform {
  return fitAffine(anchorsToPairs(anchors));
}

function anchorsToPairs(anchors: readonly AnchorPair[]): CalibrationPair[] {
  return anchors.map((a) => ({
    poiId: `mg.${a.mgLocationId}`,
    before: mgLatLngToVec2(a.mgLatLng),
    after: a.ourCoord,
  }));
}

/**
 * Fit a transform of the requested mode.
 *  - `auto`: 4-param for 2 anchors, 6-param for 3+ anchors
 *  - `affine6`: 6-param affine (requires ≥3 non-collinear anchors)
 *  - `tps`: thin-plate spline, passes exactly through each anchor (requires ≥3)
 */
export function fitAnchorTransformMode(
  anchors: readonly AnchorPair[],
  mode: TransformMode,
): MgTransform | null {
  if (anchors.length < 2) return null;
  const pairs = anchorsToPairs(anchors);
  try {
    if (mode === 'tps' && anchors.length >= 3) {
      return { kind: 'tps', t: fitTps(pairs) };
    }
    if (mode === 'affine6' && anchors.length >= 3) {
      return { kind: 'affine6', t: fitAffine6(pairs) };
    }
    // auto / fallback
    if (anchors.length >= 3) return { kind: 'affine6', t: fitAffine6(pairs) };
    return { kind: 'affine4', t: fitAffine(pairs) };
  } catch {
    return null;
  }
}

/** Default mode: auto-picks best model per anchor count. */
export function fitBestAnchorTransform(
  anchors: readonly AnchorPair[],
): MgTransform | null {
  return fitAnchorTransformMode(anchors, 'auto');
}

/**
 * Leave-one-out residuals: for each anchor, refit on the *other* anchors and
 * compute how far that fit predicts this anchor from where the user clicked it.
 * Large LOO distance flags an anchor that's either clicked imprecisely or
 * inconsistent with the rest (outlier). Requires ≥4 anchors (need 3 for the
 * leave-out fit). Returns null if not enough anchors.
 */
export function computeLooResiduals(
  anchors: readonly AnchorPair[],
  mode: TransformMode,
): AnchorResidual[] | null {
  if (anchors.length < 4) return null;
  const out: AnchorResidual[] = [];
  for (let i = 0; i < anchors.length; i++) {
    const rest = anchors.filter((_, j) => j !== i);
    const t = fitAnchorTransformMode(rest, mode);
    if (!t) return null;
    const predicted = applyMgTransform(anchors[i]!.mgLatLng, t);
    const actual = anchors[i]!.ourCoord;
    const dx = actual.x - predicted.x;
    const dy = actual.y - predicted.y;
    out.push({
      mgLocationId: anchors[i]!.mgLocationId,
      predicted,
      actual,
      dx,
      dy,
      distance: Math.hypot(dx, dy),
    });
  }
  return out;
}

/** Per-anchor residual after the fit (Δx, Δy in normalized 0..1 space). */
export interface AnchorResidual {
  mgLocationId: number;
  predicted: Vec2;
  actual: Vec2;
  dx: number;
  dy: number;
  distance: number;
}

export function computeResiduals(
  anchors: readonly AnchorPair[],
  t: MgTransform,
): AnchorResidual[] {
  return anchors.map((a) => {
    const predicted = applyMgTransform(a.mgLatLng, t);
    const dx = a.ourCoord.x - predicted.x;
    const dy = a.ourCoord.y - predicted.y;
    return {
      mgLocationId: a.mgLocationId,
      predicted,
      actual: a.ourCoord,
      dx,
      dy,
      distance: Math.hypot(dx, dy),
    };
  });
}

/** GTA V world anchor pair (no projection needed — coords are linear). */
export interface GtaWorldAnchor {
  label: string;
  gtaWorld: Vec2;
  ourCoord: Vec2;
}

/**
 * Fit a 6-param affine from GTA V world coords to our image space. Linear input
 * (no Mercator projection — unlike `fitAnchorTransform` for MG which preprocesses
 * with `mgLatLngToVec2`). Returns null if fewer than 3 non-collinear anchors.
 */
export function fitGtaWorldTransform(
  anchors: readonly GtaWorldAnchor[],
): Affine6Transform | null {
  if (anchors.length < 3) return null;
  const pairs: CalibrationPair[] = anchors.map((a, i) => ({
    poiId: `gta.${a.label || i}`,
    before: a.gtaWorld,
    after: a.ourCoord,
  }));
  try {
    return fitAffine6(pairs);
  } catch {
    return null;
  }
}

/** Apply a GTA-world transform to a GTA V world coord. */
export function applyGtaWorldTransform(p: Vec2, t: Affine6Transform): Vec2 {
  return applyAffine6(p, t);
}

/** Per-anchor residual after the GTA fit. */
export function computeGtaResiduals(
  anchors: readonly GtaWorldAnchor[],
  t: Affine6Transform,
): { label: string; predicted: Vec2; actual: Vec2; distance: number }[] {
  return anchors.map((a) => {
    const predicted = applyGtaWorldTransform(a.gtaWorld, t);
    const dx = a.ourCoord.x - predicted.x;
    const dy = a.ourCoord.y - predicted.y;
    return {
      label: a.label,
      predicted,
      actual: a.ourCoord,
      distance: Math.hypot(dx, dy),
    };
  });
}
