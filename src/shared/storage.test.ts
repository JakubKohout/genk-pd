import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetCacheForTests,
  STORAGE_KEY_FOR_TESTS,
  initialState,
  loadState,
  saveState,
} from './storage';

const STORAGE_KEY = STORAGE_KEY_FOR_TESTS;

const DEFAULT_CATEGORY_FILTER = {
  street: true,
  highway: true,
  city: true,
  state: true,
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
  it('returns initialState (schemaVersion 8) when no data exists', () => {
    const state = loadState();
    expect(state.schemaVersion).toBe(8);
    expect(state.codes.progress).toEqual({});
    expect(state.penal.recall).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.blind).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.name).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.settings.categoryFilter).toEqual(DEFAULT_CATEGORY_FILTER);
    expect(state.law.progress).toEqual({});
    expect(state.law.turn).toBe(0);
    // lea and sasp are gone
    expect((state as any).lea).toBeUndefined();
    expect((state as any).sasp).toBeUndefined();
    expect((state as any).penal?.scenarios).toBeUndefined();
  });

  it('migrates a stored v1 payload all the way to v8', () => {
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
    expect(state.schemaVersion).toBe(8);
    expect(state.codes.progress).toEqual({ '10-4': { score: 2, lastAskedAtTurn: 5 } });
    expect(state.codes.turn).toBe(7);
    expect(state.penal.recall).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.blind).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.name).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.settings.categoryFilter).toEqual(DEFAULT_CATEGORY_FILTER);
    expect((state as any).lea).toBeUndefined();
    expect((state as any).sasp).toBeUndefined();
  });

  it('migrates a stored v2 payload to v8, preserving codes (lea dropped)', () => {
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
    expect(state.schemaVersion).toBe(8);
    expect(state.codes.progress).toEqual({ '10-4': { score: 2, lastAskedAtTurn: 5 } });
    // lea progress migrated into law.progress
    expect(state.law.progress['lea.7']).toEqual({ score: 2, lastAskedAtTurn: 3 });
    expect((state as any).lea).toBeUndefined();
    expect(state.penal.recall).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.blind).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.name).toEqual({ progress: {}, turn: 0 });
  });

  it('migrates a stored v3 payload to v8, preserving penal.recall', () => {
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
    expect(state.schemaVersion).toBe(8);
    expect(state.codes.progress).toEqual({ '10-4': { score: 2, lastAskedAtTurn: 5 } });
    // lea + penal.scenarios migrated into law.progress
    expect(state.law.progress['lea.7']).toEqual({ score: 2, lastAskedAtTurn: 3 });
    expect(state.law.progress['penal.scenario.A1']).toEqual({ score: 2, lastAskedAtTurn: 0 });
    // penal.recall preserved
    expect(state.penal.recall.progress).toEqual({
      'penal.25': { score: -2, lastAskedAtTurn: 2 },
    });
    expect((state as any).lea).toBeUndefined();
    expect((state as any).sasp).toBeUndefined();
    expect((state as any).penal?.scenarios).toBeUndefined();
    expect(state.geo.blind).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.name).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.settings.categoryFilter).toEqual(DEFAULT_CATEGORY_FILTER);
  });

  it('round-trips v8 saves with geo and penal.recall slices', () => {
    const next = JSON.parse(JSON.stringify(initialState));
    next.penal.recall.progress = { 'penal.25': { score: -2, lastAskedAtTurn: 2 } };
    next.penal.recall.turn = 5;
    next.geo.blind.progress = { 'city.vinewood-sign': { score: 2, lastAskedAtTurn: 0 } };
    next.geo.blind.turn = 2;
    next.geo.name.progress = { 'highway.olympic-fwy': { score: -1, lastAskedAtTurn: 1 } };
    next.geo.name.turn = 3;
    next.geo.settings.categoryFilter = {
      ...DEFAULT_CATEGORY_FILTER,
      street: true,
      city: false,
      state: true,
    };
    saveState(next);
    __resetCacheForTests();
    const reloaded = loadState();
    expect(reloaded.penal.recall.progress).toEqual({
      'penal.25': { score: -2, lastAskedAtTurn: 2 },
    });
    expect(reloaded.geo.blind.progress).toEqual({
      'city.vinewood-sign': { score: 2, lastAskedAtTurn: 0 },
    });
    expect(reloaded.geo.blind.turn).toBe(2);
    expect(reloaded.geo.name.progress).toEqual({
      'highway.olympic-fwy': { score: -1, lastAskedAtTurn: 1 },
    });
    expect(reloaded.geo.name.turn).toBe(3);
    expect(reloaded.geo.settings.categoryFilter.city).toBe(false);
    expect(reloaded.geo.settings.categoryFilter.street).toBe(true);
    expect((reloaded as any).lea).toBeUndefined();
    expect((reloaded as any).sasp).toBeUndefined();
  });

  it('returns initialState when stored JSON is malformed', () => {
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, '{ not json');
    __resetCacheForTests();
    const state = loadState();
    expect(state).toEqual(initialState);
  });

  it('reads a v4 payload with missing geo slice as empty geo (no data loss elsewhere)', () => {
    const partial = {
      schemaVersion: 4,
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
    expect(state.schemaVersion).toBe(8);
    expect(state.codes.progress).toEqual({ '10-4': { score: 2, lastAskedAtTurn: 5 } });
    // lea migrated into law
    expect(state.law.progress['lea.7']).toEqual({ score: 2, lastAskedAtTurn: 1 });
    expect(state.geo.blind).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.name).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.settings.categoryFilter).toEqual(DEFAULT_CATEGORY_FILTER);
  });

  it('reads a v4 payload with partial categoryFilter (backfills missing categories)', () => {
    const partial = {
      schemaVersion: 4,
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
          progress: { 'city.lsia': { score: 2, lastAskedAtTurn: 0 } },
          turn: 1,
        },
        // name missing
        settings: { categoryFilter: { street: false, city: true } },
      },
    };
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, JSON.stringify(partial));
    __resetCacheForTests();
    const state = loadState();
    expect(state.geo.blind.progress).toEqual({
      'city.lsia': { score: 2, lastAskedAtTurn: 0 },
    });
    expect(state.geo.name).toEqual({ progress: {}, turn: 0 });
    expect(state.geo.settings.categoryFilter).toEqual({
      street: false,
      highway: true,
      city: true,
      state: true,
    });
  });

  it('reads a v3 payload with missing penal slice and migrates to v8', () => {
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
    expect(state.schemaVersion).toBe(8);
    expect(state.codes.progress).toEqual({ '10-4': { score: 2, lastAskedAtTurn: 5 } });
    // lea migrated into law
    expect(state.law.progress['lea.7']).toEqual({ score: 2, lastAskedAtTurn: 1 });
    expect(state.penal.recall).toEqual({ progress: {}, turn: 0 });
    expect((state as any).penal?.scenarios).toBeUndefined();
    expect(state.geo.blind).toEqual({ progress: {}, turn: 0 });
  });

  it('migrates a stored v4 payload to v8, preserving all slices', () => {
    const v4 = {
      schemaVersion: 4,
      codes: {
        progress: { '10-4': { score: 2, lastAskedAtTurn: 5 } },
        turn: 7,
        settings: { importanceFilter: { mandatory: true, rare: false, unnecessary: false } },
      },
      lea: { progress: { 'lea.7': { score: 2, lastAskedAtTurn: 3 } }, turn: 4 },
      penal: {
        scenarios: { progress: { 'penal.scenario.A1': { score: 2, lastAskedAtTurn: 0 } }, turn: 1 },
        recall: { progress: {}, turn: 0 },
      },
      geo: {
        blind: { progress: { 'city.lsia': { score: 2, lastAskedAtTurn: 0 } }, turn: 2 },
        name: { progress: {}, turn: 0 },
        settings: { categoryFilter: { street: false, highway: true, city: true, state: true } },
      },
    };
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, JSON.stringify(v4));
    __resetCacheForTests();
    const state = loadState();
    expect(state.schemaVersion).toBe(8);
    expect(state.codes.progress).toEqual({ '10-4': { score: 2, lastAskedAtTurn: 5 } });
    // lea + penal.scenarios migrated into law.progress
    expect(state.law.progress['lea.7']).toEqual({ score: 2, lastAskedAtTurn: 3 });
    expect(state.law.progress['penal.scenario.A1']).toEqual({ score: 2, lastAskedAtTurn: 0 });
    expect(state.geo.blind.progress).toEqual({ 'city.lsia': { score: 2, lastAskedAtTurn: 0 } });
    expect(state.geo.settings.categoryFilter.street).toBe(false);
    expect((state as any).lea).toBeUndefined();
    expect((state as any).sasp).toBeUndefined();
    expect((state as any).penal?.scenarios).toBeUndefined();
  });

  it('migrates a stored v5 payload to v8, merging sasp test+recall into law.progress', () => {
    const v5 = {
      schemaVersion: 5,
      codes: {
        progress: {},
        turn: 0,
        settings: { importanceFilter: { mandatory: true, rare: true, unnecessary: true } },
      },
      lea: { progress: {}, turn: 0 },
      penal: { scenarios: { progress: {}, turn: 0 }, recall: { progress: {}, turn: 0 } },
      geo: {
        blind: { progress: {}, turn: 0 },
        name: { progress: {}, turn: 0 },
        settings: { categoryFilter: DEFAULT_CATEGORY_FILTER },
      },
      sasp: {
        test: { progress: { 'sasp.test.terms.1': { score: 2, lastAskedAtTurn: 0 } }, turn: 3 },
        recall: { progress: { 'sasp.recall.terms.cpz': { score: -2, lastAskedAtTurn: 1 } }, turn: 2 },
        settings: { topicFilter: { terms: false, radio: true } },
      },
    };
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, JSON.stringify(v5));
    __resetCacheForTests();
    const state = loadState();
    expect(state.schemaVersion).toBe(8);
    // sasp progress migrated into law.progress
    expect(state.law.progress['sasp.test.terms.1']).toEqual({ score: 2, lastAskedAtTurn: 0 });
    expect(state.law.progress['sasp.recall.terms.cpz']).toEqual({ score: -2, lastAskedAtTurn: 1 });
    expect((state as any).sasp).toBeUndefined();
    expect((state as any).lea).toBeUndefined();
  });

  it('reads a v6 payload (migrated to v8) with missing sasp slice', () => {
    const partial = {
      schemaVersion: 6,
      codes: {
        progress: { '10-4': { score: 2, lastAskedAtTurn: 5 } },
        turn: 7,
        settings: { importanceFilter: { mandatory: true, rare: false, unnecessary: false } },
      },
      lea: { progress: { 'lea.7': { score: 2, lastAskedAtTurn: 1 } }, turn: 2 },
      penal: { scenarios: { progress: {}, turn: 0 }, recall: { progress: {}, turn: 0 } },
      geo: {
        blind: { progress: {}, turn: 0 },
        name: { progress: {}, turn: 0 },
        settings: { categoryFilter: DEFAULT_CATEGORY_FILTER },
      },
      // sasp missing
    };
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, JSON.stringify(partial));
    __resetCacheForTests();
    const state = loadState();
    expect(state.schemaVersion).toBe(8);
    // lea migrated into law
    expect(state.law.progress['lea.7']).toEqual({ score: 2, lastAskedAtTurn: 1 });
    expect((state as any).sasp).toBeUndefined();
    expect((state as any).lea).toBeUndefined();
  });
});

describe('schema v7 → v8 law slice', () => {
  it('initial state has an empty law slice with all filters true', () => {
    const s = loadState();
    expect(s.schemaVersion).toBe(8);
    expect(s.law.progress).toEqual({});
    expect(s.law.turn).toBe(0);
    expect(s.law.settings.sourceFilter).toEqual({ lea: true, penal: true, sasp: true });
    expect(Object.values(s.law.settings.themeFilter).every(Boolean)).toBe(true);
  });

  it('migrates v6 -> v8 by unioning lea + penal.scenarios + sasp.quiz into law.progress', () => {
    const v6 = {
      schemaVersion: 6,
      codes: { progress: {}, turn: 0, settings: { importanceFilter: { mandatory: true, rare: true, unnecessary: true } } },
      lea: { progress: { 'lea.7': { score: 2, lastAskedAtTurn: 1 } }, turn: 3 },
      penal: {
        scenarios: { progress: { 'penal.A1': { score: 2, lastAskedAtTurn: 0 } }, turn: 2 },
        recall: { progress: { '25': { score: 1, lastAskedAtTurn: 0 } }, turn: 1 },
      },
      geo: { blind: { progress: {}, turn: 0 }, name: { progress: {}, turn: 0 }, settings: { categoryFilter: { street: true, highway: true, city: true, state: true } } },
      sasp: { quiz: { progress: { 'sasp.test.terms.1': { score: -2, lastAskedAtTurn: 0 } }, turn: 4 }, settings: { topicFilter: { terms: true, ranks: true, conduct: true, radio: true, equipment: true, procedures: true, criminalistics: true } } },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v6));
    __resetCacheForTests();
    const s = loadState();
    expect(s.schemaVersion).toBe(8);
    expect(s.law.progress['lea.7']).toEqual({ score: 2, lastAskedAtTurn: 1 });
    expect(s.law.progress['penal.A1']).toEqual({ score: 2, lastAskedAtTurn: 0 });
    expect(s.law.progress['sasp.test.terms.1']).toEqual({ score: -2, lastAskedAtTurn: 0 });
    expect(s.law.turn).toBe(3 + 2 + 4);
    expect(s.penal.recall.progress['25']).toEqual({ score: 1, lastAskedAtTurn: 0 });
    expect((s as any).lea).toBeUndefined();
    expect((s as any).sasp).toBeUndefined();
    expect((s as any).penal?.scenarios).toBeUndefined();
  });

  it('migrates v7 -> v8 dropping lea, sasp, penal.scenarios', () => {
    const v7 = {
      schemaVersion: 7,
      codes: { progress: {}, turn: 0, settings: { importanceFilter: { mandatory: true, rare: true, unnecessary: true } } },
      lea: { progress: { 'lea.7': { score: 2, lastAskedAtTurn: 1 } }, turn: 3 },
      penal: {
        scenarios: { progress: { 'penal.A1': { score: 2, lastAskedAtTurn: 0 } }, turn: 2 },
        recall: { progress: { '25': { score: 1, lastAskedAtTurn: 0 } }, turn: 1 },
      },
      geo: { blind: { progress: {}, turn: 0 }, name: { progress: {}, turn: 0 }, settings: { categoryFilter: { street: true, highway: true, city: true, state: true } } },
      sasp: { quiz: { progress: { 'sasp.test.terms.1': { score: -2, lastAskedAtTurn: 0 } }, turn: 4 }, settings: { topicFilter: { terms: true, ranks: true, conduct: true, radio: true, equipment: true, procedures: true, criminalistics: true } } },
      law: { progress: { 'lea.7': { score: 2, lastAskedAtTurn: 1 }, 'penal.A1': { score: 2, lastAskedAtTurn: 0 }, 'sasp.test.terms.1': { score: -2, lastAskedAtTurn: 0 } }, turn: 9, settings: { sourceFilter: { lea: true, penal: true, sasp: true }, themeFilter: { pojmy: true, hodnosti: true, jednani: true, rto: true, vybava: true, zasah: true, zadrzeni: true, kriminalistika: true, paragrafy: true } } },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v7));
    __resetCacheForTests();
    const s = loadState();
    expect(s.schemaVersion).toBe(8);
    expect(s.law.progress['lea.7']).toEqual({ score: 2, lastAskedAtTurn: 1 });
    expect(s.law.progress['penal.A1']).toEqual({ score: 2, lastAskedAtTurn: 0 });
    expect(s.law.turn).toBe(9);
    expect(s.penal.recall.progress['25']).toEqual({ score: 1, lastAskedAtTurn: 0 });
    expect((s as any).lea).toBeUndefined();
    expect((s as any).sasp).toBeUndefined();
    expect((s as any).penal?.scenarios).toBeUndefined();
  });

  it('lenient v8 read backfills a missing law slice', () => {
    const s0 = loadState();
    const v8 = JSON.parse(JSON.stringify(s0));
    delete v8.law;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v8));
    __resetCacheForTests();
    const s = loadState();
    expect(s.law.progress).toEqual({});
    expect(s.law.settings.sourceFilter.lea).toBe(true);
  });
});
