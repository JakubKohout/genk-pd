import type { POI, TileMeta, Vec2 } from '../data/types';
import { toLatLng } from './coords';

/**
 * Arc-length midpoint of an open polyline — the point that lies at half of the
 * total path length, measured along the segments. Falls back to vertex mean for
 * degenerate (single-point or zero-length) paths.
 */
export function polylineCentroid(path: readonly Vec2[]): Vec2 {
  if (path.length === 0) return { x: 0, y: 0 };
  if (path.length === 1) return { x: path[0]!.x, y: path[0]!.y };
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  if (total < 1e-12) {
    const sum = path.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 },
    );
    return { x: sum.x / path.length, y: sum.y / path.length };
  }
  const target = total / 2;
  let walked = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (walked + segLen >= target) {
      const t = (target - walked) / segLen;
      return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    }
    walked += segLen;
  }
  const last = path[path.length - 1]!;
  return { x: last.x, y: last.y };
}

/**
 * Boundary ring of a point POI's click tolerance, as Leaflet CRS.Simple [lat,lng]
 * tuples ready for a <Polygon>. The hit-test measures distance in normalized
 * *square* space (Gotcha 32), so the ring is a circle of `radius` there; once
 * mapped through toLatLng onto the portrait pixel grid it becomes an ellipse
 * (taller than wide), which is what the click region actually looks like.
 */
export function toleranceRing(
  center: Vec2,
  radius: number,
  meta: TileMeta,
  segments = 64,
): [number, number][] {
  const ring: [number, number][] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * 2 * Math.PI;
    ring.push(
      toLatLng(
        { x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) },
        meta,
      ),
    );
  }
  return ring;
}

/**
 * Pretty-print a number as TS source: `0.347` (3 decimals, no trailing zeros).
 */
function formatCoord(n: number): string {
  return parseFloat(n.toFixed(3)).toString();
}

/**
 * Build a TS literal string for the POIS array after drag-tuning positions.
 * Output is paste-ready into pois.ts.
 */
export function formatPoisTs(pois: readonly POI[]): string {
  const lines: string[] = [];
  for (const p of pois) {
    lines.push(`  {`);
    lines.push(`    id: ${JSON.stringify(p.id)},`);
    if (p.size) lines.push(`    size: ${JSON.stringify(p.size)},`);
    lines.push(`    category: ${JSON.stringify(p.category)},`);
    lines.push(`    geometry: ${JSON.stringify(p.geometry)},`);
    if (p.geometry === 'point') {
      lines.push(
        `    position: { x: ${formatCoord(p.position.x)}, y: ${formatCoord(p.position.y)} },`,
      );
    } else {
      lines.push(`    path: [`);
      for (const pt of p.path) {
        lines.push(`      { x: ${formatCoord(pt.x)}, y: ${formatCoord(pt.y)} },`);
      }
      lines.push(`    ],`);
      lines.push(
        `    centroid: { x: ${formatCoord(p.centroid.x)}, y: ${formatCoord(p.centroid.y)} },`,
      );
    }
    lines.push(`    name: ${JSON.stringify(p.name)},`);
    lines.push(`    description: ${JSON.stringify(p.description)},`);
    lines.push(`    aliases: ${JSON.stringify(p.aliases)},`);
    lines.push(`  },`);
  }
  return lines.join('\n');
}
