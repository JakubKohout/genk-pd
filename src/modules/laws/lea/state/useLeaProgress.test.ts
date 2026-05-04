import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetCacheForTests } from '@/shared/storage';
import { useLeaProgress } from './useLeaProgress';

beforeEach(() => {
  localStorage.clear();
  __resetCacheForTests();
});

afterEach(() => {
  localStorage.clear();
  __resetCacheForTests();
});

describe('useLeaProgress', () => {
  it('starts at turn 0 with empty progress', () => {
    const { result } = renderHook(() => useLeaProgress());
    expect(result.current.turn).toBe(0);
    expect(result.current.progress).toEqual({});
  });

  it('records a perfect submit as +2 and increments turn', () => {
    const { result } = renderHook(() => useLeaProgress());
    act(() => result.current.recordSubmit('lea.7', { perfect: true }));
    expect(result.current.progress['lea.7'].score).toBe(2);
    expect(result.current.progress['lea.7'].lastAskedAtTurn).toBe(0);
    expect(result.current.turn).toBe(1);
  });

  it('records an imperfect submit as -2', () => {
    const { result } = renderHook(() => useLeaProgress());
    act(() => result.current.recordSubmit('lea.7', { perfect: false }));
    expect(result.current.progress['lea.7'].score).toBe(-2);
  });

  it('clamps score to ±3', () => {
    const { result } = renderHook(() => useLeaProgress());
    act(() => result.current.recordSubmit('lea.7', { perfect: true }));
    act(() => result.current.recordSubmit('lea.7', { perfect: true }));
    expect(result.current.progress['lea.7'].score).toBe(3);

    act(() => result.current.recordSubmit('lea.9.A', { perfect: false }));
    act(() => result.current.recordSubmit('lea.9.A', { perfect: false }));
    expect(result.current.progress['lea.9.A'].score).toBe(-3);
  });

  it('reset clears progress and turn but leaves codes slice alone', () => {
    const { result } = renderHook(() => useLeaProgress());
    act(() => result.current.recordSubmit('lea.7', { perfect: true }));
    act(() => result.current.reset());
    expect(result.current.progress).toEqual({});
    expect(result.current.turn).toBe(0);
  });
});
