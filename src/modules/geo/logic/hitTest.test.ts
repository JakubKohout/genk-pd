import { describe, expect, it } from 'vitest';
import {
  HIT_THRESHOLD,
  distance,
  evaluateClick,
  pointInPolygon,
  pointToPolygonEdgeDist,
  pointToPolylineDist,
  pointToSegmentDist,
  polygonHit,
} from './hitTest';
import type { POIPoint, POIPolygon, POIStreet } from '../data/types';

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

  const polygon: POIPolygon = {
    id: 'street.x',
    category: 'street',
    name: 'X street',
    description: 'desc',
    aliases: ['x'],
    geometry: 'polygon',
    path: [
      { x: 0.3, y: 0.4 },
      { x: 0.7, y: 0.4 },
      { x: 0.7, y: 0.6 },
      { x: 0.3, y: 0.6 },
      { x: 0.3, y: 0.4 },
    ],
    centroid: { x: 0.5, y: 0.5 },
  };

  it('hit inside polygon', () => {
    const result = evaluateClick(polygon, { x: 0.5, y: 0.5 });
    expect(result.hit).toBe(true);
  });

  it('hit just outside polygon within tolerance', () => {
    const result = evaluateClick(polygon, { x: 0.71, y: 0.5 });
    expect(result.hit).toBe(true); // 0.01 outside, default tolerance 0.015
  });

  it('miss far outside polygon', () => {
    const result = evaluateClick(polygon, { x: 0.85, y: 0.5 });
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

describe('pointToPolygonEdgeDist', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: 0, y: 0 },
  ];

  it('returns 0 for a point on an edge', () => {
    expect(pointToPolygonEdgeDist({ x: 0.5, y: 0 }, square)).toBe(0);
    expect(pointToPolygonEdgeDist({ x: 1, y: 0.7 }, square)).toBe(0);
  });

  it('returns shortest perpendicular distance for inside point', () => {
    // Center of unit square — equidistant from all 4 edges, distance = 0.5
    expect(pointToPolygonEdgeDist({ x: 0.5, y: 0.5 }, square)).toBeCloseTo(0.5);
  });

  it('returns shortest perpendicular distance for outside point', () => {
    expect(pointToPolygonEdgeDist({ x: 1.2, y: 0.5 }, square)).toBeCloseTo(0.2);
    expect(pointToPolygonEdgeDist({ x: -0.1, y: 0.5 }, square)).toBeCloseTo(0.1);
  });
});

describe('polygonHit', () => {
  const square = [
    { x: 0.4, y: 0.4 },
    { x: 0.6, y: 0.4 },
    { x: 0.6, y: 0.6 },
    { x: 0.4, y: 0.6 },
    { x: 0.4, y: 0.4 },
  ];

  it('hit when click is inside polygon (no tolerance needed)', () => {
    expect(polygonHit(square, { x: 0.5, y: 0.5 }, 0.015)).toBe(true);
  });

  it('hit when click is outside but within edge tolerance', () => {
    expect(polygonHit(square, { x: 0.61, y: 0.5 }, 0.015)).toBe(true); // 0.01 outside, tol 0.015
  });

  it('miss when click is outside and beyond tolerance', () => {
    expect(polygonHit(square, { x: 0.7, y: 0.5 }, 0.015)).toBe(false); // 0.1 outside, tol 0.015
  });

  it('hit on a corner within tolerance', () => {
    // 0.01 diagonal outside top-right corner
    expect(polygonHit(square, { x: 0.607, y: 0.607 }, 0.015)).toBe(true);
  });
});
