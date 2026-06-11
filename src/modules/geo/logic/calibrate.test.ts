import { describe, expect, it } from 'vitest';
import { formatPoisTs, polylineCentroid, toleranceRing } from './calibrate';
import { fromLatLng } from './coords';
import { distance } from './hitTest';
import type { POI, POIPolyline, TileMeta } from '../data/types';

const META: TileMeta = { width: 8192, height: 12288, maxZoom: 3, tileSize: 256 };

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
      category: 'city',
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

  it('preserves the size tier for point POIs that define one', () => {
    const point: POI = {
      id: 'landmark.big',
      category: 'city',
      name: 'Big',
      description: 'desc',
      aliases: ['b'],
      geometry: 'point',
      position: { x: 0.5, y: 0.5 },
      size: 'huge',
    };
    const out = formatPoisTs([point]);
    expect(out).toContain('size: "huge"');
  });

  it('omits the size line for POIs without a size', () => {
    const point: POI = {
      id: 'landmark.plain',
      category: 'city',
      name: 'Plain',
      description: 'desc',
      aliases: ['p'],
      geometry: 'point',
      position: { x: 0.5, y: 0.5 },
    };
    const out = formatPoisTs([point]);
    expect(out).not.toContain('size:');
  });
});

describe('toleranceRing', () => {
  const center = { x: 0.5, y: 0.4 };
  const radius = 0.035;

  it('returns the requested number of ring points', () => {
    expect(toleranceRing(center, radius, META, 64)).toHaveLength(64);
  });

  it('places every point at the radius distance from center in normalized space', () => {
    for (const latlng of toleranceRing(center, radius, META, 32)) {
      const back = fromLatLng({ lat: latlng[0], lng: latlng[1] }, META);
      expect(distance(back, center)).toBeCloseTo(radius, 5);
    }
  });

  it('renders as an ellipse in pixel space (taller than wide on a portrait map)', () => {
    const ring = toleranceRing(center, radius, META, 64);
    const lats = ring.map((p) => p[0]);
    const lngs = ring.map((p) => p[1]);
    const xExtent = Math.max(...lngs) - Math.min(...lngs);
    const yExtent = Math.max(...lats) - Math.min(...lats);
    // semi-axes: radius*width in x, radius*height in y → full extent is 2× that
    expect(xExtent).toBeCloseTo(2 * radius * META.width, 0);
    expect(yExtent).toBeCloseTo(2 * radius * META.height, 0);
    expect(yExtent).toBeGreaterThan(xExtent);
  });
});
