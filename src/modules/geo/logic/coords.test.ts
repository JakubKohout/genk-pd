import { describe, expect, it } from 'vitest';
import { fromLatLng, toLatLng } from './coords';
import type { TileMeta } from '../data/types';

const meta: TileMeta = { width: 8192, height: 12288, maxZoom: 3, tileSize: 256 };

describe('coords', () => {
  it('toLatLng converts 0..1 to source-pixel [y,x]', () => {
    expect(toLatLng({ x: 0, y: 0 }, meta)).toEqual([0, 0]);
    expect(toLatLng({ x: 1, y: 1 }, meta)).toEqual([12288, 8192]);
    expect(toLatLng({ x: 0.5, y: 0.5 }, meta)).toEqual([12288 / 2, 8192 / 2]);
  });

  it('fromLatLng converts source-pixel back to 0..1', () => {
    expect(fromLatLng({ lat: 0, lng: 0 }, meta)).toEqual({ x: 0, y: 0 });
    expect(fromLatLng({ lat: 12288, lng: 8192 }, meta)).toEqual({ x: 1, y: 1 });
  });

  it('round-trips toLatLng → fromLatLng', () => {
    const original = { x: 0.347, y: 0.612 };
    const [lat, lng] = toLatLng(original, meta);
    const back = fromLatLng({ lat, lng }, meta);
    expect(back.x).toBeCloseTo(original.x);
    expect(back.y).toBeCloseTo(original.y);
  });
});
