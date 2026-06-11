import { describe, expect, it } from 'vitest';
import { matchPoi } from './match';
import type { POI } from '../data/types';

const pois: POI[] = [
  {
    id: 'landmark.vinewood-sign',
    category: 'city',
    geometry: 'point',
    position: { x: 0.31, y: 0.55 },
    name: 'Vinewood Sign',
    description: 'desc',
    aliases: ['vinewood', 'cedule', 'hollywood sign'],
  },
  {
    id: 'street.olympic-fwy',
    category: 'street',
    geometry: 'polyline',
    path: [
      { x: 0, y: 0.5 },
      { x: 1, y: 0.5 },
    ],
    centroid: { x: 0.5, y: 0.5 },
    name: 'Olympic Fwy',
    description: 'desc',
    aliases: ['olympic'],
  },
];

describe('matchPoi', () => {
  it('matches exact name after normalize (case + diacritics insensitive)', () => {
    expect(matchPoi('Vinewood Sign', pois)?.id).toBe('landmark.vinewood-sign');
    expect(matchPoi('vinewood sign', pois)?.id).toBe('landmark.vinewood-sign');
    expect(matchPoi('  VINEWOOD   sign  ', pois)?.id).toBe('landmark.vinewood-sign');
  });

  it('matches any alias', () => {
    expect(matchPoi('cedule', pois)?.id).toBe('landmark.vinewood-sign');
    expect(matchPoi('hollywood sign', pois)?.id).toBe('landmark.vinewood-sign');
    expect(matchPoi('olympic', pois)?.id).toBe('street.olympic-fwy');
  });

  it('returns null for non-matching input', () => {
    expect(matchPoi('asdf', pois)).toBeNull();
    expect(matchPoi('', pois)).toBeNull();
    expect(matchPoi('   ', pois)).toBeNull();
  });

  it('does not match substrings (strict equality)', () => {
    expect(matchPoi('vinewood s', pois)).toBeNull();
  });
});
