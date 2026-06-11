import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { point as turfPoint, polygon as turfPolygon } from '@turf/helpers';
import type { POI, Vec2 } from '../data/types';

export const HIT_THRESHOLD = 0.03;

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
  /** Normalized distance to the POI (0..√2). For polygon POIs this is 0 when
   *  inside and `Infinity` when outside — point-in-polygon is binary, not a
   *  continuous metric. */
  distance: number;
};

/**
 * Defensive: GeoJSON polygon rings MUST be closed (first === last vertex).
 * Foxxite source rings are closed by the spec, and our import script preserves
 * that. This helper guards against hand-authored / malformed rings.
 */
function ensureClosed(ring: readonly Vec2[]): [number, number][] {
  if (ring.length === 0) return [];
  // Turf coords are [x, y] (= [lng, lat] in the geographic naming convention;
  // we work in a flat normalized image space, so axis labels are nominal).
  const coords: [number, number][] = ring.map((v) => [v.x, v.y]);
  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coords.push([first[0], first[1]]);
  }
  return coords;
}

/**
 * Point-in-polygon over a POIPolygon's rings array. Treats ring 0 as the outer
 * boundary and rings 1+ as holes (GeoJSON Polygon semantics — see
 * scripts/import-foxxite-streets.mjs commentary). Foxxite source has no holes
 * and no MultiPolygons in practice, so in the common case `rings.length === 1`
 * and this reduces to a single outer-ring check.
 *
 * Coordinate convention: Turf takes `[lng, lat]` ordered pairs. Our `Vec2`
 * fields are `{x, y}` in flat normalized image space — we map x → lng, y → lat
 * directly. There is NO axis swap. Leaflet's `[lat, lng]` ordering only
 * applies to its own API; we already converted away from it in coords.ts.
 */
function pointInRings(click: Vec2, rings: readonly (readonly Vec2[])[]): boolean {
  if (rings.length === 0) return false;
  const closed = rings.map(ensureClosed).filter((r) => r.length >= 4);
  if (closed.length === 0) return false;
  // turfPolygon expects Position[][] (= array of rings). `closed` is already
  // that shape — ring 0 = outer, rings 1+ = holes.
  const poly = turfPolygon(closed);
  return booleanPointInPolygon(turfPoint([click.x, click.y]), poly);
}

/** Evaluate a click against a POI: returns hit status and distance to target. */
export function evaluateClick(
  poi: POI,
  click: Vec2,
  threshold = HIT_THRESHOLD,
): EvaluatedClick {
  if (poi.geometry === 'point') {
    const d = distance(click, poi.position);
    return { hit: d < threshold, distance: d };
  }
  if (poi.geometry === 'polyline') {
    const d = pointToPolylineDist(click, poi.path);
    return { hit: d <= POLYLINE_HIT_TOLERANCE, distance: d };
  }
  // poi.geometry === 'polygon' — point-in-polygon, no tolerance.
  const inside = pointInRings(click, poi.rings);
  return { hit: inside, distance: inside ? 0 : Infinity };
}

/** Exposed for tests / debug overlays so callers can probe rings independently. */
export function isClickInsidePolygon(rings: readonly (readonly Vec2[])[], click: Vec2): boolean {
  return pointInRings(click, rings);
}
