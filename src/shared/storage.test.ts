import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetCacheForTests,
  STORAGE_KEY_FOR_TESTS,
  initialState,
  loadState,
  saveState,
} from './storage';

const DEFAULT_CATEGORY_FILTER = {
  street: true,
  landmark: true,
  pd: true,
  fire: true,
  ems: true,
  ammu: true,
};

beforeEach(() => {
  localStorage.clear();
  __resetCacheForTests();
});

afterEach(() => {
  localStorage.clear();
  __resetCacheForTests();
});

describe('storage migration', () => {
  it('returns initialState (schemaVersion 5) when no data exists', () => {
    const state = loadState();
    expect(state.schemaVersion).toBe(5);
    expect(state.codes.progress).toEqual({});
    expect(state.lea.progress).toEqual({});
    expect(state.lea.turn).toBe(0);
    expect(state.penal.scenarios).toEqual({ progress: {}, turn: 0 });
    expect(state.penal.recall).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.blind).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.name).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.settings.categoryFilter).toEqual(DEFAULT_CATEGORY_FILTER);
  });

  it('migrates a stored v1 payload all the way to v5', () => {
    const v1 = {
      schemaVersion: 1,
      codes: {
        progress: { '10-4': { score: 2, lastAskedAtTurn: 5 } },
        turn: 7,
        settings: { importanceFilter: { mandatory: true, rare: false, unnecessary: false } },
      },
    };
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, JSON.stringify(v1));
    __resetCacheForTests();
    const state = loadState();
    expect(state.schemaVersion).toBe(5);
    expect(state.codes.progress).toEqual({ '10-4': { score: 2, lastAskedAtTurn: 5 } });
    expect(state.codes.turn).toBe(7);
    expect(state.lea).toEqual({ progress: {}, turn: 0 });
    expect(state.penal.scenarios).toEqual({ progress: {}, turn: 0 });
    expect(state.penal.recall).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.blind).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.name).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.settings.categoryFilter).toEqual(DEFAULT_CATEGORY_FILTER);
  });

  it('migrates a stored v2 payload to v5, preserving codes and lea', () => {
    const v2 = {
      schemaVersion: 2,
      codes: {
        progress: { '10-4': { score: 2, lastAskedAtTurn: 5 } },
        turn: 7,
        settings: { importanceFilter: { mandatory: true, rare: false, unnecessary: false } },
      },
      lea: {
        progress: { 'lea.7': { score: 2, lastAskedAtTurn: 3 } },
        turn: 4,
      },
    };
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, JSON.stringify(v2));
    __resetCacheForTests();
    const state = loadState();
    expect(state.schemaVersion).toBe(5);
    expect(state.codes.progress).toEqual({ '10-4': { score: 2, lastAskedAtTurn: 5 } });
    expect(state.lea.progress).toEqual({ 'lea.7': { score: 2, lastAskedAtTurn: 3 } });
    expect(state.lea.turn).toBe(4);
    expect(state.penal.scenarios).toEqual({ progress: {}, turn: 0 });
    expect(state.penal.recall).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.blind).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.name).toEqual({ progress: {}, turn: 0 });
  });

  it('migrates a stored v3 payload to v5, preserving all prior slices', () => {
    const v3 = {
      schemaVersion: 3,
      codes: {
        progress: { '10-4': { score: 2, lastAskedAtTurn: 5 } },
        turn: 7,
        settings: { importanceFilter: { mandatory: true, rare: false, unnecessary: false } },
      },
      lea: {
        progress: { 'lea.7': { score: 2, lastAskedAtTurn: 3 } },
        turn: 4,
      },
      penal: {
        scenarios: {
          progress: { 'penal.scenario.A1': { score: 2, lastAskedAtTurn: 0 } },
          turn: 1,
        },
        recall: {
          progress: { 'penal.25': { score: -2, lastAskedAtTurn: 2 } },
          turn: 5,
        },
      },
    };
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, JSON.stringify(v3));
    __resetCacheForTests();
    const state = loadState();
    expect(state.schemaVersion).toBe(5);
    expect(state.codes.progress).toEqual({ '10-4': { score: 2, lastAskedAtTurn: 5 } });
    expect(state.lea.progress).toEqual({ 'lea.7': { score: 2, lastAskedAtTurn: 3 } });
    expect(state.penal.scenarios.progress).toEqual({
      'penal.scenario.A1': { score: 2, lastAskedAtTurn: 0 },
    });
    expect(state.penal.recall.progress).toEqual({
      'penal.25': { score: -2, lastAskedAtTurn: 2 },
    });
    expect(state.geo.blind).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.name).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.settings.categoryFilter).toEqual(DEFAULT_CATEGORY_FILTER);
  });

  it('migrates a stored v4 payload to v5, wiping geo progress but preserving everything else', () => {
    // v4 had geo POI IDs that the v5 dataset replaces wholesale — progress is reset
    // intentionally. Settings (categoryFilter) carry over with new categories backfilled.
    const v4 = {
      schemaVersion: 4,
      codes: {
        progress: { '10-4': { score: 2, lastAskedAtTurn: 5 } },
        turn: 7,
        settings: { importanceFilter: { mandatory: true, rare: false, unnecessary: false } },
      },
      lea: { progress: { 'lea.7': { score: 2, lastAskedAtTurn: 3 } }, turn: 4 },
      penal: {
        scenarios: { progress: { 'penal.A1': { score: 2, lastAskedAtTurn: 0 } }, turn: 1 },
        recall: { progress: { 'penal.25': { score: -2, lastAskedAtTurn: 2 } }, turn: 5 },
      },
      geo: {
        blind: {
          progress: { 'landmark.maják': { score: 2, lastAskedAtTurn: 0 } },
          turn: 5,
        },
        name: {
          progress: { 'street.olympic-fwy': { score: -1, lastAskedAtTurn: 2 } },
          turn: 3,
        },
        settings: { categoryFilter: { street: false, landmark: true, pd: true } },
      },
    };
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, JSON.stringify(v4));
    __resetCacheForTests();
    const state = loadState();
    expect(state.schemaVersion).toBe(5);
    expect(state.codes.progress).toEqual({ '10-4': { score: 2, lastAskedAtTurn: 5 } });
    expect(state.lea.progress).toEqual({ 'lea.7': { score: 2, lastAskedAtTurn: 3 } });
    expect(state.penal.scenarios.progress).toEqual({
      'penal.A1': { score: 2, lastAskedAtTurn: 0 },
    });
    expect(state.geo.blind).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.name).toEqual({ progress: {}, turn: 0 });
    // Old filter preserved + new categories backfilled to default (true)
    expect(state.geo.settings.categoryFilter).toEqual({
      street: false,
      landmark: true,
      pd: true,
      fire: true,
      ems: true,
      ammu: true,
    });
  });

  it('round-trips v5 saves with geo slice', () => {
    const next = JSON.parse(JSON.stringify(initialState));
    next.lea.progress = { 'lea.7': { score: 2, lastAskedAtTurn: 1 } };
    next.lea.turn = 3;
    next.penal.scenarios.progress = { 'penal.scenario.A1': { score: 2, lastAskedAtTurn: 0 } };
    next.penal.scenarios.turn = 1;
    next.penal.recall.progress = { 'penal.25': { score: -2, lastAskedAtTurn: 2 } };
    next.penal.recall.turn = 5;
    next.geo.blind.progress = { 'landmark.vinewood-sign': { score: 2, lastAskedAtTurn: 0 } };
    next.geo.blind.turn = 2;
    next.geo.name.progress = { 'street.olympic-fwy': { score: -1, lastAskedAtTurn: 1 } };
    next.geo.name.turn = 3;
    next.geo.settings.categoryFilter = {
      ...DEFAULT_CATEGORY_FILTER,
      street: true,
      landmark: false,
      pd: true,
    };
    saveState(next);
    __resetCacheForTests();
    const reloaded = loadState();
    expect(reloaded.lea.progress).toEqual({ 'lea.7': { score: 2, lastAskedAtTurn: 1 } });
    expect(reloaded.lea.turn).toBe(3);
    expect(reloaded.penal.scenarios.progress).toEqual({
      'penal.scenario.A1': { score: 2, lastAskedAtTurn: 0 },
    });
    expect(reloaded.penal.recall.progress).toEqual({
      'penal.25': { score: -2, lastAskedAtTurn: 2 },
    });
    expect(reloaded.geo.blind.progress).toEqual({
      'landmark.vinewood-sign': { score: 2, lastAskedAtTurn: 0 },
    });
    expect(reloaded.geo.blind.turn).toBe(2);
    expect(reloaded.geo.name.progress).toEqual({
      'street.olympic-fwy': { score: -1, lastAskedAtTurn: 1 },
    });
    expect(reloaded.geo.name.turn).toBe(3);
    expect(reloaded.geo.settings.categoryFilter.landmark).toBe(false);
    expect(reloaded.geo.settings.categoryFilter.street).toBe(true);
  });

  it('returns initialState when stored JSON is malformed', () => {
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, '{ not json');
    __resetCacheForTests();
    const state = loadState();
    expect(state).toEqual(initialState);
  });

  it('reads a v5 payload with missing geo slice as v5 with empty geo (no data loss)', () => {
    const partial = {
      schemaVersion: 5,
      codes: {
        progress: { '10-4': { score: 2, lastAskedAtTurn: 5 } },
        turn: 7,
        settings: { importanceFilter: { mandatory: true, rare: false, unnecessary: false } },
      },
      lea: { progress: { 'lea.7': { score: 2, lastAskedAtTurn: 1 } }, turn: 2 },
      penal: {
        scenarios: { progress: {}, turn: 0 },
        recall: { progress: {}, turn: 0 },
      },
      // geo missing
    };
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, JSON.stringify(partial));
    __resetCacheForTests();
    const state = loadState();
    expect(state.schemaVersion).toBe(5);
    expect(state.codes.progress).toEqual({ '10-4': { score: 2, lastAskedAtTurn: 5 } });
    expect(state.lea.progress).toEqual({ 'lea.7': { score: 2, lastAskedAtTurn: 1 } });
    expect(state.geo.blind).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.name).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.settings.categoryFilter).toEqual(DEFAULT_CATEGORY_FILTER);
  });

  it('reads a v5 payload with partial categoryFilter (backfills new categories)', () => {
    const partial = {
      schemaVersion: 5,
      codes: {
        progress: {},
        turn: 0,
        settings: { importanceFilter: { mandatory: true, rare: true, unnecessary: true } },
      },
      lea: { progress: {}, turn: 0 },
      penal: {
        scenarios: { progress: {}, turn: 0 },
        recall: { progress: {}, turn: 0 },
      },
      geo: {
        blind: {
          progress: { 'landmark.lsia': { score: 2, lastAskedAtTurn: 0 } },
          turn: 1,
        },
        // name missing
        settings: { categoryFilter: { street: false, landmark: true, pd: true } },
      },
    };
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, JSON.stringify(partial));
    __resetCacheForTests();
    const state = loadState();
    expect(state.geo.blind.progress).toEqual({
      'landmark.lsia': { score: 2, lastAskedAtTurn: 0 },
    });
    expect(state.geo.name).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.settings.categoryFilter).toEqual({
      street: false,
      landmark: true,
      pd: true,
      fire: true,
      ems: true,
      ammu: true,
    });
  });

  it('reads a v3 payload with missing penal slice and migrates to v5', () => {
    const partial = {
      schemaVersion: 3,
      codes: {
        progress: { '10-4': { score: 2, lastAskedAtTurn: 5 } },
        turn: 7,
        settings: { importanceFilter: { mandatory: true, rare: false, unnecessary: false } },
      },
      lea: { progress: { 'lea.7': { score: 2, lastAskedAtTurn: 1 } }, turn: 2 },
      // penal missing — v3 migration tolerates it
    };
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, JSON.stringify(partial));
    __resetCacheForTests();
    const state = loadState();
    expect(state.schemaVersion).toBe(5);
    expect(state.codes.progress).toEqual({ '10-4': { score: 2, lastAskedAtTurn: 5 } });
    expect(state.lea.progress).toEqual({ 'lea.7': { score: 2, lastAskedAtTurn: 1 } });
    expect(state.penal.scenarios).toEqual({ progress: {}, turn: 0 });
    expect(state.penal.recall).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.blind).toEqual({ progress: {}, turn: 0 });
  });
});
