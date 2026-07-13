import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { __resetCacheForTests } from '@/shared/storage';
import { useLawProgress } from './useLawProgress';
import { useLawSettings } from './useLawSettings';

beforeEach(() => {
  localStorage.clear();
  __resetCacheForTests();
});

describe('useLawProgress', () => {
  it('records a perfect submit as +2', () => {
    const { result } = renderHook(() => useLawProgress());
    act(() => result.current.recordSubmit('q1', { perfect: true }));
    expect(result.current.progress['q1'].score).toBe(2);
  });
  it('records a wrong submit as -2', () => {
    const { result } = renderHook(() => useLawProgress());
    act(() => result.current.recordSubmit('q1', { perfect: false }));
    expect(result.current.progress['q1'].score).toBe(-2);
  });
  it('skip sets score to MAX', () => {
    const { result } = renderHook(() => useLawProgress());
    act(() => result.current.recordSkip('q1'));
    expect(result.current.progress['q1'].score).toBe(2);
  });
  it('reset clears progress and turn', () => {
    const { result } = renderHook(() => useLawProgress());
    act(() => result.current.recordSubmit('q1', { perfect: true }));
    act(() => result.current.reset());
    expect(result.current.progress).toEqual({});
    expect(result.current.turn).toBe(0);
  });
  it('reset preserves filter settings', () => {
    const settings = renderHook(() => useLawSettings());
    act(() => settings.result.current.setTheme('rto', false));
    const progress = renderHook(() => useLawProgress());
    act(() => progress.result.current.reset());
    expect(settings.result.current.themeFilter.rto).toBe(false);
  });
});
