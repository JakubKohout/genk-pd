import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { pickNextFromPool } from './pickNextFromPool';
import { mulberry32, resetRng, setRng } from '@/shared/rng';

type Item = { id: string };

describe('pickNextFromPool', () => {
  beforeEach(() => setRng(mulberry32(1)));
  afterEach(() => resetRng());

  it('returns null for empty pool', () => {
    expect(pickNextFromPool<Item>([], {}, 0)).toBeNull();
  });

  it('returns the only candidate when pool size is 1', () => {
    const pool: Item[] = [{ id: 'a' }];
    expect(pickNextFromPool(pool, {}, 0)).toEqual({ id: 'a' });
  });

  it('skips items in cooldown when others are available', () => {
    const pool: Item[] = [{ id: 'a' }, { id: 'b' }];
    const progress = { a: { score: 0, lastAskedAtTurn: 5 } };
    expect(pickNextFromPool(pool, progress, 6)).toEqual({ id: 'b' });
  });

  it('falls back to cooled-out items when every candidate is in cooldown', () => {
    const pool: Item[] = [{ id: 'a' }];
    const progress = { a: { score: 0, lastAskedAtTurn: 5 } };
    expect(pickNextFromPool(pool, progress, 6)).toEqual({ id: 'a' });
  });

  it('weights selection so that lower-score items are picked more often', () => {
    setRng(mulberry32(42));
    const pool: Item[] = [{ id: 'low' }, { id: 'high' }];
    const progress = {
      low: { score: -2, lastAskedAtTurn: -100 },
      high: { score: 1, lastAskedAtTurn: -100 },
    };
    let lowCount = 0;
    for (let i = 0; i < 1000; i++) {
      if (pickNextFromPool(pool, progress, 0)?.id === 'low') lowCount++;
    }
    // weights: low = 3 - (-2) = 5, high = 3 - 1 = 2; expected lowCount ≈ 5/7 ≈ 714
    expect(lowCount).toBeGreaterThan(640);
    expect(lowCount).toBeLessThan(800);
  });
});
