#!/usr/bin/env node
/**
 * Archive Foxxite/GTAV-Geo-Json street + area polygons for the in-app
 * calibrator (legacy StreetAnchorsTab overlays). The quiz street geometry is
 * NOT produced here any more — centerline polylines come from
 * scripts/build-streets-from-ynd.mjs (GTA V path-node dump); the Foxxite zone
 * polygons proved to be crude convex hulls unusable for click validation.
 *
 * Usage:  node scripts/import-foxxite-streets.mjs
 *
 * Outputs:
 *   docs/foxxite-data/raw.geojson              # archived source (commit)
 *   docs/foxxite-data/scraped-at.txt           # timestamp + URL marker
 *   src/modules/geo/data/foxxiteSource.generated.ts  # raw + area meta for in-app calibrator
 *
 * Idempotent. Re-run after editing WHITELIST below. Source GeoJSON is read
 * from the local archive at docs/foxxite-data/raw.geojson when present;
 * delete the archive to force a re-fetch from upstream.
 *
 * The current map (`docs/clean-map.jpg`, 8192×12288) is a stitch of Rockstar's
 * native satellite minimap tiles → UNIFORM PROJECTION at 1.024 px/m. GTA
 * world coords map linearly to image coords; no anchors / TPS / calibration:
 *
 *   norm_x = (gta_x + 4000) / 8000          # bounds x ∈ [-4000..+4000]
 *   norm_y = (8000 - gta_y) / 12000         # bounds y ∈ [-4000..+8000], flipped
 *
 * Constants are deterministic from the source pipeline — see
 * `scripts/extract-minimap.py` and `src/modules/geo/logic/gtaProjection.ts`
 * (keep this in sync with both).
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STREET_URL =
  'https://raw.githubusercontent.com/Foxxite/GTAV-Geo-Json/master/street.geojson';
const AREA_URL =
  'https://raw.githubusercontent.com/Foxxite/GTAV-Geo-Json/master/area.geojson';
const FOXXITE_DIR = path.join(ROOT, 'docs', 'foxxite-data');
const RAW_LOCAL = path.join(FOXXITE_DIR, 'raw.geojson');
const RAW_AREAS_LOCAL = path.join(FOXXITE_DIR, 'raw-areas.geojson');
const SOURCE_OUT = path.join(ROOT, 'src/modules/geo/data/foxxiteSource.generated.ts');

// --- GTA world → normalized image coord transform ---
// Mirror of src/modules/geo/logic/gtaProjection.ts (single source of truth).
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

// ---------- geometry helpers ----------

/**
 * Signed-area centroid of a closed (or open) ring in 2D. Robust against
 * non-convex shapes; falls back to vertex mean for degenerate near-zero-area
 * rings. Operates in whatever coord space you pass in (we use normalized 0..1).
 */
function polygonCentroid(ring) {
  if (ring.length === 0) return { x: 0, y: 0 };
  if (ring.length === 1) return { x: ring[0].x, y: ring[0].y };
  let cx = 0, cy = 0, a2 = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    const cross = p.x * q.y - q.x * p.y;
    a2 += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  if (Math.abs(a2) < 1e-12) {
    let sx = 0, sy = 0;
    for (const p of ring) { sx += p.x; sy += p.y; }
    return { x: sx / ring.length, y: sy / ring.length };
  }
  return { x: cx / (3 * a2), y: cy / (3 * a2) };
}

/** GTA-coord centroid for area features (used downstream by foxxiteSource.generated.ts). */
function polygonCentroidGtaArr(ring) {
  // ring is array of [x, y] pairs (GeoJSON form, closed: first === last).
  const verts = ring.map(([x, y]) => ({ x, y }));
  return polygonCentroid(verts);
}

/**
 * Project a GeoJSON Polygon or MultiPolygon to an array of rings in
 * normalized 0..1 image coords. For Polygon: rings = [outer, ...holes].
 * For MultiPolygon: rings = flattened outer-ring-of-each-polygon then
 * each polygon's holes appended. (Foxxite data has no holes and no
 * MultiPolygons in practice — verified at audit time — but the function
 * tolerates either shape gracefully.)
 */
function geometryToRings(geometry) {
  const out = [];
  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) {
      out.push(ring.map(([x, y]) => gtaToNorm({ x, y })));
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      for (const ring of poly) {
        out.push(ring.map(([x, y]) => gtaToNorm({ x, y })));
      }
    }
  } else {
    throw new Error(`unexpected geometry type: ${geometry.type}`);
  }
  return out;
}

// ---------- main pipeline ----------

async function readOrFetch(localPath, fallbackUrl) {
  try {
    const txt = await fs.readFile(localPath, 'utf8');
    console.log(`  read local ${localPath} (${txt.length} bytes)`);
    return txt;
  } catch {
    console.log(`  local ${localPath} missing — fetching ${fallbackUrl}`);
    const res = await fetch(fallbackUrl, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${fallbackUrl}`);
    return await res.text();
  }
}

function fmtVec(v, digits = 4) {
  return `{ x: ${v.x.toFixed(digits)}, y: ${v.y.toFixed(digits)} }`;
}

async function main() {
  console.log('Loading street GeoJSON...');
  const rawText = await readOrFetch(RAW_LOCAL, STREET_URL);
  const geo = JSON.parse(rawText);
  if (geo.type !== 'FeatureCollection') throw new Error('Expected FeatureCollection');
  console.log(`Got ${geo.features.length} street features`);

  console.log('Loading area GeoJSON...');
  const areaText = await readOrFetch(RAW_AREAS_LOCAL, AREA_URL);
  const areaGeo = JSON.parse(areaText);
  if (areaGeo.type !== 'FeatureCollection') throw new Error('area: Expected FeatureCollection');
  console.log(`Got ${areaGeo.features.length} area features`);

  console.log(
    `\nUsing uniform linear projection: gta x:[${GTA_X_MIN}..${GTA_X_MIN + GTA_W}], y:[${GTA_Y_MAX - GTA_H}..${GTA_Y_MAX}] → normalized [0,1]² image space.`,
  );

  console.log('\nMatching whitelist against features...');
  const byName = new Map();
  for (const f of geo.features) {
    const n = (f.properties?.name || '').trim().toLowerCase();
    if (!n) continue;
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n).push(f);
  }
  const emitted = [];
  const missed = [];
  for (const w of WHITELIST) {
    const features = byName.get(w.foxxiteName.toLowerCase()) || [];
    if (features.length === 0) {
      missed.push(w);
      console.log(`  MISSED   ${w.id} (Foxxite name "${w.foxxiteName}" not found)`);
      continue;
    }
    // Multiple features with the same name → treat as MultiPolygon (each
    // feature contributes its rings; ring 0 of each feature is its outer).
    const allRings = [];
    for (const f of features) {
      try {
        allRings.push(...geometryToRings(f.geometry));
      } catch (e) {
        console.log(`  SKIPPED  ${w.id} (${e.message})`);
      }
    }
    if (allRings.length === 0) {
      missed.push(w);
      console.log(`  SKIPPED  ${w.id} (no usable rings)`);
      continue;
    }
    // Sanity: every vertex must lie inside [0,1]² (i.e. inside our 8000×12000 GTA bounds).
    let oob = null;
    for (const ring of allRings) {
      for (const p of ring) {
        if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) { oob = p; break; }
      }
      if (oob) break;
    }
    if (oob) {
      console.log(`  SKIPPED  ${w.id} (vertex ${fmtVec(oob)} outside [0,1]² — outside clean-map.jpg coverage)`);
      continue;
    }
    // Centroid = signed-area centroid of the outer ring (first ring of the
    // first feature). Used as marker / camera position in the quiz UI.
    const centroid = polygonCentroid(allRings[0]);
    emitted.push({ ...w, rings: allRings, centroid });
    const vertexCount = allRings.reduce((s, r) => s + r.length, 0);
    console.log(`  OK       ${w.id} (${allRings.length} ring${allRings.length === 1 ? '' : 's'}, ${vertexCount} vertices)`);
  }

  console.log(`\nEmitted ${emitted.length} streets, ${missed.length} missed.`);
  if (missed.length > 0) {
    console.log('Fix mismatches in WHITELIST (foxxiteName field) and re-run.');
  }

  // Archive raw (idempotent — overwrites with the text we just used).
  await fs.mkdir(FOXXITE_DIR, { recursive: true });
  await fs.writeFile(RAW_LOCAL, rawText, 'utf8');
  await fs.writeFile(RAW_AREAS_LOCAL, areaText, 'utf8');
  await fs.writeFile(
    path.join(FOXXITE_DIR, 'scraped-at.txt'),
    [
      `scraped_at: ${new Date().toISOString()}`,
      `street_url: ${STREET_URL}`,
      `area_url: ${AREA_URL}`,
      `total_street_features: ${geo.features.length}`,
      `total_area_features: ${areaGeo.features.length}`,
      `gta_bounds: x[${GTA_X_MIN}..${GTA_X_MIN + GTA_W}] y[${GTA_Y_MAX - GTA_H}..${GTA_Y_MAX}]`,
      `emitted: ${emitted.length}`,
      `missed: ${missed.length}`,
    ].join('\n') + '\n',
  );

  // Write foxxiteSource.generated.ts (raw GTA polygons + area centroids/rings
  // for the in-app calibrator). Still useful for future overlays / debugging.
  const fmtPair = (p) => `{ x: ${p.x.toFixed(2)}, y: ${p.y.toFixed(2)} }`;
  const sourceLines = [
    '// AUTO-GENERATED by scripts/import-foxxite-streets.mjs — DO NOT EDIT directly.',
    `// Generated: ${new Date().toISOString()}`,
    "import type { Vec2 } from './types';",
    '',
    'export interface RawStreetSource {',
    '  id: string;',
    '  displayName: string;',
    '  description: string;',
    '  aliases: readonly string[];',
    '  /** Raw Foxxite polygon ring in GTA-world coords (closed, first === last). */',
    '  gtaRing: readonly Vec2[];',
    '}',
    '',
    'export const RAW_STREETS: readonly RawStreetSource[] = [',
  ];
  for (const w of WHITELIST) {
    const features = byName.get(w.foxxiteName.toLowerCase()) || [];
    if (features.length === 0) continue;
    const f = features[0];
    if (f.geometry.type !== 'Polygon') continue;
    const ring = f.geometry.coordinates[0];
    sourceLines.push('  {');
    sourceLines.push(`    id: ${JSON.stringify(w.id)},`);
    sourceLines.push(`    displayName: ${JSON.stringify(w.displayName)},`);
    sourceLines.push(`    description: ${JSON.stringify(w.description)},`);
    sourceLines.push(`    aliases: ${JSON.stringify(w.aliases)},`);
    sourceLines.push('    gtaRing: [');
    for (const [x, y] of ring) {
      sourceLines.push(`      ${fmtPair({ x, y })},`);
    }
    sourceLines.push('    ],');
    sourceLines.push('  },');
  }
  sourceLines.push('];');
  sourceLines.push('');
  sourceLines.push('export interface AreaSource {');
  sourceLines.push('  name: string;');
  sourceLines.push('  gtaCentroid: Vec2;');
  sourceLines.push('  /** Polygon outline of the area in GTA-world coords (closed ring). */');
  sourceLines.push('  gtaRing: readonly Vec2[];');
  sourceLines.push('}');
  sourceLines.push('');
  sourceLines.push('export const AREAS: readonly AreaSource[] = [');
  for (const f of areaGeo.features) {
    if (f.geometry.type !== 'Polygon') continue;
    const ring = f.geometry.coordinates[0];
    const c = polygonCentroidGtaArr(ring);
    sourceLines.push('  {');
    sourceLines.push(`    name: ${JSON.stringify(f.properties.name)},`);
    sourceLines.push(`    gtaCentroid: ${fmtPair(c)},`);
    sourceLines.push('    gtaRing: [');
    for (const [x, y] of ring) {
      sourceLines.push(`      ${fmtPair({ x, y })},`);
    }
    sourceLines.push('    ],');
    sourceLines.push('  },');
  }
  sourceLines.push('];');
  sourceLines.push('');
  sourceLines.push('export const AREA_BY_NAME = new Map(AREAS.map((a) => [a.name, a]));');
  sourceLines.push('');
  await fs.writeFile(SOURCE_OUT, sourceLines.join('\n'), 'utf8');
  console.log(`Wrote ${SOURCE_OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
