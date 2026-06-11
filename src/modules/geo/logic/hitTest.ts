import type { POI, POISize, Vec2 } from '../data/types';

/** Per-size click tolerances in normalized units (0..1 over map width). */
export const SIZE_THRESHOLDS: Record<POISize, number> = {
  tiny: 0.015,
  small: 0.025,
  medium: 0.035,
  large: 0.055,
  huge: 0.09,
};

/** Default point tolerance (alias for the medium tier). */
export const HIT_THRESHOLD = SIZE_THRESHOLDS.medium;

export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/** Smallest perpendicular distance from `p` to segment `a`–`b`. */
export function pointToSegmentDist(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const proj: Vec2 = { x: a.x + t * dx, y: a.y + t * dy };
  return distance(p, proj);
}

/** Smallest perpendicular distance from `p` to any segment of `path`. */
export function pointToPolylineDist(p: Vec2, path: readonly Vec2[]): number {
  if (path.length === 0) return Infinity;
  if (path.length === 1) return distance(p, path[0]!);
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const d = pointToSegmentDist(p, path[i]!, path[i + 1]!);
    if (d < best) best = d;
  }
  return best;
}

/** Touch-friendly tolerance: clicks within this perpendicular distance hit the line. */
export const POLYLINE_HIT_TOLERANCE = 0.015;

export type EvaluatedClick = {
  hit: boolean;
  /** Normalized distance to the POI (0..√2). */
  distance: number;
};

/** Evaluate a click against a POI: returns hit status and distance to target.
 * For point POIs the tolerance derives from the POI's `size` tier (default
 * medium) unless an explicit `threshold` override is supplied. */
export function evaluateClick(
  poi: POI,
  click: Vec2,
  threshold?: number,
): EvaluatedClick {
  if (poi.geometry === 'point') {
    const limit = threshold ?? SIZE_THRESHOLDS[poi.size ?? 'medium'];
    const d = distance(click, poi.position);
    return { hit: d < limit, distance: d };
  }
  const d = pointToPolylineDist(click, poi.path);
  return { hit: d <= POLYLINE_HIT_TOLERANCE, distance: d };
}
