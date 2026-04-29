import type { Code } from '../data/codes';
import { sample, shuffle } from '@/shared/rng';

const TOTAL_OPTIONS = 5;
const CLOSE_COUNT = 2;
const RANDOM_COUNT = 2;

/**
 * Build the 5 options (1 correct + 2 close-by-decade + 2 random).
 *
 * Distractors ignore the user's importance filter and are pulled from the full
 * code set (per brainstorming decision). When the correct code's decade has
 * fewer than 2 other inhabitants, we fall back to nearest-by-number.
 */
export function buildOptions(correct: Code, allCodes: readonly Code[]): Code[] {
  const decadeStart = Math.floor(correct.number / 10) * 10;
  const decadeEnd = decadeStart + 9;

  const decadeMates = allCodes.filter(
    (c) => c.id !== correct.id && c.number >= decadeStart && c.number <= decadeEnd,
  );

  const closeBy: Code[] = [];
  if (decadeMates.length >= CLOSE_COUNT) {
    closeBy.push(...sample(decadeMates, CLOSE_COUNT));
  } else {
    closeBy.push(...decadeMates);
    const used = new Set([correct.id, ...closeBy.map((c) => c.id)]);
    const fallback = allCodes
      .filter((c) => !used.has(c.id))
      .sort((a, b) => Math.abs(a.number - correct.number) - Math.abs(b.number - correct.number));
    closeBy.push(...fallback.slice(0, CLOSE_COUNT - closeBy.length));
  }

  const used = new Set([correct.id, ...closeBy.map((c) => c.id)]);
  const remainingPool = allCodes.filter((c) => !used.has(c.id));
  const random = sample(remainingPool, RANDOM_COUNT);

  const options = [correct, ...closeBy, ...random];
  if (options.length !== TOTAL_OPTIONS) {
    // Defensive: degenerate case (data set too small). Pad from anywhere remaining.
    const padPool = allCodes.filter((c) => !options.includes(c));
    options.push(...sample(padPool, TOTAL_OPTIONS - options.length));
  }
  return shuffle(options);
}
