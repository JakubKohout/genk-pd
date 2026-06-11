import { describe, expect, it } from 'vitest';
import { formatPoisTs, polylineCentroid } from './calibrate';
import type { POI, POIPolyline } from '../data/types';

describe('polylineCentroid', () => {
  it('returns the midpoint of a single straight segment', () => {
    const c = polylineCentroid([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
    expect(c.x).toBeCloseTo(0.5);
    expect(c.y).toBeCloseTo(0);
  });

  it('returns arc-length midpoint of an L-shaped path', () => {
    // Two unit segments, total length 2, midpoint at end of first segment
    const c = polylineCentroid([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ]);
    expect(c.x).toBeCloseTo(1);
    expect(c.y).toBeCloseTo(0);
  });

  it('handles single-point degenerate input', () => {
    expect(polylineCentroid([{ x: 0.3, y: 0.7 }])).toEqual({ x: 0.3, y: 0.7 });
  });

  it('handles empty input', () => {
    expect(polylineCentroid([])).toEqual({ x: 0, y: 0 });
  });
});

describe('formatPoisTs', () => {
  it('emits polyline path + centroid in TS literal', () => {
    const polyline: POIPolyline = {
      id: 'street.example',
      category: 'street',
      name: 'Example St',
      description: 'desc',
      aliases: ['ex'],
      geometry: 'polyline',
      path: [
        { x: 0.1, y: 0.2 },
        { x: 0.3, y: 0.2 },
        { x: 0.5, y: 0.2 },
      ],
      centroid: { x: 0.3, y: 0.2 },
    };
    const out = formatPoisTs([polyline]);
    expect(out).toContain('geometry: "polyline"');
    expect(out).toContain('path: [');
    expect(out).toContain('centroid: { x: 0.3, y: 0.2 }');
    expect(out).toContain('{ x: 0.1, y: 0.2 }');
    expect(out).toContain('{ x: 0.5, y: 0.2 }');
  });

  it('emits point geometry without path or centroid', () => {
    const point: POI = {
      id: 'landmark.y',
      category: 'landmark',
      name: 'Point Y',
      description: 'desc',
      aliases: ['y'],
      geometry: 'point',
      position: { x: 0.5, y: 0.5 },
    };
    const out = formatPoisTs([point]);
    expect(out).toContain('geometry: "point"');
    expect(out).toContain('position: { x: 0.5, y: 0.5 }');
    expect(out).not.toContain('path:');
    expect(out).not.toContain('centroid:');
  });
});
