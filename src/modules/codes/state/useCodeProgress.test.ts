import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCodeProgress } from './useCodeProgress';
import { useSettings } from './useSettings';

describe('useCodeProgress', () => {
  it('starts at score 0 with no progress entries', () => {
    const { result } = renderHook(() => useCodeProgress());
    expect(result.current.progress).toEqual({});
    expect(result.current.turn).toBe(0);
  });

  it('increments score on correct, decrements on wrong', () => {
    const { result } = renderHook(() => useCodeProgress());
    act(() => result.current.recordAnswer('10-44', true));
    expect(result.current.progress['10-44']?.score).toBe(1);
    act(() => result.current.recordAnswer('10-44', false));
    expect(result.current.progress['10-44']?.score).toBe(0);
  });

  it('clamps score to +3 / -3', () => {
    const { result } = renderHook(() => useCodeProgress());
    for (let i = 0; i < 10; i++) {
      act(() => result.current.recordAnswer('10-44', true));
    }
    expect(result.current.progress['10-44']?.score).toBe(3);
    for (let i = 0; i < 20; i++) {
      act(() => result.current.recordAnswer('10-44', false));
    }
    expect(result.current.progress['10-44']?.score).toBe(-3);
  });

  it('increments turn after each answer', () => {
    const { result } = renderHook(() => useCodeProgress());
    expect(result.current.turn).toBe(0);
    act(() => result.current.recordAnswer('10-44', true));
    expect(result.current.turn).toBe(1);
    act(() => result.current.recordAnswer('10-50', false));
    expect(result.current.turn).toBe(2);
  });

  it('records lastAskedAtTurn equal to turn at moment of answer', () => {
    const { result } = renderHook(() => useCodeProgress());
    act(() => result.current.recordAnswer('10-44', true));
    expect(result.current.progress['10-44']?.lastAskedAtTurn).toBe(0);
    act(() => result.current.recordAnswer('10-50', true));
    expect(result.current.progress['10-50']?.lastAskedAtTurn).toBe(1);
  });

  it('reset clears progress and turn but keeps settings', () => {
    const progressHook = renderHook(() => useCodeProgress());
    const settingsHook = renderHook(() => useSettings());

    act(() => settingsHook.result.current.setImportance('rare', true));
    act(() => progressHook.result.current.recordAnswer('10-44', true));

    expect(progressHook.result.current.turn).toBe(1);
    expect(settingsHook.result.current.importanceFilter.rare).toBe(true);

    act(() => progressHook.result.current.reset());

    expect(progressHook.result.current.progress).toEqual({});
    expect(progressHook.result.current.turn).toBe(0);
    expect(settingsHook.result.current.importanceFilter.rare).toBe(true);
  });
});

describe('useSettings', () => {
  it('starts with defaults: all categories enabled', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.importanceFilter).toEqual({
      mandatory: true,
      rare: true,
      unnecessary: true,
    });
  });

  it('toggles individual categories', () => {
    const { result } = renderHook(() => useSettings());
    act(() => result.current.setImportance('rare', true));
    expect(result.current.importanceFilter.rare).toBe(true);
    expect(result.current.importanceFilter.mandatory).toBe(true);
    act(() => result.current.setImportance('mandatory', false));
    expect(result.current.importanceFilter.mandatory).toBe(false);
  });
});
