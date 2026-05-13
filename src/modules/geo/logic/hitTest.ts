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

/**
 * Point-in-polygon ray casting. Polygon is given as a closed ring (first === last);
 * the algorithm works regardless. Boundary behavior is undefined-ish but acceptable
 * for hit-test (off-by-pixel on edge is irrelevant — we add edge tolerance separately).
 */
export function pointInPolygon(p: Vec2, ring: readonly Vec2[]): boolean {
  if (ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    const intersects =
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Polygon edge-tolerance used by `polygonHit` and `evaluateClick`. */
export const POLYGON_EDGE_TOLERANCE = 0.015;

/**
 * Smallest perpendicular distance from `p` to any edge of a closed polygon ring.
 * Treats consecutive vertices as segments; if ring is not explicitly closed,
 * also considers the implicit last→first segment.
 */
export function pointToPolygonEdgeDist(p: Vec2, ring: readonly Vec2[]): number {
  if (ring.length === 0) return Infinity;
  if (ring.length === 1) return distance(p, ring[0]!);
  let best = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    const d = pointToSegmentDist(p, a, b);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Touch-friendly polygon hit-test: true if click is inside polygon OR within
 * `tolerance` of any edge. Allows users to "miss" by up to `tolerance` and still
 * register a hit — important for narrow streets on small screens.
 */
export function polygonHit(
  ring: readonly Vec2[],
  click: Vec2,
  tolerance = POLYGON_EDGE_TOLERANCE,
): boolean {
  if (pointInPolygon(click, ring)) return true;
  return pointToPolygonEdgeDist(click, ring) <= tolerance;
}

export type EvaluatedClick = {
  hit: boolean;
  /** Normalized distance to the POI (0..√2). */
  distance: number;
};

/** Evaluate a click against a POI: returns hit status and distance to target. */
export function evaluateClick(
  poi: POI,
  click: Vec2,
  threshold = HIT_THRESHOLD,
): EvaluatedClick {
  const d =
    poi.geometry === 'point'
      ? distance(click, poi.position)
      : pointToPolylineDist(click, poi.path);
  return { hit: d < threshold, distance: d };
}
