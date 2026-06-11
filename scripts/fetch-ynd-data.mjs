#!/usr/bin/env node
/**
 * Phase 1: fetch raw .ynd JSON dump (DurtyFree) and street-name hash list (jgscripts).
 *
 * Usage: node scripts/fetch-ynd-data.mjs
 *
 * Outputs:
 *   data/raw/nodes.zip
 *   data/raw/ynd-json/*.json   (~259 files, ~67k nodes total)
 *   data/raw/streets.txt
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'data', 'raw');
const JSON_DIR = path.join(RAW_DIR, 'ynd-json');

const NODES_URL = 'https://github.com/DurtyFree/gta-v-data-dumps/raw/refs/heads/master/nodes.zip';
const STREETS_URL = 'https://github.com/jgscripts/gtav-street-zone-hashes/raw/refs/heads/main/streets.txt';

async function download(url, destPath) {
  process.stdout.write(`Downloading ${url}\n  → ${path.relative(ROOT, destPath)} ... `);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buf);
  console.log(`${buf.length.toLocaleString()} bytes`);
  return buf.length;
}

async function unzip(zipPath, destDir) {
  await fs.rm(destDir, { recursive: true, force: true });
  await fs.mkdir(destDir, { recursive: true });
  process.stdout.write(`Unzipping ${path.relative(ROOT, zipPath)} → ${path.relative(ROOT, destDir)} ... `);
  await execFileP('unzip', ['-q', '-o', zipPath, '-d', destDir]);
  console.log('done');
}

async function flattenJsonDir(dir) {
  // The zip may contain a nested folder (e.g. nodes/*.json). Flatten so all .json sit under JSON_DIR.
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      const sub = path.join(dir, e.name);
      const subEntries = await fs.readdir(sub);
      for (const f of subEntries) {
        await fs.rename(path.join(sub, f), path.join(dir, f));
      }
      await fs.rmdir(sub);
    }
  }
}

async function countNodes(dir) {
  const files = (await fs.readdir(dir)).filter(f => f.endsWith('.json'));
  let totalNodes = 0;
  let areaCount = 0;
  for (const f of files) {
    const data = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'));
    // DurtyFree shipped a single nodes.json which is an array of area objects.
    if (Array.isArray(data)) {
      for (const area of data) {
        areaCount += 1;
        if (Array.isArray(area?.Nodes)) totalNodes += area.Nodes.length;
      }
    } else if (Array.isArray(data?.Nodes)) {
      areaCount += 1;
      totalNodes += data.Nodes.length;
    }
  }
  return { fileCount: files.length, areaCount, totalNodes };
}

async function main() {
  await fs.mkdir(RAW_DIR, { recursive: true });
  const zipPath = path.join(RAW_DIR, 'nodes.zip');
  const streetsPath = path.join(RAW_DIR, 'streets.txt');

  await download(NODES_URL, zipPath);
  await download(STREETS_URL, streetsPath);
  await unzip(zipPath, JSON_DIR);
  await flattenJsonDir(JSON_DIR);

  const { fileCount, areaCount, totalNodes } = await countNodes(JSON_DIR);
  console.log(`\n.ynd JSON files:  ${fileCount}`);
  console.log(`Areas (.ynd):     ${areaCount}`);
  console.log(`Total nodes:      ${totalNodes.toLocaleString()}`);
}

main().catch(err => {
  console.error('FETCH FAILED:', err);
  process.exit(1);
});
