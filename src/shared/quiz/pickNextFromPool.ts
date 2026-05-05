import { weightedRandom } from '@/shared/rng';
import type { ProgressEntry } from '@/shared/storage';

const COOLDOWN_TURNS = 2;

export function pickNextFromPool<T extends { id: string }>(
  pool: readonly T[],
  progress: Readonly<Record<string, ProgressEntry | undefined>>,
  turn: number,
): T | null {
  if (pool.length === 0) return null;

  const cooled = pool.filter((item) => {
    const last = progress[item.id]?.lastAskedAtTurn ?? Number.NEGATIVE_INFINITY;
    return turn - last >= COOLDOWN_TURNS;
  });
  const candidates = cooled.length > 0 ? cooled : pool;

  const weights = candidates.map((item) => 3 - (progress[item.id]?.score ?? 0));
  return weightedRandom(candidates, weights);
}
