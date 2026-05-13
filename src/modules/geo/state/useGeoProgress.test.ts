import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { __resetCacheForTests, loadState } from '@/shared/storage';
import { useGeoBlindProgress, useGeoNameProgress } from './useGeoProgress';
import { useGeoSettings } from './useGeoSettings';

beforeEach(() => {
  localStorage.clear();
  __resetCacheForTests();
});

afterEach(() => {
  localStorage.clear();
  __resetCacheForTests();
});

describe('useGeoBlindProgress', () => {
  it('starts with empty progress at turn 0', () => {
    const { result } = renderHook(() => useGeoBlindProgress());
    expect(result.current.progress).toEqual({});
    expect(result.current.turn).toBe(0);
  });

  it('recordSubmit perfect bumps score by +2 and increments turn', () => {
    const { result } = renderHook(() => useGeoBlindProgress());
    act(() => result.current.recordSubmit('landmark.x', { perfect: true }));
    expect(result.current.progress['landmark.x']?.score).toBe(2);
    expect(result.current.turn).toBe(1);
  });

  it('recordSubmit imperfect bumps score by -2 (clamped to -2)', () => {
    const { result } = renderHook(() => useGeoBlindProgress());
    act(() => result.current.recordSubmit('landmark.x', { perfect: false }));
    expect(result.current.progress['landmark.x']?.score).toBe(-2);
    act(() => result.current.recordSubmit('landmark.x', { perfect: false }));
    expect(result.current.progress['landmark.x']?.score).toBe(-2); // clamped
  });

  it('recordSkip sets score to MAX absolutely (overrides prior submit)', () => {
    const { result } = renderHook(() => useGeoBlindProgress());
    act(() => result.current.recordSubmit('landmark.x', { perfect: false })); // -2
    act(() => result.current.recordSkip('landmark.x'));
    expect(result.current.progress['landmark.x']?.score).toBe(2);
  });

  it('reset wipes blind progress only, leaves name slice and settings alone', () => {
    const { result: blind } = renderHook(() => useGeoBlindProgress());
    const { result: name } = renderHook(() => useGeoNameProgress());
    act(() => blind.current.recordSubmit('landmark.x', { perfect: true }));
    act(() => name.current.recordSubmit('landmark.y', { perfect: true }));
    act(() => blind.current.reset());
    expect(blind.current.progress).toEqual({});
    expect(name.current.progress['landmark.y']?.score).toBe(2);
  });

  it('blind and name slices are independent', () => {
    const { result: blind } = renderHook(() => useGeoBlindProgress());
    const { result: name } = renderHook(() => useGeoNameProgress());
    act(() => blind.current.recordSubmit('landmark.x', { perfect: true }));
    expect(blind.current.progress['landmark.x']?.score).toBe(2);
    expect(name.current.progress['landmark.x']).toBeUndefined();
  });
});

describe('useGeoSettings', () => {
  it('defaults to all categories enabled', () => {
    const { result } = renderHook(() => useGeoSettings());
    expect(result.current.categoryFilter).toEqual({
      street: true,
      landmark: true,
      pd: true,
      fire: true,
      ems: true,
      ammu: true,
    });
  });

  it('setCategory toggles individual category and persists', () => {
    const { result } = renderHook(() => useGeoSettings());
    act(() => result.current.setCategory('pd', false));
    expect(result.current.categoryFilter.pd).toBe(false);
    expect(result.current.categoryFilter.street).toBe(true);
    expect(loadState().geo.settings.categoryFilter.pd).toBe(false);
  });
});
