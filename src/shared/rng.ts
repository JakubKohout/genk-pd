/**
 * Pluggable random source. Tests / Playwright can seed determinism by:
 *  - calling setRng(...) directly (in unit tests), or
 *  - writing localStorage["genk-pd:rng-seed"] before the app boots
 *    (Playwright via page.addInitScript). The seed is consumed at module load.
 */

const RNG_SEED_KEY = 'genk-pd:rng-seed';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function readInitialSeed(): number | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(RNG_SEED_KEY);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

const initialSeed = readInitialSeed();
let rng: () => number = initialSeed !== null ? mulberry32(initialSeed) : Math.random;

export function setRng(fn: () => number): void {
  rng = fn;
}

export function resetRng(): void {
  rng = Math.random;
}

export function random(): number {
  return rng();
}

export function weightedRandom<T>(items: readonly T[], weights: readonly number[]): T {
  if (items.length === 0) throw new Error('weightedRandom: empty items');
  if (items.length !== weights.length) throw new Error('weightedRandom: length mismatch');
  let total = 0;
  for (const w of weights) total += Math.max(0, w);
  if (total <= 0) {
    return items[Math.floor(random() * items.length)]!;
  }
  let roll = random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= Math.max(0, weights[i]!);
    if (roll <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

export function shuffle<T>(items: readonly T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export function sample<T>(items: readonly T[], n: number): T[] {
  return shuffle(items).slice(0, n);
}
