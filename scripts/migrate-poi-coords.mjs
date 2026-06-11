#!/usr/bin/env node
/**
 * One-shot migration: every `{ x: …, y: … }` literal in pois.ts was computed
 * via the broken projection
 *
 *   norm_x = (gta_x + 3841) / 9058       # GTA_W=9058, X_MIN=-3841
 *   norm_y = (7801 - gta_y) / 12921      # GTA_H=12921, Y_MAX=+7801
 *
 * The map (`docs/clean-map.jpg`, 8192×12288) actually covers
 *
 *   norm_x = (gta_x + 4000) / 8000       # GTA_W=8000, X_MIN=-4000
 *   norm_y = (8000 - gta_y) / 12000      # GTA_H=12000, Y_MAX=+8000
 *
 * Round-trip via GTA-world space gives a uniform affine in norm space:
 *
 *   new_x = (old_x * 9058 - 3841 + 4000) / 8000 = (old_x * 9058 + 159) / 8000
 *   new_y = (old_y * 12921 + 199) / 12000        # 199 = 8000 - 7801
 *
 * Idempotent via a header marker. Re-run is a no-op.
 *
 * Usage:  node scripts/migrate-poi-coords.mjs
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'src/modules/geo/data/pois.ts');
const MARKER = '// migrated-coords-v1';

const OLD = { xMin: -3841, w: 9058, yMax: 7801, h: 12921 };
const NEW = { xMin: -4000, w: 8000, yMax: 8000, h: 12000 };

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function migrate(x, y) {
  const gtaX = x * OLD.w + OLD.xMin;
  const gtaY = OLD.yMax - y * OLD.h;
  return {
    x: round4((gtaX - NEW.xMin) / NEW.w),
    y: round4((NEW.yMax - gtaY) / NEW.h),
  };
}

const VEC_RE = /\{\s*x:\s*(-?\d+(?:\.\d+)?)\s*,\s*y:\s*(-?\d+(?:\.\d+)?)\s*\}/g;

async function main() {
  const original = await fs.readFile(TARGET, 'utf8');
  if (original.includes(MARKER)) {
    console.log(`No-op: ${path.relative(ROOT, TARGET)} already migrated.`);
    return;
  }

  let count = 0;
  const migrated = original.replace(VEC_RE, (_match, xStr, yStr) => {
    const oldX = parseFloat(xStr);
    const oldY = parseFloat(yStr);
    const { x, y } = migrate(oldX, oldY);
    count++;
    return `{ x: ${x.toFixed(4)}, y: ${y.toFixed(4)} }`;
  });

  // Insert marker as first line after the leading `import` block (keeps the
  // file's existing structure intact).
  const lines = migrated.split('\n');
  let insertAt = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].startsWith('/*') || lines[i].startsWith(' *')) continue;
    insertAt = i;
    break;
  }
  lines.splice(insertAt, 0, MARKER, '');

  await fs.writeFile(TARGET, lines.join('\n'), 'utf8');
  console.log(`Migrated ${count} coord literals in ${path.relative(ROOT, TARGET)}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
