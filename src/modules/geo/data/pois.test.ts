import { describe, expect, it } from 'vitest';
import { POIS, POI_BY_ID } from './pois';
import { normalize } from '@/shared/text/normalize';
import { pointInPolygon } from '@/modules/geo/logic/hitTest';

describe('POI dataset', () => {
  it('has the expected POI counts across categories', () => {
    expect(POIS.length).toBeGreaterThanOrEqual(60);
    const byCategory = {
      street: POIS.filter((p) => p.category === 'street').length,
      landmark: POIS.filter((p) => p.category === 'landmark').length,
      pd: POIS.filter((p) => p.category === 'pd').length,
      fire: POIS.filter((p) => p.category === 'fire').length,
      ems: POIS.filter((p) => p.category === 'ems').length,
      ammu: POIS.filter((p) => p.category === 'ammu').length,
    };
    expect(byCategory.street).toBeGreaterThanOrEqual(15);
    expect(byCategory.landmark).toBeGreaterThanOrEqual(30);
    expect(byCategory.pd).toBeGreaterThanOrEqual(2);
    expect(byCategory.fire).toBeGreaterThanOrEqual(1);
    expect(byCategory.ems).toBeGreaterThanOrEqual(1);
    expect(byCategory.ammu).toBeGreaterThanOrEqual(1);
  });

  it('has unique IDs', () => {
    const ids = POIS.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('uses canonical id prefix per category', () => {
    for (const p of POIS) {
      expect(p.id.startsWith(`${p.category}.`)).toBe(true);
    }
  });

  it('has non-empty name and description for each POI', () => {
    for (const p of POIS) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
    }
  });

  it('has at least one alias per POI', () => {
    for (const p of POIS) {
      expect(p.aliases.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('has aliases that do not collide with the name itself after normalize', () => {
    for (const p of POIS) {
      const normName = normalize(p.name);
      for (const alias of p.aliases) {
        expect(normalize(alias)).not.toBe(normName);
      }
    }
  });

  it('has unique aliases within each POI after normalize', () => {
    for (const p of POIS) {
      const normalized = p.aliases.map(normalize);
      const unique = new Set(normalized);
      expect(unique.size).toBe(normalized.length);
    }
  });

  it('has point coords in [0,1] for landmark and pd POIs', () => {
    for (const p of POIS) {
      if (p.geometry === 'point') {
        expect(p.position.x).toBeGreaterThanOrEqual(0);
        expect(p.position.x).toBeLessThanOrEqual(1);
        expect(p.position.y).toBeGreaterThanOrEqual(0);
        expect(p.position.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('has polygon path with at least 4 closed points and all coords in [0,1] for streets', () => {
    for (const p of POIS) {
      if (p.category === 'street') {
        expect(p.geometry).toBe('polygon');
        if (p.geometry !== 'polygon') continue;
        expect(p.path.length).toBeGreaterThanOrEqual(4);
        // Closed ring: first === last
        const first = p.path[0]!;
        const last = p.path[p.path.length - 1]!;
        expect(first.x).toBeCloseTo(last.x);
        expect(first.y).toBeCloseTo(last.y);
        for (const pt of p.path) {
          expect(pt.x).toBeGreaterThanOrEqual(0);
          expect(pt.x).toBeLessThanOrEqual(1);
          expect(pt.y).toBeGreaterThanOrEqual(0);
          expect(pt.y).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('has centroid inside polygon for each street', () => {
    for (const p of POIS) {
      if (p.geometry === 'polygon') {
        expect(pointInPolygon(p.centroid, p.path)).toBe(true);
        expect(p.centroid.x).toBeGreaterThanOrEqual(0);
        expect(p.centroid.x).toBeLessThanOrEqual(1);
        expect(p.centroid.y).toBeGreaterThanOrEqual(0);
        expect(p.centroid.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('exposes a POI_BY_ID lookup matching POIS', () => {
    expect(Object.keys(POI_BY_ID).length).toBe(POIS.length);
    for (const p of POIS) {
      expect(POI_BY_ID[p.id]).toBe(p);
    }
  });

  it('uses polygon geometry only for streets, point for everything else', () => {
    for (const p of POIS) {
      if (p.category === 'street') {
        expect(p.geometry).toBe('polygon');
      } else {
        expect(p.geometry).toBe('point');
      }
    }
  });
});
