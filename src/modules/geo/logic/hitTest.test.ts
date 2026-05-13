import { describe, expect, it } from 'vitest';
import {
  HIT_THRESHOLD,
  distance,
  evaluateClick,
  pointInPolygon,
  pointToPolylineDist,
  pointToSegmentDist,
} from './hitTest';
import type { POIPoint, POIStreet } from '../data/types';

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
    // closer to second segment than to first
    expect(pointToPolylineDist({ x: 0.9, y: 0.6 }, path)).toBeCloseTo(0.1);
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

  const street: POIStreet = {
    id: 'street.x',
    category: 'street',
    name: 'X street',
    description: 'desc',
    aliases: ['x'],
    geometry: 'polyline',
    path: [
      { x: 0, y: 0.5 },
      { x: 1, y: 0.5 },
    ],
  };

  it('hit anywhere along a polyline within threshold', () => {
    const result = evaluateClick(street, { x: 0.3, y: 0.51 });
    expect(result.hit).toBe(true);
  });

  it('miss when perpendicular distance exceeds threshold', () => {
    const result = evaluateClick(street, { x: 0.3, y: 0.6 });
    expect(result.hit).toBe(false);
  });
});

describe('pointInPolygon', () => {
  // Unit square: [0,0] - [1,0] - [1,1] - [0,1] - [0,0]
  const square = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: 0, y: 0 },
  ];

  it('returns true for a point in the center of a convex polygon', () => {
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, square)).toBe(true);
  });

  it('returns false for a point clearly outside', () => {
    expect(pointInPolygon({ x: 1.5, y: 0.5 }, square)).toBe(false);
    expect(pointInPolygon({ x: -0.1, y: 0.5 }, square)).toBe(false);
    expect(pointInPolygon({ x: 0.5, y: 1.5 }, square)).toBe(false);
  });

  it('handles concave polygon correctly', () => {
    // C-shape: rect with notch on the right
    const cshape = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.3 },
      { x: 0.4, y: 0.3 },
      { x: 0.4, y: 0.7 },
      { x: 1, y: 0.7 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
    ];
    expect(pointInPolygon({ x: 0.2, y: 0.5 }, cshape)).toBe(true); // inside left arm
    expect(pointInPolygon({ x: 0.7, y: 0.5 }, cshape)).toBe(false); // in the notch
  });

  it('returns false for empty or degenerate input', () => {
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, [])).toBe(false);
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, [{ x: 0, y: 0 }])).toBe(false);
  });
});
