import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetCacheForTests,
  STORAGE_KEY_FOR_TESTS,
  initialState,
  loadState,
  saveState,
} from './storage';

beforeEach(() => {
  localStorage.clear();
  __resetCacheForTests();
});

afterEach(() => {
  localStorage.clear();
  __resetCacheForTests();
});

describe('storage migration', () => {
  it('returns initialState (schemaVersion 3) when no data exists', () => {
    const state = loadState();
    expect(state.schemaVersion).toBe(3);
    expect(state.codes.progress).toEqual({});
    expect(state.lea.progress).toEqual({});
    expect(state.lea.turn).toBe(0);
    expect(state.penal.scenarios).toEqual({ progress: {}, turn: 0 });
    expect(state.penal.recall).toEqual({ progress: {}, turn: 0 });
  });

  it('migrates a stored v1 payload through v2 to v3 in memory', () => {
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
    expect(state.schemaVersion).toBe(3);
    expect(state.codes.progress).toEqual({ '10-4': { score: 2, lastAskedAtTurn: 5 } });
    expect(state.codes.turn).toBe(7);
    expect(state.lea).toEqual({ progress: {}, turn: 0 });
    expect(state.penal.scenarios).toEqual({ progress: {}, turn: 0 });
    expect(state.penal.recall).toEqual({ progress: {}, turn: 0 });
  });

  it('migrates a stored v2 payload to v3, preserving codes and lea', () => {
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
    expect(state.schemaVersion).toBe(3);
    expect(state.codes.progress).toEqual({ '10-4': { score: 2, lastAskedAtTurn: 5 } });
    expect(state.lea.progress).toEqual({ 'lea.7': { score: 2, lastAskedAtTurn: 3 } });
    expect(state.lea.turn).toBe(4);
    expect(state.penal.scenarios).toEqual({ progress: {}, turn: 0 });
    expect(state.penal.recall).toEqual({ progress: {}, turn: 0 });
  });

  it('round-trips v3 saves with penal slice', () => {
    const next = JSON.parse(JSON.stringify(initialState));
    next.lea.progress = { 'lea.7': { score: 2, lastAskedAtTurn: 1 } };
    next.lea.turn = 3;
    next.penal.scenarios.progress = { 'penal.scenario.A1': { score: 2, lastAskedAtTurn: 0 } };
    next.penal.scenarios.turn = 1;
    next.penal.recall.progress = { 'penal.25': { score: -2, lastAskedAtTurn: 2 } };
    next.penal.recall.turn = 5;
    saveState(next);
    __resetCacheForTests();
    const reloaded = loadState();
    expect(reloaded.lea.progress).toEqual({ 'lea.7': { score: 2, lastAskedAtTurn: 1 } });
    expect(reloaded.lea.turn).toBe(3);
    expect(reloaded.penal.scenarios.progress).toEqual({
      'penal.scenario.A1': { score: 2, lastAskedAtTurn: 0 },
    });
    expect(reloaded.penal.scenarios.turn).toBe(1);
    expect(reloaded.penal.recall.progress).toEqual({
      'penal.25': { score: -2, lastAskedAtTurn: 2 },
    });
    expect(reloaded.penal.recall.turn).toBe(5);
  });

  it('returns initialState when stored JSON is malformed', () => {
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, '{ not json');
    __resetCacheForTests();
    const state = loadState();
    expect(state).toEqual(initialState);
  });

  it('reads a v3 payload with missing penal slice as v3 with empty penal (no data loss)', () => {
    const partial = {
      schemaVersion: 3,
      codes: {
        progress: { '10-4': { score: 2, lastAskedAtTurn: 5 } },
        turn: 7,
        settings: { importanceFilter: { mandatory: true, rare: false, unnecessary: false } },
      },
      lea: { progress: { 'lea.7': { score: 2, lastAskedAtTurn: 1 } }, turn: 2 },
      // penal missing
    };
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, JSON.stringify(partial));
    __resetCacheForTests();
    const state = loadState();
    expect(state.schemaVersion).toBe(3);
    expect(state.codes.progress).toEqual({ '10-4': { score: 2, lastAskedAtTurn: 5 } });
    expect(state.lea.progress).toEqual({ 'lea.7': { score: 2, lastAskedAtTurn: 1 } });
    expect(state.penal.scenarios).toEqual({ progress: {}, turn: 0 });
    expect(state.penal.recall).toEqual({ progress: {}, turn: 0 });
  });

  it('reads a v3 payload with missing penal.recall as default (lenient)', () => {
    const partial = {
      schemaVersion: 3,
      codes: { progress: {}, turn: 0, settings: { importanceFilter: { mandatory: true, rare: true, unnecessary: true } } },
      lea: { progress: {}, turn: 0 },
      penal: { scenarios: { progress: { 'penal.scenario.A1': { score: 2, lastAskedAtTurn: 0 } }, turn: 1 } },
      // penal.recall missing
    };
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, JSON.stringify(partial));
    __resetCacheForTests();
    const state = loadState();
    expect(state.penal.scenarios.progress).toEqual({
      'penal.scenario.A1': { score: 2, lastAskedAtTurn: 0 },
    });
    expect(state.penal.recall).toEqual({ progress: {}, turn: 0 });
  });
});
