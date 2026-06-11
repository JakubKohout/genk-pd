import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { __resetCacheForTests, loadState, saveState } from '@/shared/storage';
import { POIS } from '../data/pois';

vi.mock('react-leaflet', () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return {
    MapContainer: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="mock-map-container">{children}</div>
    ),
    TileLayer: () => null,
    Marker: Stub,
    Tooltip: Stub,
    Popup: Stub,
    Polyline: () => null,
    useMapEvents: () => null,
  };
});

import { GeoNamePage } from './GeoNamePage';

beforeEach(() => {
  localStorage.clear();
  __resetCacheForTests();
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
    schemaVersion: 6,
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
      blind: { progress: {}, turn: 0 },
      name: { progress, turn: 0 },
      settings: { categoryFilter: { street: true, landmark: true, pd: true, fire: true, ems: true, ammu: true } },
    },
  });
}

function renderPage() {
  render(
    <MemoryRouter>
      <GeoNamePage />
    </MemoryRouter>,
  );
}

describe('<GeoNamePage />', () => {
  it('renders the name prompt without revealing the target name', async () => {
    seedPinningTo('landmark.vinewood-sign');
    renderPage();
    await waitFor(() => screen.getByTestId('geo-name-prompt'));
    expect(screen.getByTestId('geo-name-prompt')).toHaveTextContent('Co je tady?');
    expect(screen.queryByText('Vinewood Sign', { selector: 'main *' })).toBeNull();
  });

  it('correct submission scores +2 and shows hit feedback', async () => {
    const user = userEvent.setup();
    seedPinningTo('landmark.vinewood-sign');
    renderPage();
    await waitFor(() => screen.getByTestId('geo-answer-input'));
    await user.type(screen.getByTestId('geo-answer-input'), 'Vinewood Sign');
    await user.click(screen.getByTestId('geo-answer-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('geo-name-feedback')).toHaveAttribute('data-hit', 'true'),
    );
    const after = loadState();
    expect(after.geo.name.progress['landmark.vinewood-sign']?.score).toBe(2);
  });

  it('wrong submission scores -2 and shows miss feedback', async () => {
    const user = userEvent.setup();
    seedPinningTo('landmark.vinewood-sign');
    renderPage();
    await waitFor(() => screen.getByTestId('geo-answer-input'));
    await user.type(screen.getByTestId('geo-answer-input'), 'Maják');
    await user.click(screen.getByTestId('geo-answer-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('geo-name-feedback')).toHaveAttribute('data-hit', 'false'),
    );
    const after = loadState();
    expect(after.geo.name.progress['landmark.vinewood-sign']?.score).toBe(-2);
  });

  it('hard mode toggle disables autocomplete', async () => {
    const user = userEvent.setup();
    seedPinningTo('landmark.vinewood-sign');
    renderPage();
    await waitFor(() => screen.getByTestId('geo-answer-input'));
    await user.type(screen.getByTestId('geo-answer-input'), 'vine');
    expect(screen.getByTestId('geo-autocomplete-list')).toBeInTheDocument();
    await user.clear(screen.getByTestId('geo-answer-input'));
    await user.click(screen.getByTestId('geo-hard-mode'));
    await user.type(screen.getByTestId('geo-answer-input'), 'vine');
    expect(screen.queryByTestId('geo-autocomplete-list')).toBeNull();
  });

  it('skip masters POI (+2) and advances', async () => {
    const user = userEvent.setup();
    seedPinningTo('landmark.vinewood-sign');
    renderPage();
    await waitFor(() => screen.getByTestId('geo-name-prompt'));
    await user.click(screen.getByTestId('geo-name-skip'));
    const after = loadState();
    expect(after.geo.name.progress['landmark.vinewood-sign']?.score).toBe(2);
  });
});
