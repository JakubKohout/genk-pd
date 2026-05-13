import { describe, expect, it } from 'vitest';
import { suggestPois, POI_AUTOCOMPLETE_MAX_RESULTS } from './suggest';
import type { POI } from '../data/types';

const pois: POI[] = [
  {
    id: 'landmark.vinewood-sign',
    category: 'landmark',
    geometry: 'point',
    position: { x: 0.31, y: 0.55 },
    name: 'Vinewood Sign',
    description: 'desc',
    aliases: ['vinewood', 'cedule', 'hollywood sign'],
  },
  {
    id: 'landmark.vinewood-lake',
    category: 'landmark',
    geometry: 'point',
    position: { x: 0.5, y: 0.6 },
    name: 'Vinewood Lake',
    description: 'desc',
    aliases: ['jezero vinewood'],
  },
  {
    id: 'street.olympic-fwy',
    category: 'street',
    geometry: 'polygon',
    path: [
      { x: 0, y: 0.49 },
      { x: 1, y: 0.49 },
      { x: 1, y: 0.51 },
      { x: 0, y: 0.51 },
      { x: 0, y: 0.49 },
    ],
    centroid: { x: 0.5, y: 0.5 },
    name: 'Olympic Fwy',
    description: 'desc',
    aliases: ['olympic'],
  },
];

describe('suggestPois', () => {
  it('returns empty for input shorter than min length', () => {
    expect(suggestPois('', pois)).toEqual([]);
    expect(suggestPois('v', pois)).toEqual([]);
  });

  it('matches by name substring after normalize', () => {
    const results = suggestPois('vine', pois);
    expect(results.map((p) => p.id)).toEqual([
      'landmark.vinewood-sign',
      'landmark.vinewood-lake',
    ]);
  });

  it('matches by alias substring', () => {
    const results = suggestPois('cedu', pois);
    expect(results[0]?.id).toBe('landmark.vinewood-sign');
  });

  it('respects excludeIds (already-found POIs)', () => {
    const results = suggestPois('vine', pois, new Set(['landmark.vinewood-sign']));
    expect(results.map((p) => p.id)).toEqual(['landmark.vinewood-lake']);
  });

  it('caps results to max', () => {
    const many: POI[] = Array.from({ length: 20 }, (_, i) => ({
      id: `landmark.test-${i}`,
      category: 'landmark',
      geometry: 'point',
      position: { x: 0.5, y: 0.5 },
      name: `Test ${i}`,
      description: 'desc',
      aliases: ['test'],
    }));
    expect(suggestPois('test', many).length).toBeLessThanOrEqual(POI_AUTOCOMPLETE_MAX_RESULTS);
  });

  it('sorts by best match position then by name length', () => {
    const sample: POI[] = [
      {
        id: 'landmark.long',
        category: 'landmark',
        geometry: 'point',
        position: { x: 0, y: 0 },
        name: 'Far away from match here',
        description: 'desc',
        aliases: [],
      },
      {
        id: 'landmark.short',
        category: 'landmark',
        geometry: 'point',
        position: { x: 0, y: 0 },
        name: 'Match',
        description: 'desc',
        aliases: [],
      },
    ];
    const results = suggestPois('match', sample);
    // 'match' starts at pos 0 in 'Match' but pos 16 in 'Far away from match here'
    expect(results[0]?.id).toBe('landmark.short');
    expect(results[1]?.id).toBe('landmark.long');
  });
});
