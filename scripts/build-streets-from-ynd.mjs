#!/usr/bin/env node
/**
 * Phase 2: build street centerline polylines from the GTA V path-node dump.
 *
 * Input (fetched by scripts/fetch-ynd-data.mjs):
 *   data/raw/ynd-json/nodes.json   # DurtyFree dump — 259 areas, ~67k nodes,
 *                                  # each node has StreetName + Position + links
 *
 * Output:
 *   src/modules/geo/data/streets.generated.ts   # POI[] with polyline geometry
 *   e2e/fixtures/geo-poi-ids.generated.ts       # all POI IDs for e2e seed
 *
 * Per street: take all nodes carrying the street's name and extract the
 * weighted diameter path (Dijkstra twice: farthest street node from an
 * arbitrary start, then farthest from that) — the natural end-to-end
 * centerline. The node graph alternates named nodes with unnamed fillers
 * and junction nodes, so traversal runs over the FULL road graph with a
 * weight penalty on segments that leave the street: short gaps bridge
 * cheaply, long detours through other roads never win. Dual carriageways
 * collapse to one side, which is fine: the hit-test tolerance (~120 m)
 * covers the parallel lanes.
 *
 * The map (`docs/clean-map.jpg`, 8192×12288) is a uniform-projection stitch
 * of Rockstar's satellite minimap at 1.024 px/m. GTA world coords map
 * linearly to image coords (mirror of src/modules/geo/logic/gtaProjection.ts):
 *
 *   norm_x = (gta_x + 4000) / 8000          # bounds x ∈ [-4000..+4000]
 *   norm_y = (8000 - gta_y) / 12000         # bounds y ∈ [-4000..+8000], flipped
 *
 * Idempotent; re-run after editing WHITELIST below.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const NODES_JSON = path.join(ROOT, 'data/raw/ynd-json/nodes.json');
const STREET_OUT = path.join(ROOT, 'src/modules/geo/data/streets.generated.ts');
const E2E_IDS_OUT = path.join(ROOT, 'e2e/fixtures/geo-poi-ids.generated.ts');

// --- GTA world → normalized image coord transform ---
const GTA_X_MIN = -4000;
const GTA_Y_MAX = 8000;
const GTA_W = 8000;
const GTA_H = 12000;

function gtaToNorm({ x, y }) {
  return {
    x: (x - GTA_X_MIN) / GTA_W,
    y: (GTA_Y_MAX - y) / GTA_H,
  };
}

/** Same 20 streets as the original pois.ts street category. `yndName` is the
 *  StreetName string used by the path-node dump (verified 1:1 present). */
const WHITELIST = [
  { id: 'street.del-perro-fwy',      yndName: 'Del Perro Fwy',      displayName: 'Del Perro Fwy',      description: 'Del Perro Freeway',          aliases: ['del perro', 'del perro freeway', 'del perro highway'] },
  { id: 'street.la-puerta-fwy',      yndName: 'La Puerta Fwy',      displayName: 'La Puerta Fwy',      description: 'La Puerta Freeway',          aliases: ['la puerta', 'puerta freeway', 'la puerta highway'] },
  { id: 'street.olympic-fwy',        yndName: 'Olympic Fwy',        displayName: 'Olympic Fwy',        description: 'Olympic Freeway',            aliases: ['olympic', 'olympic freeway', 'olympic highway'] },
  { id: 'street.elysian-fields-fwy', yndName: 'Elysian Fields Fwy', displayName: 'Elysian Fields Fwy', description: 'Elysian Fields Freeway',     aliases: ['elysian', 'elysian fields', 'elysian fwy'] },
  { id: 'street.los-santos-fwy',     yndName: 'Los Santos Freeway', displayName: 'Los Santos Fwy',     description: 'Los Santos Freeway',         aliases: ['los santos', 'ls freeway', 'ls fwy'] },
  { id: 'street.palomino-fwy',       yndName: 'Palomino Fwy',       displayName: 'Palomino Fwy',       description: 'Palomino Freeway',           aliases: ['palomino', 'palomino freeway'] },
  { id: 'street.senora-fwy',         yndName: 'Senora Fwy',         displayName: 'Senora Fwy',         description: 'Senora Freeway',             aliases: ['senora', 'senora freeway'] },
  { id: 'street.goh',                yndName: 'Great Ocean Hwy',    displayName: 'Great Ocean Hwy',    description: 'Velká pobřežní dálnice',     aliases: ['goh', 'great ocean highway', 'route 1', 'pobrezni'] },
  { id: 'street.route-68',           yndName: 'Route 68',           displayName: 'Route 68',           description: 'Hlavní silnice ve venkově',  aliases: ['68', 'r68', 'route sixty-eight'] },
  { id: 'street.vespucci-blvd',      yndName: 'Vespucci Blvd',      displayName: 'Vespucci Blvd',      description: 'Vespucci Boulevard',         aliases: ['vespucci', 'vespucci boulevard', 'vespucci bulvar'] },
  { id: 'street.san-andreas-ave',    yndName: 'San Andreas Ave',    displayName: 'San Andreas Ave',    description: 'San Andreas Avenue',         aliases: ['san andreas', 'san andreas avenue'] },
  { id: 'street.palomino-ave',       yndName: 'Palomino Ave',       displayName: 'Palomino Ave',       description: 'Palomino Avenue',            aliases: ['palomino avenue'] },
  { id: 'street.calais-ave',         yndName: 'Calais Ave',         displayName: 'Calais Ave',         description: 'Calais Avenue',              aliases: ['calais', 'calais avenue'] },
  { id: 'street.alta-street',        yndName: 'Alta St',            displayName: 'Alta Street',        description: 'Alta Street',                aliases: ['alta', 'alta st'] },
  { id: 'street.innocence-blvd',     yndName: 'Innocence Blvd',     displayName: 'Innocence Blvd',     description: 'Innocence Boulevard',        aliases: ['innocence', 'innocence boulevard', 'innocence bulvar'] },
  { id: 'street.el-rancho-blvd',     yndName: 'El Rancho Blvd',     displayName: 'El Rancho Blvd',     description: 'El Rancho Boulevard',        aliases: ['el rancho', 'rancho', 'el rancho boulevard'] },
  { id: 'street.popular-st',         yndName: 'Popular St',         displayName: 'Popular St',         description: 'Popular Street',             aliases: ['popular', 'popular street'] },
  { id: 'street.las-lagunas-blvd',   yndName: 'Las Lagunas Blvd',   displayName: 'Las Lagunas Blvd',   description: 'Las Lagunas Boulevard',      aliases: ['las lagunas', 'las lagunas boulevard', 'lagunas'] },
  { id: 'street.vinewood-blvd',      yndName: 'Vinewood Blvd',      displayName: 'Vinewood Boulevard', description: 'Vinewood Boulevard',         aliases: ['vinewood blvd', 'vinewood', 'vinewood bulvar'] },
  { id: 'street.west-eclipse-blvd',  yndName: 'West Eclipse Blvd',  displayName: 'West Eclipse Blvd',  description: 'West Eclipse Boulevard',     aliases: ['west eclipse', 'eclipse', 'west eclipse boulevard'] },
];

/**
 * Hand-traced paths (normalized image coords) for streets where the server's
 * custom map diverges from vanilla path-node data, so the vanilla nodes run
 * over what this map draws as water:
 * - West Eclipse Blvd: the vanilla corridor is submerged by the custom
 *   Vespucci-area waterfront; traced from the labeled boulevard in the art.
 * - Palomino Fwy: the vanilla coastal alignment is offshore here (custom
 *   "Eastern Islands" coastline); traced from the drawn freeway, which the
 *   art labels "Palomino Freeway".
 * Eyeballed against docs/clean-map.jpg full-res crops; quiz hit tolerance is
 * 0.015, traces are accurate to ~0.004.
 */
const MANUAL_PATHS = {
  'street.palomino-fwy': [
    { x: 0.6000, y: 0.7000 },
    { x: 0.6580, y: 0.6860 },
    { x: 0.6830, y: 0.6780 },
    { x: 0.7220, y: 0.6730 },
    { x: 0.7370, y: 0.6660 },
    { x: 0.7350, y: 0.6520 },
    { x: 0.7270, y: 0.6420 },
    { x: 0.7290, y: 0.6290 },
    { x: 0.7370, y: 0.6140 },
    { x: 0.7440, y: 0.6000 },
    { x: 0.7470, y: 0.5830 },
    { x: 0.7450, y: 0.5670 },
    { x: 0.7400, y: 0.5530 },
  ],
  'street.west-eclipse-blvd': [
    { x: 0.2134, y: 0.6471 },
    { x: 0.2208, y: 0.6441 },
    { x: 0.2294, y: 0.6420 },
    { x: 0.2405, y: 0.6395 },
    { x: 0.2515, y: 0.6395 },
    { x: 0.2638, y: 0.6421 },
    { x: 0.2712, y: 0.6458 },
    { x: 0.2766, y: 0.6494 },
  ],
};

// ---------- graph helpers ----------

const keyOf = (p) => `${p.X.toFixed(2)}|${p.Y.toFixed(2)}|${p.Z.toFixed(2)}`;

/** Cost multiplier for edges that leave the target street. High enough that a
 *  detour through other roads never beats following the street itself, low
 *  enough that bridging a junction or an unnamed filler node stays cheap. */
const OFF_STREET_PENALTY = 8;

/** Min-heap keyed by numeric priority. */
class MinHeap {
  constructor() { this.items = []; }
  push(prio, value) {
    const a = this.items;
    a.push([prio, value]);
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (a[parent][0] <= a[i][0]) break;
      [a[parent], a[i]] = [a[i], a[parent]];
      i = parent;
    }
  }
  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
  get size() { return this.items.length; }
}

/**
 * Penalized Dijkstra over the full road graph from `startKey`. Edges where
 * both endpoints carry `streetName` cost their euclidean length; all other
 * edges cost length × OFF_STREET_PENALTY.
 */
function dijkstra(graph, streetName, startKey) {
  const { pos, adj, name } = graph;
  const dist = new Map([[startKey, 0]]);
  const net = new Map([[startKey, 0]]);
  const prev = new Map();
  const done = new Set();
  const heap = new MinHeap();
  heap.push(0, startKey);
  while (heap.size > 0) {
    const [d, u] = heap.pop();
    if (done.has(u)) continue;
    done.add(u);
    const pu = pos.get(u);
    const onStreetU = name.get(u) === streetName;
    for (const v of adj.get(u) ?? []) {
      if (done.has(v)) continue;
      const pv = pos.get(v);
      const len = Math.hypot(pu.X - pv.X, pu.Y - pv.Y, pu.Z - pv.Z);
      const onStreet = onStreetU && name.get(v) === streetName;
      const nd = d + len * (onStreet ? 1 : OFF_STREET_PENALTY);
      if (nd < (dist.get(v) ?? Infinity)) {
        dist.set(v, nd);
        // Net on-street gain along the chosen route — used for endpoint
        // selection. Off-street stretches subtract at a reduced rate: enough
        // that a long bridge to a few stray same-named nodes scores worse
        // than staying put, gentle enough that streets whose nodes alternate
        // densely with unnamed fillers still extend end-to-end.
        net.set(v, (net.get(u) ?? 0) + (onStreet ? len : -0.3 * len));
        prev.set(v, u);
        heap.push(nd, v);
      }
    }
  }
  return { dist, net, prev };
}

/**
 * Spatial clusters of street nodes (single-linkage, 300 m grid). Streets are
 * contiguous chains of nodes ~10–20 m apart, but long interchange stretches
 * may carry no street name, splitting one road into several clusters — so
 * callers keep every cluster above a size floor and let the penalized
 * Dijkstra bridge between them. Tiny clusters (stray same-named nodes
 * elsewhere on the map) fall off.
 */
function spatialClusters(graph, keys) {
  const CELL = 300;
  const cells = new Map(); // "cx|cy" → keys
  const cellOf = (k) => {
    const p = graph.pos.get(k);
    return [Math.floor(p.X / CELL), Math.floor(p.Y / CELL)];
  };
  for (const k of keys) {
    const [cx, cy] = cellOf(k);
    const ck = `${cx}|${cy}`;
    let bucket = cells.get(ck);
    if (!bucket) { bucket = []; cells.set(ck, bucket); }
    bucket.push(k);
  }
  const seen = new Set();
  const clusters = [];
  for (const k of keys) {
    if (seen.has(k)) continue;
    const comp = [k];
    seen.add(k);
    for (let i = 0; i < comp.length; i++) {
      const p = graph.pos.get(comp[i]);
      const [cx, cy] = cellOf(comp[i]);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (const n of cells.get(`${cx + dx}|${cy + dy}`) ?? []) {
            if (seen.has(n)) continue;
            const q = graph.pos.get(n);
            if (Math.hypot(p.X - q.X, p.Y - q.Y) <= CELL) {
              seen.add(n);
              comp.push(n);
            }
          }
        }
      }
    }
    clusters.push(comp);
  }
  clusters.sort((a, b) => b.length - a.length);
  return clusters;
}

/** Fraction of the key-path's length whose segments stay on the street. */
function onStreetFraction(graph, streetName, keyPath) {
  let on = 0;
  let total = 0;
  for (let i = 0; i < keyPath.length - 1; i++) {
    const a = graph.pos.get(keyPath[i]);
    const b = graph.pos.get(keyPath[i + 1]);
    const len = Math.hypot(a.X - b.X, a.Y - b.Y);
    total += len;
    if (
      graph.name.get(keyPath[i]) === streetName &&
      graph.name.get(keyPath[i + 1]) === streetName
    ) {
      on += len;
    }
  }
  return total === 0 ? 1 : on / total;
}

function farthestStreetNode(net, streetKeys) {
  let bestK = null;
  let bestD = -Infinity;
  for (const k of streetKeys) {
    const d = net.get(k);
    if (d !== undefined && d > bestD) { bestD = d; bestK = k; }
  }
  return { key: bestK, d: bestD };
}

/**
 * End-to-end centerline: double-Dijkstra diameter heuristic, with endpoints
 * scored by NET on-street gain (see dijkstra) rather than raw distance.
 */
function diameterPath(graph, streetName, streetKeys) {
  const remaining = new Set(streetKeys);
  let bestPath = [];
  let bestScore = -Infinity;
  while (remaining.size > 0) {
    const start = remaining.values().next().value;
    const r1 = dijkstra(graph, streetName, start);
    // Mark every street node reachable from `start` as handled — one
    // diameter attempt per connected cluster.
    const reachable = [...remaining].filter((k) => r1.dist.has(k));
    for (const k of reachable) remaining.delete(k);
    if (reachable.length < 2) continue;
    const u = farthestStreetNode(r1.net, reachable).key;
    const r2 = dijkstra(graph, streetName, u);
    const { key: v, d } = farthestStreetNode(r2.net, reachable);
    if (d > bestScore) {
      const p = [];
      for (let k = v; k !== undefined; k = r2.prev.get(k)) p.push(k);
      bestScore = d;
      bestPath = p; // u→v order; direction is irrelevant
    }
  }
  return { path: bestPath, lengthM: bestScore };
}

// ---------- polyline helpers (normalized space) ----------

function perpDist(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Douglas–Peucker simplification. */
function simplify(pts, eps) {
  if (pts.length <= 2) return pts;
  let maxD = -1;
  let idx = -1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= eps) return [pts[0], pts[pts.length - 1]];
  const left = simplify(pts.slice(0, idx + 1), eps);
  const right = simplify(pts.slice(idx), eps);
  return [...left.slice(0, -1), ...right];
}

/** Arc-length midpoint of an open path. */
function arcMidpoint(pts) {
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  }
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    if (acc + seg >= total / 2) {
      const t = seg === 0 ? 0 : (total / 2 - acc) / seg;
      return {
        x: pts[i].x + t * (pts[i + 1].x - pts[i].x),
        y: pts[i].y + t * (pts[i + 1].y - pts[i].y),
      };
    }
    acc += seg;
  }
  return pts[Math.floor(pts.length / 2)];
}

const SIMPLIFY_EPS = 0.0012; // ≈ 10 px ≈ 10 m — keeps curves, drops lane jitter

// ---------- visible-land trim ----------
//
// The satellite art (docs/clean-map.jpg) omits part of the real game world —
// notably the southern half of the Port of LS (Elysian Island/Terminal). The
// quiz is played on the image, so centerline tails that run over visibly open
// water are trimmed. Only TAILS: interior water crossings are bridges, whose
// decks are drawn in the art (road-grey pixels), so they never classify as sea.

const SEA_W = 4096;
const SEA_H = 6144;

async function loadSeaMask() {
  const { data } = await sharp(path.join(ROOT, 'docs/clean-map.jpg'))
    .resize(SEA_W, SEA_H)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return (p) => {
    const xi = Math.max(0, Math.min(SEA_W - 1, Math.round(p.x * (SEA_W - 1))));
    const yi = Math.max(0, Math.min(SEA_H - 1, Math.round(p.y * (SEA_H - 1))));
    const i = (yi * SEA_W + xi) * 3;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    return b > r + 40 && b > g + 25;
  };
}

/**
 * Longest contiguous run of path points over visible land. Short sea gaps
 * (< GAP points ≈ 150 m of node spacing) are tolerated so that bridges whose
 * deck art reads slightly blue, or single misclassified samples, don't split
 * a run. Whole stretches over open water (missing-land areas of the art,
 * custom-map differences) are cut.
 */
function longestLandRun(pts, isSea) {
  const GAP = 10;
  let bestStart = 0;
  let bestEnd = -1; // inclusive
  let runStart = -1;
  let lastLand = -1;
  for (let i = 0; i <= pts.length; i++) {
    const sea = i === pts.length ? true : isSea(pts[i]);
    if (!sea) {
      if (runStart === -1) runStart = i;
      lastLand = i;
    } else if (runStart !== -1 && (i - lastLand >= GAP || i === pts.length)) {
      if (lastLand - runStart > bestEnd - bestStart) {
        bestStart = runStart;
        bestEnd = lastLand;
      }
      runStart = -1;
    }
  }
  if (bestEnd < bestStart) return [];
  return pts.slice(bestStart, bestEnd + 1);
}

async function main() {
  const raw = JSON.parse(await fs.readFile(NODES_JSON, 'utf8'));
  const isSea = await loadSeaMask();

  // Full road graph: every node, undirected edges from ConnectedNodes.
  const pos = new Map(); // key → Position
  const name = new Map(); // key → StreetName
  const adj = new Map(); // key → Set<key>
  const edge = (a, b) => {
    let ea = adj.get(a);
    if (!ea) { ea = new Set(); adj.set(a, ea); }
    ea.add(b);
    let eb = adj.get(b);
    if (!eb) { eb = new Set(); adj.set(b, eb); }
    eb.add(a);
  };
  const water = new Set(); // boat-route nodes — never street geometry
  for (const area of raw) {
    for (const node of area.Nodes) {
      const k = keyOf(node.Position);
      pos.set(k, node.Position);
      name.set(k, node.StreetName);
      if (node.IsOnWater) water.add(k);
      for (const link of node.ConnectedNodes ?? []) {
        const ln = link.Node ?? link;
        if (!ln?.Position) continue;
        const lk = keyOf(ln.Position);
        if (!pos.has(lk)) {
          pos.set(lk, ln.Position);
          name.set(lk, ln.StreetName);
        }
        edge(k, lk);
      }
    }
  }
  const graph = { pos, adj, name };
  console.log(`Road graph: ${pos.size} nodes`);

  const keysByStreet = new Map(WHITELIST.map((w) => [w.yndName, []]));
  for (const [k, n] of name) {
    if (water.has(k)) continue;
    const bucket = keysByStreet.get(n);
    if (bucket) bucket.push(k);
  }

  const emitted = [];
  for (const w of WHITELIST) {
    const manual = MANUAL_PATHS[w.id];
    if (manual) {
      emitted.push({ ...w, path: manual, centroid: arcMidpoint(manual) });
      console.log(`${w.id}: manual path (${manual.length} pts)`);
      continue;
    }
    const allKeys = keysByStreet.get(w.yndName);
    if (allKeys.length === 0) {
      console.error(`MISS: ${w.yndName} — no nodes`);
      continue;
    }
    const clusters = spatialClusters(graph, allKeys);
    const floor = Math.max(15, Math.round(allKeys.length * 0.05));
    const kept = clusters.filter((c) => c.length >= floor);
    const dropped = allKeys.length - kept.reduce((n, c) => n + c.length, 0);
    if (dropped > 0) {
      console.log(`  (${w.yndName}: dropped ${dropped} outlier nodes in ${clusters.length - kept.length} small clusters)`);
    }
    let streetKeys = kept.flat();
    let { path: keyPath, lengthM } = diameterPath(graph, w.yndName, streetKeys);
    const frac = onStreetFraction(graph, w.yndName, keyPath);
    if (frac < 0.6 && kept.length > 1) {
      // Bridging wandered too far off the street — distant same-named
      // segments are a different road. Use the dominant cluster only.
      console.log(`  (${w.yndName}: on-street fraction ${frac.toFixed(2)} — falling back to largest cluster)`);
      streetKeys = kept[0];
      ({ path: keyPath, lengthM } = diameterPath(graph, w.yndName, streetKeys));
    }
    const gtaPts = keyPath.map((k) => {
      const p = pos.get(k);
      return { x: p.X, y: p.Y };
    });
    const normPts = longestLandRun(gtaPts.map(gtaToNorm), isSea);
    if (normPts.length < 2) {
      console.error(`MISS: ${w.yndName} — entire path over visible water`);
      continue;
    }
    const simplified = simplify(normPts, SIMPLIFY_EPS);
    const centroid = arcMidpoint(simplified);
    emitted.push({ ...w, path: simplified, centroid });
    console.log(
      `${w.id}: ${streetKeys.length} nodes → net-score ${Math.round(lengthM)} m, ` +
      `${keyPath.length} pts → ${simplified.length} after simplify`,
    );
  }

  const fmtVec = (p) => `{ x: ${p.x.toFixed(4)}, y: ${p.y.toFixed(4)} }`;

  const tsLines = [
    '// AUTO-GENERATED by scripts/build-streets-from-ynd.mjs — DO NOT EDIT directly.',
    '// Centerlines extracted from the GTA V path-node dump (DurtyFree) — the',
    '// weighted diameter path of each street’s node graph, projected onto the',
    '// uniform-projection satellite map (see scripts/extract-minimap.py).',
    '// Click-on-street validation uses perpendicular distance to these paths.',
    `// Generated: ${new Date().toISOString()}`,
    "import type { POI } from './types';",
    '',
    'export const STREETS: readonly POI[] = [',
  ];
  for (const e of emitted) {
    tsLines.push('  {');
    tsLines.push(`    id: ${JSON.stringify(e.id)},`);
    tsLines.push(`    category: "street",`);
    tsLines.push(`    geometry: "polyline",`);
    tsLines.push(`    name: ${JSON.stringify(e.displayName)},`);
    tsLines.push(`    description: ${JSON.stringify(e.description)},`);
    tsLines.push(`    aliases: ${JSON.stringify(e.aliases)},`);
    tsLines.push(`    centroid: ${fmtVec(e.centroid)},`);
    tsLines.push('    path: [');
    for (const p of e.path) tsLines.push(`      ${fmtVec(p)},`);
    tsLines.push('    ],');
    tsLines.push('  },');
  }
  tsLines.push('];');
  tsLines.push('');
  await fs.writeFile(STREET_OUT, tsLines.join('\n'), 'utf8');
  console.log(`Wrote ${STREET_OUT}`);

  const nonStreetIds = [
    'ammu.downtown', 'ems.central', 'fire.hq',
    'landmark.arcadius', 'landmark.casino', 'landmark.chumash', 'landmark.divadlo',
    'landmark.doky', 'landmark.fort-zancudo', 'landmark.g6', 'landmark.grapeseed',
    'landmark.gym-u-plaze', 'landmark.hlavni-banka', 'landmark.hrbitov',
    'landmark.hriste-golf', 'landmark.industrialni-zona', 'landmark.klenotnictvi',
    'landmark.legion-square', 'landmark.letiste-sandy', 'landmark.life-invader',
    'landmark.lsc', 'landmark.lsia', 'landmark.maze-bank-arena',
    'landmark.maze-bank-tower', 'landmark.mega-mall', 'landmark.mirror-park',
    'landmark.molo', 'landmark.north-chumash', 'landmark.observator',
    'landmark.paleto-bay', 'landmark.pdm', 'landmark.pillbox',
    'landmark.pink-cage-motel', 'landmark.posta', 'landmark.power-station',
    'landmark.prehrada', 'landmark.radnice', 'landmark.rockford-plaza',
    'landmark.ropne-vrty', 'landmark.sandy-shores', 'landmark.vetrne-elektrarny',
    'landmark.veznice', 'landmark.vinewood-sign', 'landmark.vinice',
    'landmark.vodni-mesto', 'landmark.weazel', 'pd.vespucci', 'pd.vinewood',
  ];
  const allIds = [...nonStreetIds, ...emitted.map((e) => e.id)];
  const idsLines = [
    '// AUTO-GENERATED by scripts/build-streets-from-ynd.mjs — DO NOT EDIT.',
    `// Generated: ${new Date().toISOString()}`,
    '',
    'export const GEO_POI_IDS = [',
    ...allIds.map((id) => `  ${JSON.stringify(id)},`),
    '] as const;',
    '',
  ];
  await fs.writeFile(E2E_IDS_OUT, idsLines.join('\n'), 'utf8');
  console.log(`Wrote ${E2E_IDS_OUT} (${allIds.length} IDs)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
