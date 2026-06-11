import { describe, expect, it } from 'vitest';
import {
  HIT_THRESHOLD,
  POLYLINE_HIT_TOLERANCE,
  SIZE_THRESHOLDS,
  distance,
  evaluateClick,
  pointToPolylineDist,
  pointToSegmentDist,
} from './hitTest';
import type { POIPoint, POIPolyline, POISize } from '../data/types';

describe('distance', () => {
  it('returns 0 for the same point', () => {
    expect(distance({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 })).toBe(0);
  });
  it('is symmetric', () => {
    const a = { x: 0.1, y: 0.2 };
    const b = { x: 0.4, y: 0.6 };
    expect(distance(a, b)).toBeCloseTo(distance(b, a));
  });
  it('matches Pythagorean for axis-aligned cases', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });
});

describe('pointToSegmentDist', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 1, y: 0 };

  it('returns 0 for a point exactly on the segment', () => {
    expect(pointToSegmentDist({ x: 0.5, y: 0 }, a, b)).toBe(0);
  });

  it('returns perpendicular distance when projection lies on the segment', () => {
    expect(pointToSegmentDist({ x: 0.5, y: 0.2 }, a, b)).toBeCloseTo(0.2);
  });

  it('returns endpoint distance when projection is past the endpoint', () => {
    expect(pointToSegmentDist({ x: 1.5, y: 0 }, a, b)).toBeCloseTo(0.5);
    expect(pointToSegmentDist({ x: -0.5, y: 0 }, a, b)).toBeCloseTo(0.5);
  });

  it('handles zero-length segment as point distance', () => {
    expect(pointToSegmentDist({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(1);
  });
});

describe('pointToPolylineDist', () => {
  const path = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
  ];

  it('returns 0 when point is on a segment', () => {
    expect(pointToPolylineDist({ x: 0.5, y: 0 }, path)).toBe(0);
    expect(pointToPolylineDist({ x: 1, y: 0.5 }, path)).toBe(0);
  });

  it('returns minimum distance across all segments', () => {
    expect(pointToPolylineDist({ x: 0.9, y: 0.6 }, path)).toBeCloseTo(0.1);
  });

  it('returns Infinity for empty path', () => {
    expect(pointToPolylineDist({ x: 0.5, y: 0.5 }, [])).toBe(Infinity);
  });

  it('returns point distance for single-point path', () => {
    expect(pointToPolylineDist({ x: 0, y: 0 }, [{ x: 1, y: 0 }])).toBe(1);
  });
});

describe('evaluateClick', () => {
  const point: POIPoint = {
    id: 'landmark.x',
    category: 'landmark',
    name: 'X',
    description: 'desc',
    aliases: ['x'],
    geometry: 'point',
    position: { x: 0.5, y: 0.5 },
  };

  it('hit when within threshold for a point POI', () => {
    const result = evaluateClick(point, { x: 0.51, y: 0.51 });
    expect(result.hit).toBe(true);
    expect(result.distance).toBeLessThan(HIT_THRESHOLD);
  });

  it('miss when outside threshold for a point POI', () => {
    const result = evaluateClick(point, { x: 0.6, y: 0.6 });
    expect(result.hit).toBe(false);
    expect(result.distance).toBeGreaterThan(HIT_THRESHOLD);
  });

  const polyline: POIPolyline = {
    id: 'street.x',
    category: 'street',
    name: 'X street',
    description: 'desc',
    aliases: ['x'],
    geometry: 'polyline',
    path: [
      { x: 0.3, y: 0.5 },
      { x: 0.7, y: 0.5 },
    ],
    centroid: { x: 0.5, y: 0.5 },
  };

  it('hit when click is on the polyline', () => {
    const result = evaluateClick(polyline, { x: 0.5, y: 0.5 });
    expect(result.hit).toBe(true);
    expect(result.distance).toBe(0);
  });

  it('hit when click is within tolerance perpendicular distance', () => {
    const result = evaluateClick(polyline, { x: 0.5, y: 0.51 });
    expect(result.hit).toBe(true);
    expect(result.distance).toBeCloseTo(0.01);
  });

  it('miss when click is beyond tolerance perpendicular distance', () => {
    const result = evaluateClick(polyline, { x: 0.5, y: 0.6 });
    expect(result.hit).toBe(false);
    expect(result.distance).toBeGreaterThan(POLYLINE_HIT_TOLERANCE);
  });

  it('miss when click is past the endpoint', () => {
    const result = evaluateClick(polyline, { x: 0.9, y: 0.5 });
    expect(result.hit).toBe(false);
  });
});

describe('evaluateClick size tiers', () => {
  const pointWithSize = (size?: POISize): POIPoint => ({
    id: 'landmark.x',
    category: 'landmark',
    name: 'X',
    description: 'desc',
    aliases: ['x'],
    geometry: 'point',
    position: { x: 0.5, y: 0.5 },
    ...(size ? { size } : {}),
  });

  it('defaults to the medium threshold when size is omitted', () => {
    expect(SIZE_THRESHOLDS.medium).toBe(HIT_THRESHOLD);
    const poi = pointWithSize();
    // click at distance 0.03 along x — inside medium (0.035)
    expect(evaluateClick(poi, { x: 0.53, y: 0.5 }).hit).toBe(true);
    // click at distance 0.05 — outside medium
    expect(evaluateClick(poi, { x: 0.55, y: 0.5 }).hit).toBe(false);
  });

  it('exposes the five expected tier thresholds in increasing order', () => {
    expect(SIZE_THRESHOLDS).toEqual({
      tiny: 0.015,
      small: 0.025,
      medium: 0.035,
      large: 0.055,
      huge: 0.09,
    });
  });

  it.each([
    ['tiny', 0.015],
    ['small', 0.025],
    ['medium', 0.035],
    ['large', 0.055],
    ['huge', 0.09],
  ] as const)('hits just inside and misses just outside the %s radius', (size, threshold) => {
    const poi = pointWithSize(size);
    const inside = evaluateClick(poi, { x: 0.5 + threshold - 0.002, y: 0.5 });
    const outside = evaluateClick(poi, { x: 0.5 + threshold + 0.002, y: 0.5 });
    expect(inside.hit).toBe(true);
    expect(outside.hit).toBe(false);
  });

  it('treats a huge POI click as a hit where a medium POI would miss', () => {
    const click = { x: 0.5 + 0.07, y: 0.5 }; // 0.07: outside medium, inside huge
    expect(evaluateClick(pointWithSize('huge'), click).hit).toBe(true);
    expect(evaluateClick(pointWithSize('medium'), click).hit).toBe(false);
  });

  it('still honours an explicit threshold override regardless of size', () => {
    const poi = pointWithSize('huge');
    const result = evaluateClick(poi, { x: 0.55, y: 0.5 }, 0.01);
    expect(result.hit).toBe(false);
  });
});
