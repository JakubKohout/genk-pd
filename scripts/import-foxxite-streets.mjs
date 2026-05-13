#!/usr/bin/env node
/**
 * Import street polygons from Foxxite/GTAV-Geo-Json.
 *
 * Usage:  node scripts/import-foxxite-streets.mjs
 *
 * Outputs:
 *   docs/foxxite-data/raw.geojson              # archived source (commit)
 *   docs/foxxite-data/scraped-at.txt           # timestamp + URL marker
 *   src/modules/geo/data/streetPolygons.generated.ts
 *   e2e/fixtures/geo-poi-ids.generated.ts
 *
 * Idempotent. Re-run after editing WHITELIST below.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE_URL =
  'https://raw.githubusercontent.com/Foxxite/GTAV-Geo-Json/master/street.geojson';
const FOXXITE_DIR = path.join(ROOT, 'docs', 'foxxite-data');
const STREET_OUT = path.join(ROOT, 'src/modules/geo/data/streetPolygons.generated.ts');
const E2E_IDS_OUT = path.join(ROOT, 'e2e/fixtures/geo-poi-ids.generated.ts');

/** Whitelist taken 1:1 from the current pois.ts (street category, 20 entries). */
const WHITELIST = [
  { id: 'street.del-perro-fwy',      foxxiteName: 'Del Perro Fwy',      displayName: 'Del Perro Fwy',      description: 'Del Perro Freeway',          aliases: ['del perro', 'del perro freeway', 'del perro highway'] },
  { id: 'street.la-puerta-fwy',      foxxiteName: 'La Puerta Fwy',      displayName: 'La Puerta Fwy',      description: 'La Puerta Freeway',          aliases: ['la puerta', 'puerta freeway', 'la puerta highway'] },
  { id: 'street.olympic-fwy',        foxxiteName: 'Olympic Fwy',        displayName: 'Olympic Fwy',        description: 'Olympic Freeway',            aliases: ['olympic', 'olympic freeway', 'olympic highway'] },
  { id: 'street.elysian-fields-fwy', foxxiteName: 'Elysian Fields Fwy', displayName: 'Elysian Fields Fwy', description: 'Elysian Fields Freeway',     aliases: ['elysian', 'elysian fields', 'elysian fwy'] },
  { id: 'street.los-santos-fwy',     foxxiteName: 'Los Santos Freeway', displayName: 'Los Santos Fwy',     description: 'Los Santos Freeway',         aliases: ['los santos', 'ls freeway', 'ls fwy'] },
  { id: 'street.palomino-fwy',       foxxiteName: 'Palomino Fwy',       displayName: 'Palomino Fwy',       description: 'Palomino Freeway',           aliases: ['palomino', 'palomino freeway'] },
  { id: 'street.senora-fwy',         foxxiteName: 'Senora Fwy',         displayName: 'Senora Fwy',         description: 'Senora Freeway',             aliases: ['senora', 'senora freeway'] },
  { id: 'street.goh',                foxxiteName: 'Great Ocean Hwy',    displayName: 'Great Ocean Hwy',    description: 'Velká pobřežní dálnice',     aliases: ['goh', 'great ocean highway', 'route 1', 'pobrezni'] },
  { id: 'street.route-68',           foxxiteName: 'Route 68',           displayName: 'Route 68',           description: 'Hlavní silnice ve venkově',  aliases: ['68', 'r68', 'route sixty-eight'] },
  { id: 'street.vespucci-blvd',      foxxiteName: 'Vespucci Blvd',      displayName: 'Vespucci Blvd',      description: 'Vespucci Boulevard',         aliases: ['vespucci', 'vespucci boulevard', 'vespucci bulvar'] },
  { id: 'street.san-andreas-ave',    foxxiteName: 'San Andreas Ave',    displayName: 'San Andreas Ave',    description: 'San Andreas Avenue',         aliases: ['san andreas', 'san andreas avenue'] },
  { id: 'street.palomino-ave',       foxxiteName: 'Palomino Ave',       displayName: 'Palomino Ave',       description: 'Palomino Avenue',            aliases: ['palomino avenue'] },
  { id: 'street.calais-ave',         foxxiteName: 'Calais Ave',         displayName: 'Calais Ave',         description: 'Calais Avenue',              aliases: ['calais', 'calais avenue'] },
  { id: 'street.alta-street',        foxxiteName: 'Alta St',            displayName: 'Alta Street',        description: 'Alta Street',                aliases: ['alta', 'alta st'] },
  { id: 'street.innocence-blvd',     foxxiteName: 'Innocence Blvd',     displayName: 'Innocence Blvd',     description: 'Innocence Boulevard',        aliases: ['innocence', 'innocence boulevard', 'innocence bulvar'] },
  { id: 'street.el-rancho-blvd',     foxxiteName: 'El Rancho Blvd',     displayName: 'El Rancho Blvd',     description: 'El Rancho Boulevard',        aliases: ['el rancho', 'rancho', 'el rancho boulevard'] },
  { id: 'street.popular-st',         foxxiteName: 'Popular St',         displayName: 'Popular St',         description: 'Popular Street',             aliases: ['popular', 'popular street'] },
  { id: 'street.las-lagunas-blvd',   foxxiteName: 'Las Lagunas Blvd',   displayName: 'Las Lagunas Blvd',   description: 'Las Lagunas Boulevard',      aliases: ['las lagunas', 'las lagunas boulevard', 'lagunas'] },
  { id: 'street.vinewood-blvd',      foxxiteName: 'Vinewood Blvd',      displayName: 'Vinewood Boulevard', description: 'Vinewood Boulevard',         aliases: ['vinewood blvd', 'vinewood', 'vinewood bulvar'] },
  { id: 'street.west-eclipse-blvd',  foxxiteName: 'West Eclipse Blvd',  displayName: 'West Eclipse Blvd',  description: 'West Eclipse Boulevard',     aliases: ['west eclipse', 'eclipse', 'west eclipse boulevard'] },
];

// Inline anchor definitions (mirror src/modules/geo/data/anchorsCalibration.ts).
// Node ESM script can't import .ts directly without tooling; we duplicate the
// 6 anchors here. Single source of truth = anchorsCalibration.ts; if it changes,
// update both. Drift is caught by Δ residuals during script run.
const ANCHORS = [
  { label: 'Vespucci PD',          gtaWorld: { x: -1109, y: -845 },  ourCoord: { x: 0.316, y: 0.744 } },
  { label: 'Paleto Motel',         gtaWorld: { x: 140,   y: 6580 },  ourCoord: { x: 0.359, y: 0.205 } },
  { label: 'Humane Labs',          gtaWorld: { x: 3666,  y: 3735 },  ourCoord: { x: 0.822, y: 0.375 } },
  { label: 'Heli lookout',         gtaWorld: { x: 479,   y: -3173 }, ourCoord: { x: 0.461, y: 0.944 } },
  { label: 'Galileo Observatory',  gtaWorld: { x: -438,  y: 1227 },  ourCoord: { x: 0.387, y: 0.590 } },
  { label: 'Bolingbroke',          gtaWorld: { x: 1846,  y: 2616 },  ourCoord: { x: 0.622, y: 0.466 } },
];

// ---------- minimal affine6 fit (mirrors src/modules/geo/logic/calibrate.ts) ----------

/** Solve linear system via Gauss elimination. Throws on singular matrix. */
function solveLinearSystem(A, b) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(M[r][i]) > Math.abs(M[pivot][i])) pivot = r;
    }
    if (Math.abs(M[pivot][i]) < 1e-12) throw new Error('singular matrix');
    [M[i], M[pivot]] = [M[pivot], M[i]];
    for (let r = i + 1; r < n; r++) {
      const f = M[r][i] / M[i][i];
      for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let c = i + 1; c < n; c++) s -= M[i][c] * x[c];
    x[i] = s / M[i][i];
  }
  return x;
}

/** Fit 6-param affine [a,b,c,d,e,f] s.t. (x',y') = (a*x+b*y+c, d*x+e*y+f). */
function fitAffine6(pairs) {
  const n = pairs.length * 2;
  const A = [];
  const bVec = [];
  for (const { before, after } of pairs) {
    A.push([before.x, before.y, 1, 0, 0, 0]);
    bVec.push(after.x);
    A.push([0, 0, 0, before.x, before.y, 1]);
    bVec.push(after.y);
  }
  // Normal equations: AtA * x = Atb
  const AtA = Array.from({ length: 6 }, () => new Array(6).fill(0));
  const Atb = new Array(6).fill(0);
  for (let i = 0; i < n; i++) {
    for (let r = 0; r < 6; r++) {
      Atb[r] += A[i][r] * bVec[i];
      for (let c = 0; c < 6; c++) AtA[r][c] += A[i][r] * A[i][c];
    }
  }
  const x = solveLinearSystem(AtA, Atb);
  return { a: x[0], b: x[1], c: x[2], d: x[3], e: x[4], f: x[5] };
}

function applyAffine6(p, t) {
  return { x: t.a * p.x + t.b * p.y + t.c, y: t.d * p.x + t.e * p.y + t.f };
}

// ---------- geometry helpers ----------

/** Area-weighted centroid of a closed polygon ring. */
function polygonCentroid(ring) {
  let cx = 0, cy = 0, a2 = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const p = ring[i], q = ring[i + 1];
    const cross = p.x * q.y - q.x * p.y;
    a2 += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  if (Math.abs(a2) < 1e-12) {
    // degenerate; fall back to mean of points
    const sum = ring.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / ring.length, y: sum.y / ring.length };
  }
  return { x: cx / (3 * a2), y: cy / (3 * a2) };
}

/**
 * Foxxite street polygons represent *street zones* (asphalt + sidewalks +
 * surrounding context) — empirically 4–17× wider than the actual road. To get
 * realistic-looking street polygons we PCA the vertices, identify the major
 * (along-road) and minor (across-road) axes, and shrink ONLY along the minor.
 *
 * Length is preserved (factor 1.0 on major axis), width is reduced by
 * `WIDTH_SHRINK` (0.25 = polygon becomes 25 % of its original width). User
 * can fine-tune individual streets in /geo/calibrate after import.
 */
const WIDTH_SHRINK = 0.25;

function shrinkPolygonWidth(ring, shrinkFactor) {
  const n = ring.length;
  let mx = 0, my = 0;
  for (const p of ring) { mx += p.x; my += p.y; }
  mx /= n; my /= n;
  let cxx = 0, cxy = 0, cyy = 0;
  for (const p of ring) {
    const dx = p.x - mx, dy = p.y - my;
    cxx += dx * dx; cxy += dx * dy; cyy += dy * dy;
  }
  cxx /= n; cxy /= n; cyy /= n;
  // Eigenvector of larger eigenvalue = major axis (along road)
  const tr = cxx + cyy;
  const det = cxx * cyy - cxy * cxy;
  const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
  const l1 = tr / 2 + disc;
  let vx, vy;
  if (Math.abs(cxy) > 1e-10) {
    vx = l1 - cyy;
    vy = cxy;
  } else {
    vx = cxx >= cyy ? 1 : 0;
    vy = cxx >= cyy ? 0 : 1;
  }
  const vn = Math.hypot(vx, vy) || 1;
  const major = { x: vx / vn, y: vy / vn };
  const minor = { x: -major.y, y: major.x };
  return ring.map((p) => {
    const dx = p.x - mx, dy = p.y - my;
    const projMajor = dx * major.x + dy * major.y;
    const projMinor = (dx * minor.x + dy * minor.y) * shrinkFactor;
    return {
      x: mx + projMajor * major.x + projMinor * minor.x,
      y: my + projMajor * major.y + projMinor * minor.y,
    };
  });
}

// ---------- main pipeline ----------

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function fmtVec(v, digits = 4) {
  return `{ x: ${v.x.toFixed(digits)}, y: ${v.y.toFixed(digits)} }`;
}

async function main() {
  console.log(`Fetching ${SOURCE_URL} ...`);
  const rawText = await fetchText(SOURCE_URL);
  const geo = JSON.parse(rawText);
  if (geo.type !== 'FeatureCollection') throw new Error('Expected FeatureCollection');
  console.log(`Got ${geo.features.length} features`);

  console.log('\nFitting GTA-world → image transform from 6 anchors...');
  const pairs = ANCHORS.map((a) => ({ before: a.gtaWorld, after: a.ourCoord }));
  const t = fitAffine6(pairs);
  let maxDelta = 0;
  for (const a of ANCHORS) {
    const pred = applyAffine6(a.gtaWorld, t);
    const dx = a.ourCoord.x - pred.x;
    const dy = a.ourCoord.y - pred.y;
    const d = Math.hypot(dx, dy);
    console.log(`  ${a.label.padEnd(24)} Δ = ${d.toFixed(5)}`);
    if (d > maxDelta) maxDelta = d;
  }
  // Threshold 0.05 = 5% of image width ≈ 300px on 5944px source, ≈ 1 city block
  // shift. Polygon hit-test has 1.5% edge tolerance, so total worst-case "miss"
  // is ~6.5% — still touch-friendly for most clicks. Tighter calibration would
  // require either more precise GTA-world anchor coordinates (currently sourced
  // from rough Wiki lookups ± ~150m) or per-region TPS fit instead of global
  // affine6. Lower threshold to 0.02 when better anchors are available.
  if (maxDelta > 0.05) {
    throw new Error(
      `Max Δ ${maxDelta.toFixed(5)} > 0.05 — anchors are seriously off, refit gtaWorld values`,
    );
  }
  if (maxDelta > 0.02) {
    console.log(`⚠  Max Δ = ${maxDelta.toFixed(5)} > 0.02 — polygons may be visibly offset.`);
  } else {
    console.log(`Max Δ = ${maxDelta.toFixed(5)} (under 0.02 ideal threshold).`);
  }

  console.log('\nMatching whitelist against features...');
  const byName = new Map();
  for (const f of geo.features) {
    const n = (f.properties?.name || '').trim().toLowerCase();
    if (n) byName.set(n, f);
  }
  const emitted = [];
  const missed = [];
  for (const w of WHITELIST) {
    const f = byName.get(w.foxxiteName.toLowerCase());
    if (!f) {
      missed.push(w);
      console.log(`  MISSED   ${w.id} (Foxxite name "${w.foxxiteName}" not found)`);
      continue;
    }
    if (f.geometry.type !== 'Polygon') {
      console.log(`  SKIPPED  ${w.id} (geometry ${f.geometry.type}, expected Polygon)`);
      continue;
    }
    const ring = f.geometry.coordinates[0];
    const mappedFull = ring.map(([x, y]) => applyAffine6({ x, y }, t));
    // Foxxite polygons represent street zones (4-17x wider than real road).
    // Shrink along the minor axis to approximate actual street width.
    const mapped = shrinkPolygonWidth(mappedFull, WIDTH_SHRINK);
    for (const p of mapped) {
      if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
        console.log(`  OUT-OF-BOUNDS ${w.id}: point ${fmtVec(p)} not in [0,1]²`);
        throw new Error('Out of bounds — anchors likely wrong');
      }
    }
    const centroid = polygonCentroid(mapped);
    emitted.push({ ...w, path: mapped, centroid });
    console.log(`  OK       ${w.id} (${mapped.length} verts)`);
  }

  console.log(`\nEmitted ${emitted.length} streets, ${missed.length} missed.`);
  if (missed.length > 0) {
    console.log('Fix mismatches in WHITELIST (foxxiteName field) and re-run.');
  }

  // Archive raw
  await fs.mkdir(FOXXITE_DIR, { recursive: true });
  await fs.writeFile(path.join(FOXXITE_DIR, 'raw.geojson'), rawText, 'utf8');
  await fs.writeFile(
    path.join(FOXXITE_DIR, 'scraped-at.txt'),
    [
      `scraped_at: ${new Date().toISOString()}`,
      `source_url: ${SOURCE_URL}`,
      `total_features: ${geo.features.length}`,
      `emitted: ${emitted.length}`,
      `missed: ${missed.length}`,
    ].join('\n') + '\n',
  );

  // Write streetPolygons.generated.ts
  const tsLines = [
    '// AUTO-GENERATED by scripts/import-foxxite-streets.mjs — DO NOT EDIT.',
    `// Source: ${SOURCE_URL}`,
    `// Generated: ${new Date().toISOString()}`,
    "import type { POI } from './types';",
    '',
    'export const STREET_POLYGONS: readonly POI[] = [',
  ];
  for (const e of emitted) {
    tsLines.push('  {');
    tsLines.push(`    id: ${JSON.stringify(e.id)},`);
    tsLines.push(`    category: "street",`);
    tsLines.push(`    geometry: "polygon",`);
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

  // Write geo-poi-ids.generated.ts (placeholder: full list filled after pois.ts refactor)
  // For now, just include the street IDs we just emitted; non-street IDs are stable
  // and listed in pois.ts manually.
  const nonStreetIds = [
    // 48 non-street POI IDs from src/modules/geo/data/pois.ts.
    // (43 landmark + 2 pd + 1 fire + 1 ems + 1 ammu). When adding a new
    // non-street POI to pois.ts, also add its id here so e2e seed knows about it.
    'ammu.downtown',
    'ems.central',
    'fire.hq',
    'landmark.arcadius',
    'landmark.casino',
    'landmark.chumash',
    'landmark.divadlo',
    'landmark.doky',
    'landmark.fort-zancudo',
    'landmark.g6',
    'landmark.grapeseed',
    'landmark.gym-u-plaze',
    'landmark.hlavni-banka',
    'landmark.hrbitov',
    'landmark.hriste-golf',
    'landmark.industrialni-zona',
    'landmark.klenotnictvi',
    'landmark.legion-square',
    'landmark.letiste-sandy',
    'landmark.life-invader',
    'landmark.lsc',
    'landmark.lsia',
    'landmark.maze-bank-arena',
    'landmark.maze-bank-tower',
    'landmark.mega-mall',
    'landmark.mirror-park',
    'landmark.molo',
    'landmark.north-chumash',
    'landmark.observator',
    'landmark.paleto-bay',
    'landmark.pdm',
    'landmark.pillbox',
    'landmark.pink-cage-motel',
    'landmark.posta',
    'landmark.power-station',
    'landmark.prehrada',
    'landmark.radnice',
    'landmark.rockford-plaza',
    'landmark.ropne-vrty',
    'landmark.sandy-shores',
    'landmark.vetrne-elektrarny',
    'landmark.veznice',
    'landmark.vinewood-sign',
    'landmark.vinice',
    'landmark.vodni-mesto',
    'landmark.weazel',
    'pd.vespucci',
    'pd.vinewood',
  ];
  const allIds = [...nonStreetIds, ...emitted.map((e) => e.id)];
  const idsLines = [
    '// AUTO-GENERATED by scripts/import-foxxite-streets.mjs — DO NOT EDIT.',
    `// Generated: ${new Date().toISOString()}`,
    '',
    'export const GEO_POI_IDS = [',
    ...allIds.map((id) => `  ${JSON.stringify(id)},`),
    '] as const;',
    '',
  ];
  await fs.writeFile(E2E_IDS_OUT, idsLines.join('\n'), 'utf8');
  console.log(`Wrote ${E2E_IDS_OUT} (${allIds.length} IDs, ${nonStreetIds.length} non-street + ${emitted.length} streets)`);

  if (missed.length > 0 || maxDelta > 0.005) {
    console.log('\n⚠  Review output before committing.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
