import { describe, expect, it } from 'vitest';
import { applyAffine, calibratePoi, fitAffine, formatPoisTs } from './calibrate';
import type { POI, POIPolygon } from '../data/types';

describe('fitAffine', () => {
  it('recovers identity when before == after', () => {
    const t = fitAffine([
      { poiId: 'a', before: { x: 0, y: 0 }, after: { x: 0, y: 0 } },
      { poiId: 'b', before: { x: 1, y: 1 }, after: { x: 1, y: 1 } },
      { poiId: 'c', before: { x: 0.5, y: 0.5 }, after: { x: 0.5, y: 0.5 } },
    ]);
    expect(t.ax).toBeCloseTo(1);
    expect(t.bx).toBeCloseTo(0);
    expect(t.ay).toBeCloseTo(1);
    expect(t.by).toBeCloseTo(0);
  });

  it('recovers a pure translation', () => {
    const t = fitAffine([
      { poiId: 'a', before: { x: 0, y: 0 }, after: { x: 0.1, y: 0.2 } },
      { poiId: 'b', before: { x: 1, y: 1 }, after: { x: 1.1, y: 1.2 } },
    ]);
    expect(t.ax).toBeCloseTo(1);
    expect(t.bx).toBeCloseTo(0.1);
    expect(t.ay).toBeCloseTo(1);
    expect(t.by).toBeCloseTo(0.2);
  });

  it('recovers a pure scale per axis', () => {
    const t = fitAffine([
      { poiId: 'a', before: { x: 0, y: 0 }, after: { x: 0, y: 0 } },
      { poiId: 'b', before: { x: 1, y: 1 }, after: { x: 0.5, y: 2 } },
    ]);
    expect(t.ax).toBeCloseTo(0.5);
    expect(t.bx).toBeCloseTo(0);
    expect(t.ay).toBeCloseTo(2);
    expect(t.by).toBeCloseTo(0);
  });

  it('throws on too few pairs', () => {
    expect(() =>
      fitAffine([{ poiId: 'a', before: { x: 0, y: 0 }, after: { x: 0, y: 0 } }]),
    ).toThrow();
  });

  it('throws on degenerate axis-collinear input', () => {
    expect(() =>
      fitAffine([
        { poiId: 'a', before: { x: 0.5, y: 0 }, after: { x: 0.5, y: 0 } },
        { poiId: 'b', before: { x: 0.5, y: 1 }, after: { x: 0.5, y: 1 } },
      ]),
    ).toThrow();
  });
});

describe('applyAffine', () => {
  it('applies the transform per axis', () => {
    const t = { ax: 0.9, bx: 0.05, ay: 1.05, by: -0.02 };
    expect(applyAffine({ x: 0.5, y: 0.5 }, t)).toEqual({
      x: 0.9 * 0.5 + 0.05,
      y: 1.05 * 0.5 - 0.02,
    });
  });
});

describe('calibratePoi', () => {
  const t = { ax: 1, bx: 0.1, ay: 1, by: 0.2 };

  it('shifts a point POI', () => {
    const p: POI = {
      id: 'landmark.x',
      category: 'landmark',
      geometry: 'point',
      position: { x: 0.5, y: 0.5 },
      name: 'X',
      description: 'd',
      aliases: ['x'],
    };
    const r = calibratePoi(p, t);
    expect(r.geometry).toBe('point');
    if (r.geometry === 'point') {
      expect(r.position).toEqual({ x: 0.6, y: 0.7 });
    }
  });

  it('shifts every node of a polygon POI and recalculates centroid', () => {
    const p: POI = {
      id: 'street.x',
      category: 'street',
      geometry: 'polygon',
      path: [
        { x: 0.1, y: 0.2 },
        { x: 0.3, y: 0.2 },
        { x: 0.3, y: 0.4 },
        { x: 0.1, y: 0.4 },
        { x: 0.1, y: 0.2 },
      ],
      centroid: { x: 0.2, y: 0.3 },
      name: 'X',
      description: 'd',
      aliases: ['x'],
    };
    const r = calibratePoi(p, t);
    expect(r.geometry).toBe('polygon');
    if (r.geometry === 'polygon') {
      // ax=1 bx=0.1, ay=1 by=0.2 → x+0.1, y+0.2
      expect(r.path[0]!.x).toBeCloseTo(0.2);
      expect(r.path[0]!.y).toBeCloseTo(0.4);
      expect(r.path[2]!.x).toBeCloseTo(0.4);
      expect(r.path[2]!.y).toBeCloseTo(0.6);
      // centroid should shift by the same transform
      expect(r.centroid.x).toBeCloseTo(0.3);
      expect(r.centroid.y).toBeCloseTo(0.5);
    }
  });
});

describe('formatPoisTs', () => {
  it('emits polygon path + centroid in TS literal', () => {
    const polygon: POIPolygon = {
      id: 'street.example',
      category: 'street',
      name: 'Example St',
      description: 'desc',
      aliases: ['ex'],
      geometry: 'polygon',
      path: [
        { x: 0.1, y: 0.2 },
        { x: 0.3, y: 0.2 },
        { x: 0.3, y: 0.4 },
        { x: 0.1, y: 0.4 },
        { x: 0.1, y: 0.2 },
      ],
      centroid: { x: 0.2, y: 0.3 },
    };
    const out = formatPoisTs([polygon]);
    expect(out).toContain('geometry: "polygon"');
    expect(out).toContain('path: [');
    expect(out).toContain('centroid: { x: 0.2, y: 0.3 }');
    // Verify all path points are present
    expect(out).toContain('{ x: 0.1, y: 0.2 }');
    expect(out).toContain('{ x: 0.3, y: 0.4 }');
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
