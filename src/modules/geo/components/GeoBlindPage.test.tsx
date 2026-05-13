import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { __resetCacheForTests, loadState, saveState } from '@/shared/storage';
import { POIS } from '../data/pois';
import { TILE_META } from '../data/tileMeta';

const { capturedHandlers } = vi.hoisted(() => ({
  capturedHandlers: {
    click: null as null | ((e: { latlng: { lat: number; lng: number } }) => void),
  },
}));

vi.mock('react-leaflet', () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return {
    MapContainer: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="mock-map-container">{children}</div>
    ),
    TileLayer: () => null,
    Marker: Stub,
    Tooltip: Stub,
    Polyline: () => <span data-testid="mock-polyline" />,
    useMapEvents: (handlers: { click?: (e: never) => void }) => {
      if (handlers.click) {
        capturedHandlers.click = handlers.click as never;
      }
      return null;
    },
  };
});

import { GeoBlindPage } from './GeoBlindPage';

beforeEach(() => {
  localStorage.clear();
  __resetCacheForTests();
  capturedHandlers.click = null;
});

afterEach(() => {
  localStorage.clear();
  __resetCacheForTests();
});

function seedPinningTo(targetId: string): void {
  const progress: Record<string, { score: number; lastAskedAtTurn: number }> = {};
  for (const p of POIS) {
    if (p.id !== targetId) progress[p.id] = { score: 2, lastAskedAtTurn: -10 };
  }
  saveState({
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
      blind: { progress, turn: 0 },
      name: { progress: {}, turn: 0 },
      settings: { categoryFilter: { street: true, landmark: true, pd: true, fire: true, ems: true, ammu: true } },
    },
  });
}

function clickAt(normalized: { x: number; y: number }): void {
  const handler = capturedHandlers.click;
  if (!handler) throw new Error('click handler not captured');
  handler({
    latlng: { lat: normalized.y * TILE_META.height, lng: normalized.x * TILE_META.width },
  });
}

function renderPage() {
  render(
    <MemoryRouter>
      <GeoBlindPage />
    </MemoryRouter>,
  );
}

describe('<GeoBlindPage />', () => {
  it('shows the prompt for the targeted POI', async () => {
    seedPinningTo('landmark.vinewood-sign');
    renderPage();
    await waitFor(() => screen.getByTestId('geo-blind-prompt'));
    expect(screen.getByTestId('geo-blind-prompt')).toHaveTextContent('Vinewood Sign');
  });

  it('correct click marks POI as mastered (+2) and shows hit feedback', async () => {
    seedPinningTo('landmark.vinewood-sign');
    renderPage();
    await waitFor(() => screen.getByTestId('geo-blind-prompt'));
    const target = POIS.find((p) => p.id === 'landmark.vinewood-sign');
    if (!target || target.geometry !== 'point') throw new Error('target lookup');
    clickAt(target.position); // exact target position from current data
    await waitFor(() =>
      expect(screen.getByTestId('geo-blind-feedback')).toHaveAttribute('data-hit', 'true'),
    );
    const after = loadState();
    expect(after.geo.blind.progress['landmark.vinewood-sign']?.score).toBe(2);
  });

  it('miss click marks POI score down (-2) and shows miss feedback', async () => {
    seedPinningTo('landmark.vinewood-sign');
    renderPage();
    await waitFor(() => screen.getByTestId('geo-blind-prompt'));
    clickAt({ x: 0.9, y: 0.9 }); // far from target
    await waitFor(() =>
      expect(screen.getByTestId('geo-blind-feedback')).toHaveAttribute('data-hit', 'false'),
    );
    const after = loadState();
    expect(after.geo.blind.progress['landmark.vinewood-sign']?.score).toBe(-2);
  });

  it('skip masters the POI (+2) and advances', async () => {
    const user = userEvent.setup();
    seedPinningTo('landmark.vinewood-sign');
    renderPage();
    await waitFor(() => screen.getByTestId('geo-blind-prompt'));
    await user.click(screen.getByTestId('geo-blind-skip'));
    const after = loadState();
    expect(after.geo.blind.progress['landmark.vinewood-sign']?.score).toBe(2);
  });

  it('shows congrats when all POIs in enabled categories mastered', async () => {
    const progress: Record<string, { score: number; lastAskedAtTurn: number }> = {};
    for (const p of POIS) progress[p.id] = { score: 2, lastAskedAtTurn: 0 };
    saveState({
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
        blind: { progress, turn: 0 },
        name: { progress: {}, turn: 0 },
        settings: { categoryFilter: { street: true, landmark: true, pd: true, fire: true, ems: true, ammu: true } },
      },
    });
    renderPage();
    await waitFor(() => screen.getByTestId('geo-blind-congrats'));
  });
});
