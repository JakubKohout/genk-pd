import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  __resetCacheForTests,
  loadState,
  saveState,
  type PersistedState,
} from '@/shared/storage';
import { GeoResetButton } from './GeoResetButton';

beforeEach(() => {
  localStorage.clear();
  __resetCacheForTests();
});

afterEach(() => {
  localStorage.clear();
  __resetCacheForTests();
});

function seedGeo(): void {
  const state: PersistedState = {
    schemaVersion: 10,
    codes: {
      progress: {},
      turn: 0,
      settings: {
        importanceFilter: { mandatory: true, rare: true, unnecessary: true },
      },
    },
    geo: {
      blind: {
        progress: { 'landmark.a': { score: 2, lastAskedAtTurn: 0 } },
        turn: 3,
      },
      name: {
        progress: { 'landmark.b': { score: 2, lastAskedAtTurn: 0 } },
        turn: 3,
      },
      settings: { categoryFilter: { street: true, highway: true, city: true, state: true } },
    },
    law: {
      progress: {},
      turn: 0,
      settings: {
        themeFilter: {
          pojmy: true, hodnosti: true, jednani: true, rto: true, vybava: true,
          zasah: true, zadrzeni: true, kriminalistika: true, paragrafy: true, scenky: true,
        },
      },
    },
  };
  saveState(state);
}

describe('<GeoResetButton />', () => {
  it('asks for confirmation, then resets only the chosen mode', async () => {
    const user = userEvent.setup();
    seedGeo();
    render(<GeoResetButton mode="blind" />);
    await user.click(screen.getByTestId('geo-blind-reset-button'));
    expect(screen.getByTestId('geo-blind-reset-confirm')).toBeInTheDocument();
    await user.click(screen.getByTestId('geo-blind-reset-confirm-yes'));
    const after = loadState();
    expect(after.geo.blind.progress).toEqual({});
    expect(after.geo.blind.turn).toBe(0);
    // name slice untouched
    expect(after.geo.name.progress['landmark.b']?.score).toBe(2);
  });

  it('cancel keeps progress', async () => {
    const user = userEvent.setup();
    seedGeo();
    render(<GeoResetButton mode="name" />);
    await user.click(screen.getByTestId('geo-name-reset-button'));
    await user.click(screen.getByTestId('geo-name-reset-cancel'));
    const after = loadState();
    expect(after.geo.name.progress['landmark.b']?.score).toBe(2);
  });
});
