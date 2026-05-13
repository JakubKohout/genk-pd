import { describe, expect, it } from 'vitest';
import { eligiblePois, isGeoComplete, pickNextPoi } from './selection';
import type { POI } from '../data/types';
import type { GeoCategoryFilter } from '@/shared/storage';

const allCats: GeoCategoryFilter = { street: true, landmark: true, pd: true, fire: true, ems: true, ammu: true };

const pois: POI[] = [
  {
    id: 'landmark.a',
    category: 'landmark',
    geometry: 'point',
    position: { x: 0, y: 0 },
    name: 'A',
    description: 'd',
    aliases: ['a'],
  },
  {
    id: 'street.b',
    category: 'street',
    geometry: 'polyline',
    path: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
    name: 'B',
    description: 'd',
    aliases: ['b'],
  },
  {
    id: 'pd.c',
    category: 'pd',
    geometry: 'point',
    position: { x: 0.5, y: 0.5 },
    name: 'C',
    description: 'd',
    aliases: ['c'],
  },
];

describe('eligiblePois', () => {
  it('returns all pois when nothing mastered and all categories enabled', () => {
    const result = eligiblePois({ progress: {}, turn: 0 }, pois, allCats);
    expect(result).toEqual(pois);
  });

  it('excludes mastered POIs (score >= 2)', () => {
    const progress = { 'landmark.a': { score: 2, lastAskedAtTurn: 0 } };
    const result = eligiblePois({ progress, turn: 0 }, pois, allCats);
    expect(result.map((p) => p.id)).toEqual(['street.b', 'pd.c']);
  });

  it('excludes disabled categories', () => {
    const filter: GeoCategoryFilter = { street: false, landmark: true, pd: true, fire: true, ems: true, ammu: true };
    const result = eligiblePois({ progress: {}, turn: 0 }, pois, filter);
    expect(result.map((p) => p.id)).toEqual(['landmark.a', 'pd.c']);
  });

  it('combines filters with mastery', () => {
    const filter: GeoCategoryFilter = { street: true, landmark: false, pd: true, fire: true, ems: true, ammu: true };
    const progress = { 'pd.c': { score: 2, lastAskedAtTurn: 0 } };
    const result = eligiblePois({ progress, turn: 0 }, pois, filter);
    expect(result.map((p) => p.id)).toEqual(['street.b']);
  });
});

describe('isGeoComplete', () => {
  it('false when any POI is unmastered in enabled categories', () => {
    expect(isGeoComplete({ progress: {}, turn: 0 }, pois, allCats)).toBe(false);
  });

  it('true when all POIs in enabled categories are mastered', () => {
    const progress = {
      'landmark.a': { score: 2, lastAskedAtTurn: 0 },
      'street.b': { score: 2, lastAskedAtTurn: 0 },
      'pd.c': { score: 2, lastAskedAtTurn: 0 },
    };
    expect(isGeoComplete({ progress, turn: 0 }, pois, allCats)).toBe(true);
  });

  it('true when only enabled categories are mastered (filter scope)', () => {
    const filter: GeoCategoryFilter = { street: true, landmark: false, pd: false, fire: true, ems: true, ammu: true };
    const progress = { 'street.b': { score: 2, lastAskedAtTurn: 0 } };
    expect(isGeoComplete({ progress, turn: 0 }, pois, filter)).toBe(true);
  });
});

describe('pickNextPoi', () => {
  it('returns null when no eligible POIs remain', () => {
    const filter: GeoCategoryFilter = { street: false, landmark: false, pd: false, fire: true, ems: true, ammu: true };
    expect(pickNextPoi({ progress: {}, turn: 0 }, pois, filter)).toBeNull();
  });

  it('returns a POI from the eligible pool', () => {
    const filter: GeoCategoryFilter = { street: false, landmark: true, pd: false, fire: true, ems: true, ammu: true };
    const result = pickNextPoi({ progress: {}, turn: 0 }, pois, filter);
    expect(result?.id).toBe('landmark.a');
  });
});
