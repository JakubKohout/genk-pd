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
  it('returns initialState (schemaVersion 2) when no data exists', () => {
    const state = loadState();
    expect(state.schemaVersion).toBe(2);
    expect(state.codes.progress).toEqual({});
    expect(state.lea.progress).toEqual({});
    expect(state.lea.turn).toBe(0);
  });

  it('migrates a stored v1 payload to v2 in memory', () => {
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
    expect(state.schemaVersion).toBe(2);
    expect(state.codes.progress).toEqual({ '10-4': { score: 2, lastAskedAtTurn: 5 } });
    expect(state.codes.turn).toBe(7);
    expect(state.lea).toEqual({ progress: {}, turn: 0 });
  });

  it('round-trips v2 saves', () => {
    const next = JSON.parse(JSON.stringify(initialState));
    next.lea.progress = { 'lea.7': { score: 2, lastAskedAtTurn: 1 } };
    next.lea.turn = 3;
    saveState(next);
    __resetCacheForTests();
    const reloaded = loadState();
    expect(reloaded.lea.progress).toEqual({ 'lea.7': { score: 2, lastAskedAtTurn: 1 } });
    expect(reloaded.lea.turn).toBe(3);
  });

  it('returns initialState when stored JSON is malformed', () => {
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, '{ not json');
    __resetCacheForTests();
    const state = loadState();
    expect(state).toEqual(initialState);
  });

  it('reads a v2 payload with missing lea slice as v2 with empty lea (no data loss)', () => {
    const partial = {
      schemaVersion: 2,
      codes: {
        progress: { '10-4': { score: 2, lastAskedAtTurn: 5 } },
        turn: 7,
        settings: { importanceFilter: { mandatory: true, rare: false, unnecessary: false } },
      },
      // lea missing
    };
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, JSON.stringify(partial));
    __resetCacheForTests();
    const state = loadState();
    expect(state.schemaVersion).toBe(2);
    expect(state.codes.progress).toEqual({ '10-4': { score: 2, lastAskedAtTurn: 5 } });
    expect(state.lea).toEqual({ progress: {}, turn: 0 });
  });
});
