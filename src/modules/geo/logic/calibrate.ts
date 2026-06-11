import type { POI, Vec2 } from '../data/types';

export type CalibrationPair = {
  poiId: string;
  /** Original (pre-calibration) coords as stored in pois.ts. */
  before: Vec2;
  /** User-clicked target position. */
  after: Vec2;
};

export type AffineTransform = {
  ax: number;
  bx: number;
  ay: number;
  by: number;
};

/**
 * Fit a 4-parameter affine transform (scale + translate per axis, no rotation/shear)
 * to the given (before → after) pairs using ordinary least squares.
 *
 * x_new = ax * x_old + bx
 * y_new = ay * y_old + by
 *
 * Requires at least 2 pairs with non-degenerate x and y.
 */
export function fitAffine(pairs: readonly CalibrationPair[]): AffineTransform {
  if (pairs.length < 2) {
    throw new Error('fitAffine: need at least 2 calibration pairs');
  }
  const N = pairs.length;
  let sumXo = 0,
    sumYo = 0,
    sumXn = 0,
    sumYn = 0,
    sumXoXn = 0,
    sumYoYn = 0,
    sumXoSq = 0,
    sumYoSq = 0;
  for (const p of pairs) {
    sumXo += p.before.x;
    sumYo += p.before.y;
    sumXn += p.after.x;
    sumYn += p.after.y;
    sumXoXn += p.before.x * p.after.x;
    sumYoYn += p.before.y * p.after.y;
    sumXoSq += p.before.x * p.before.x;
    sumYoSq += p.before.y * p.before.y;
  }
  const denomX = N * sumXoSq - sumXo * sumXo;
  const denomY = N * sumYoSq - sumYo * sumYo;
  if (Math.abs(denomX) < 1e-12 || Math.abs(denomY) < 1e-12) {
    throw new Error('fitAffine: degenerate input (collinear points on an axis)');
  }
  const ax = (N * sumXoXn - sumXo * sumXn) / denomX;
  const bx = (sumXn - ax * sumXo) / N;
  const ay = (N * sumYoYn - sumYo * sumYn) / denomY;
  const by = (sumYn - ay * sumYo) / N;
  return { ax, bx, ay, by };
}

export function applyAffine(p: Vec2, t: AffineTransform): Vec2 {
  return { x: t.ax * p.x + t.bx, y: t.ay * p.y + t.by };
}

/**
 * Full 6-parameter affine transform — handles translation, scale, rotation and
 * shear:
 *   x_new = m00 * x_old + m01 * y_old + m02
 *   y_new = m10 * x_old + m11 * y_old + m12
 *
 * Use when the simpler 4-param fit leaves systematic residuals (e.g. the source
 * map is rotated or skewed relative to the target).
 */
export type Affine6Transform = {
  m00: number;
  m01: number;
  m02: number;
  m10: number;
  m11: number;
  m12: number;
};

export function applyAffine6(p: Vec2, t: Affine6Transform): Vec2 {
  return {
    x: t.m00 * p.x + t.m01 * p.y + t.m02,
    y: t.m10 * p.x + t.m11 * p.y + t.m12,
  };
}

/** Fit 6-param affine using ordinary least squares; ≥3 pairs required. */
export function fitAffine6(pairs: readonly CalibrationPair[]): Affine6Transform {
  if (pairs.length < 3) {
    throw new Error('fitAffine6: need at least 3 calibration pairs');
  }
  let s_xx = 0,
    s_xy = 0,
    s_x = 0,
    s_yy = 0,
    s_y = 0,
    s_x_xn = 0,
    s_y_xn = 0,
    s_xn = 0,
    s_x_yn = 0,
    s_y_yn = 0,
    s_yn = 0;
  const N = pairs.length;
  for (const p of pairs) {
    const xo = p.before.x;
    const yo = p.before.y;
    const xn = p.after.x;
    const yn = p.after.y;
    s_xx += xo * xo;
    s_xy += xo * yo;
    s_x += xo;
    s_yy += yo * yo;
    s_y += yo;
    s_x_xn += xo * xn;
    s_y_xn += yo * xn;
    s_xn += xn;
    s_x_yn += xo * yn;
    s_y_yn += yo * yn;
    s_yn += yn;
  }
  const A: number[][] = [
    [s_xx, s_xy, s_x],
    [s_xy, s_yy, s_y],
    [s_x, s_y, N],
  ];
  const [m00, m01, m02] = solve3x3(A, [s_x_xn, s_y_xn, s_xn]);
  const [m10, m11, m12] = solve3x3(A, [s_x_yn, s_y_yn, s_yn]);
  return { m00, m01, m02, m10, m11, m12 };
}

function solve3x3(A: number[][], b: number[]): [number, number, number] {
  const d = det3(A);
  if (Math.abs(d) < 1e-12) {
    throw new Error('fitAffine6: degenerate input (collinear anchors)');
  }
  const Ax = [
    [b[0]!, A[0]![1]!, A[0]![2]!],
    [b[1]!, A[1]![1]!, A[1]![2]!],
    [b[2]!, A[2]![1]!, A[2]![2]!],
  ];
  const Ay = [
    [A[0]![0]!, b[0]!, A[0]![2]!],
    [A[1]![0]!, b[1]!, A[1]![2]!],
    [A[2]![0]!, b[2]!, A[2]![2]!],
  ];
  const Az = [
    [A[0]![0]!, A[0]![1]!, b[0]!],
    [A[1]![0]!, A[1]![1]!, b[1]!],
    [A[2]![0]!, A[2]![1]!, b[2]!],
  ];
  return [det3(Ax) / d, det3(Ay) / d, det3(Az) / d];
}

function det3(m: number[][]): number {
  return (
    m[0]![0]! * (m[1]![1]! * m[2]![2]! - m[1]![2]! * m[2]![1]!) -
    m[0]![1]! * (m[1]![0]! * m[2]![2]! - m[1]![2]! * m[2]![0]!) +
    m[0]![2]! * (m[1]![0]! * m[2]![1]! - m[1]![1]! * m[2]![0]!)
  );
}

/**
 * Thin-plate spline (TPS) transform — interpolates *exactly* through every
 * control point. Use when the relationship between source and target maps has
 * non-linear local distortion that affine cannot capture (e.g. western coast is
 * stretched differently than central area in the source projection).
 *
 * f(p) = a0 + ax*p.x + ay*p.y + Σ w_i * φ(||p - p_i||)
 * where φ(r) = r² log(r) is the thin-plate radial basis function.
 */
export type TpsTransform = {
  controlPoints: Vec2[];
  /** weights for X output: length N+3 (last 3 = a0, ax, ay) */
  wX: number[];
  wY: number[];
};

function tpsPhi(r: number): number {
  if (r < 1e-12) return 0;
  return r * r * Math.log(r);
}

function vecDist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function fitTps(pairs: readonly CalibrationPair[]): TpsTransform {
  const N = pairs.length;
  if (N < 3) {
    throw new Error('fitTps: need at least 3 control points');
  }
  // Build (N+3) × (N+3) augmented matrix M with RHS attached as last column ×2 (one per axis).
  // Layout: rows 0..N-1 are TPS rows, rows N..N+2 are the constraint rows.
  const M: number[][] = Array.from({ length: N + 3 }, () =>
    Array(N + 3).fill(0),
  );
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      M[i]![j] = tpsPhi(vecDist(pairs[i]!.before, pairs[j]!.before));
    }
    M[i]![N] = 1;
    M[i]![N + 1] = pairs[i]!.before.x;
    M[i]![N + 2] = pairs[i]!.before.y;
    M[N]![i] = 1;
    M[N + 1]![i] = pairs[i]!.before.x;
    M[N + 2]![i] = pairs[i]!.before.y;
  }
  const rhsX = pairs.map((p) => p.after.x).concat([0, 0, 0]);
  const rhsY = pairs.map((p) => p.after.y).concat([0, 0, 0]);
  const wX = solveLinearSystem(M, rhsX);
  const wY = solveLinearSystem(M, rhsY);
  return { controlPoints: pairs.map((p) => p.before), wX, wY };
}

export function applyTps(p: Vec2, t: TpsTransform): Vec2 {
  const N = t.controlPoints.length;
  let outX = t.wX[N]! + t.wX[N + 1]! * p.x + t.wX[N + 2]! * p.y;
  let outY = t.wY[N]! + t.wY[N + 1]! * p.x + t.wY[N + 2]! * p.y;
  for (let i = 0; i < N; i++) {
    const ph = tpsPhi(vecDist(p, t.controlPoints[i]!));
    outX += t.wX[i]! * ph;
    outY += t.wY[i]! * ph;
  }
  return { x: outX, y: outY };
}

/** Gaussian elimination with partial pivoting. Mutates a copy of the input. */
function solveLinearSystem(A: readonly number[][], b: readonly number[]): number[] {
  const n = A.length;
  // Augmented matrix: copy A and append b as last column.
  const M: number[][] = A.map((row, i) => [...row, b[i]!]);
  for (let i = 0; i < n; i++) {
    // Partial pivot.
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k]![i]!) > Math.abs(M[maxRow]![i]!)) maxRow = k;
    }
    if (maxRow !== i) {
      const tmp = M[i]!;
      M[i] = M[maxRow]!;
      M[maxRow] = tmp;
    }
    if (Math.abs(M[i]![i]!) < 1e-12) {
      throw new Error('solveLinearSystem: singular matrix');
    }
    // Eliminate column below the pivot.
    for (let k = i + 1; k < n; k++) {
      const factor = M[k]![i]! / M[i]![i]!;
      for (let j = i; j <= n; j++) {
        M[k]![j]! -= factor * M[i]![j]!;
      }
    }
  }
  // Back-substitute.
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i]![n]!;
    for (let j = i + 1; j < n; j++) {
      s -= M[i]![j]! * x[j]!;
    }
    x[i] = s / M[i]![i]!;
  }
  return x;
}

export function calibratePoi(poi: POI, t: AffineTransform): POI {
  if (poi.geometry === 'point') {
    return { ...poi, position: applyAffine(poi.position, t) };
  }
  if (poi.geometry === 'polyline') {
    const newPath = poi.path.map((pt) => applyAffine(pt, t));
    return { ...poi, path: newPath, centroid: polylineCentroid(newPath) };
  }
  // poi.geometry === 'polygon'
  const newRings = poi.rings.map((ring) => ring.map((pt) => applyAffine(pt, t)));
  const outer = newRings[0] ?? [];
  let cx = 0;
  let cy = 0;
  for (const pt of outer) {
    cx += pt.x;
    cy += pt.y;
  }
  const centroid: Vec2 =
    outer.length > 0 ? { x: cx / outer.length, y: cy / outer.length } : poi.centroid;
  return { ...poi, rings: newRings, centroid };
}

/**
 * Approximate a polygon ring with a centerline polyline via PCA + along-axis
 * binning. Mirrors `polygonToCenterline` in scripts/import-foxxite-streets.mjs.
 * Foxxite street polygons represent street zones (sidewalks + asphalt context),
 * not the road itself. PCA's major axis is the along-road direction; binning
 * vertices along that axis and averaging within each bin produces points near
 * the road centerline.
 */
export function polygonToCenterline(
  ring: readonly Vec2[],
  numBins = 8,
): Vec2[] {
  const uniq =
    ring.length > 1 &&
    ring[0]!.x === ring[ring.length - 1]!.x &&
    ring[0]!.y === ring[ring.length - 1]!.y
      ? ring.slice(0, -1)
      : ring.slice();
  const n = uniq.length;
  if (n < 2) return uniq.map((p) => ({ x: p.x, y: p.y }));
  let mx = 0, my = 0;
  for (const p of uniq) { mx += p.x; my += p.y; }
  mx /= n; my /= n;
  let cxx = 0, cxy = 0, cyy = 0;
  for (const p of uniq) {
    const dx = p.x - mx, dy = p.y - my;
    cxx += dx * dx; cxy += dx * dy; cyy += dy * dy;
  }
  cxx /= n; cxy /= n; cyy /= n;
  const tr = cxx + cyy;
  const det = cxx * cyy - cxy * cxy;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 + disc;
  let vx: number, vy: number;
  if (Math.abs(cxy) > 1e-10) {
    vx = l1 - cyy;
    vy = cxy;
  } else {
    vx = cxx >= cyy ? 1 : 0;
    vy = cxx >= cyy ? 0 : 1;
  }
  const vn = Math.hypot(vx, vy) || 1;
  const major = { x: vx / vn, y: vy / vn };
  const projected = uniq.map((p) => ({
    pt: p,
    t: (p.x - mx) * major.x + (p.y - my) * major.y,
  }));
  let tMin = Infinity, tMax = -Infinity;
  for (const q of projected) {
    if (q.t < tMin) tMin = q.t;
    if (q.t > tMax) tMax = q.t;
  }
  if (tMax - tMin < 1e-9) return [{ x: mx, y: my }];
  const bins: { pt: Vec2; t: number }[][] = Array.from(
    { length: numBins },
    () => [],
  );
  for (const q of projected) {
    const f = (q.t - tMin) / (tMax - tMin);
    let idx = Math.floor(f * numBins);
    if (idx >= numBins) idx = numBins - 1;
    bins[idx]!.push(q);
  }
  const centerline: { x: number; y: number; t: number }[] = [];
  for (const bin of bins) {
    if (bin.length === 0) continue;
    let sx = 0, sy = 0, st = 0;
    for (const q of bin) { sx += q.pt.x; sy += q.pt.y; st += q.t; }
    centerline.push({
      x: sx / bin.length,
      y: sy / bin.length,
      t: st / bin.length,
    });
  }
  centerline.sort((a, b) => a.t - b.t);
  return centerline.map(({ x, y }) => ({ x, y }));
}

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
 * Pretty-print a number as TS source: `0.347` (3 decimals, no trailing zeros).
 */
export function formatCoord(n: number): string {
  return parseFloat(n.toFixed(3)).toString();
}

/**
 * Build a TS literal string for the POIS array after applying transform.
 * Output is paste-ready into pois.ts.
 */
export function formatPoisTs(pois: readonly POI[]): string {
  const lines: string[] = [];
  for (const p of pois) {
    lines.push(`  {`);
    lines.push(`    id: ${JSON.stringify(p.id)},`);
    lines.push(`    category: ${JSON.stringify(p.category)},`);
    lines.push(`    geometry: ${JSON.stringify(p.geometry)},`);
    if (p.geometry === 'point') {
      lines.push(
        `    position: { x: ${formatCoord(p.position.x)}, y: ${formatCoord(p.position.y)} },`,
      );
    } else if (p.geometry === 'polyline') {
      lines.push(`    path: [`);
      for (const pt of p.path) {
        lines.push(`      { x: ${formatCoord(pt.x)}, y: ${formatCoord(pt.y)} },`);
      }
      lines.push(`    ],`);
      lines.push(
        `    centroid: { x: ${formatCoord(p.centroid.x)}, y: ${formatCoord(p.centroid.y)} },`,
      );
    } else {
      // p.geometry === 'polygon'
      lines.push(`    rings: [`);
      for (const ring of p.rings) {
        lines.push(`      [`);
        for (const pt of ring) {
          lines.push(`        { x: ${formatCoord(pt.x)}, y: ${formatCoord(pt.y)} },`);
        }
        lines.push(`      ],`);
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
