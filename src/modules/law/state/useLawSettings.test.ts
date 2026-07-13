import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { __resetCacheForTests } from '@/shared/storage';
import { useLawSettings } from './useLawSettings';

beforeEach(() => {
  localStorage.clear();
  __resetCacheForTests();
});

describe('useLawSettings', () => {
  it('toggles a source filter', () => {
    const { result } = renderHook(() => useLawSettings());
    act(() => result.current.setSource('lea', false));
    expect(result.current.sourceFilter.lea).toBe(false);
    expect(result.current.sourceFilter.penal).toBe(true);
  });
  it('toggles a theme filter', () => {
    const { result } = renderHook(() => useLawSettings());
    act(() => result.current.setTheme('rto', false));
    expect(result.current.themeFilter.rto).toBe(false);
  });
});
