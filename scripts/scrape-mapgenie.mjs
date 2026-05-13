#!/usr/bin/env node
/**
 * Scrape gta-5-map.com (Map Genie / MapBox) inline `window.mapData` and archive
 * the dataset for our geo module POI generation pipeline.
 *
 * Usage: node scripts/scrape-mapgenie.mjs
 *
 * Outputs (overwrites on each run):
 *   docs/mapgenie-data/raw.html        full HTML response (~860 KB)
 *   docs/mapgenie-data/raw.json        full window.mapData pretty-printed (~1.1 MB)
 *   docs/mapgenie-data/filtered.json   subset of categories relevant to our POI quiz
 *   docs/mapgenie-data/scraped-at.txt  timestamp + source URL marker
 *
 * Idempotent. Re-run if MapGenie publishes new data or we want to widen the
 * RELEVANT_CATEGORY_IDS filter.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'mapgenie-data');

const SOURCE_URL = 'https://gta-5-map.com/';

const RELEVANT_CATEGORY_IDS = new Set([
  462, // Ammu-Nation
  463, // Automotive Shop (LSC, PDM)
  467, // Golfing
  475, // Cinema
  476, // Police Station
  477, // Hospital
  478, // Car Wash (LSC backup)
  480, // Lookout Point
  481, // Mountain Peak
  487, // Miscellaneous — Vinewood Sign, Mirror Park, Legion Square, Reservoir, Vineyard,
       //                 Sandy Shores Airfield, PDM, Del Perro Pier, Pier 400, Jewelry, ...
  495, // Fire Station
  504, // Building (Maze Bank Tower, Weazel, Life Invader, GoPostal, ...)
  517, // Hanger (LSIA / Fort Zancudo hangars)
  518, // Facility (Land Act Reservoir Facility, Wind Farm Facility, ...)
  520, // Executive Office (Arcadius, Lombank, Maze Bank West)
]);

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }
  return await res.text();
}

/**
 * Extract `window.mapData = {...};` from inline JS. The value is a JSON object
 * literal that ends at a balanced closing brace followed by `;`.
 */
function extractMapData(html) {
  const marker = 'window.mapData = ';
  const start = html.indexOf(marker);
  if (start === -1) throw new Error('window.mapData marker not found in HTML');
  let i = start + marker.length;
  if (html[i] !== '{') throw new Error(`expected '{' after marker, got '${html[i]}'`);

  let depth = 0;
  let inStr = false;
  let strCh = '';
  let escape = false;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (escape) {
        escape = false;
      } else if (c === '\\') {
        escape = true;
      } else if (c === strCh) {
        inStr = false;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = true;
      strCh = c;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        const raw = html.slice(start + marker.length, i + 1);
        return JSON.parse(raw);
      }
    }
  }
  throw new Error('unterminated window.mapData object literal');
}

function filterLocations(mapData) {
  const locations = mapData.locations ?? [];
  const groups = mapData.groups ?? [];
  const catById = new Map();
  for (const g of groups) {
    for (const c of g.categories ?? []) {
      catById.set(c.id, { ...c, group_title: g.title });
    }
  }
  const filtered = locations
    .filter((l) => RELEVANT_CATEGORY_IDS.has(l.category_id))
    .map((l) => {
      const cat = catById.get(l.category_id);
      return {
        id: l.id,
        title: l.title,
        description: l.description ?? null,
        latitude: parseFloat(l.latitude),
        longitude: parseFloat(l.longitude),
        category_id: l.category_id,
        category_title: cat?.title ?? null,
        group_title: cat?.group_title ?? null,
      };
    })
    .sort((a, b) => a.category_id - b.category_id || a.title.localeCompare(b.title));
  return filtered;
}

async function main() {
  console.log(`Fetching ${SOURCE_URL} ...`);
  const html = await fetchHtml(SOURCE_URL);
  console.log(`Got ${html.length.toLocaleString()} bytes`);

  console.log('Parsing window.mapData ...');
  const mapData = extractMapData(html);
  const locations = mapData.locations ?? [];
  console.log(
    `  groups: ${mapData.groups?.length ?? 0}, categories: ${
      mapData.groups?.reduce((n, g) => n + (g.categories?.length ?? 0), 0) ?? 0
    }, locations: ${locations.length}`,
  );

  const filtered = filterLocations(mapData);
  console.log(`Filtered to ${filtered.length} relevant locations`);
  const byCat = new Map();
  for (const l of filtered) {
    byCat.set(l.category_title, (byCat.get(l.category_title) ?? 0) + 1);
  }
  for (const [cat, n] of [...byCat.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(20)} ${n}`);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, 'raw.html'), html, 'utf8');
  await fs.writeFile(
    path.join(OUT_DIR, 'raw.json'),
    JSON.stringify(mapData, null, 2),
    'utf8',
  );
  await fs.writeFile(
    path.join(OUT_DIR, 'filtered.json'),
    JSON.stringify(filtered, null, 2),
    'utf8',
  );
  const marker = [
    `scraped_at: ${new Date().toISOString()}`,
    `source_url: ${SOURCE_URL}`,
    `total_locations: ${locations.length}`,
    `filtered_locations: ${filtered.length}`,
    `relevant_category_ids: ${[...RELEVANT_CATEGORY_IDS].sort((a, b) => a - b).join(',')}`,
  ].join('\n');
  await fs.writeFile(path.join(OUT_DIR, 'scraped-at.txt'), marker + '\n', 'utf8');

  console.log(`\nWrote ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
