import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeoSidePanel } from './GeoSidePanel';
import type { POI } from '../data/types';

const pois: POI[] = [
  {
    id: 'landmark.a',
    category: 'landmark',
    geometry: 'point',
    position: { x: 0.5, y: 0.5 },
    name: 'Landmark A',
    description: 'd',
    aliases: ['a'],
  },
  {
    id: 'street.b',
    category: 'street',
    geometry: 'polygon',
    path: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.1 },
      { x: 0, y: 0.1 },
      { x: 0, y: 0 },
    ],
    centroid: { x: 0.5, y: 0.05 },
    name: 'Street B',
    description: 'd',
    aliases: ['b'],
  },
  {
    id: 'pd.c',
    category: 'pd',
    geometry: 'point',
    position: { x: 0.3, y: 0.4 },
    name: 'PD C',
    description: 'd',
    aliases: ['c'],
  },
];

describe('<GeoSidePanel />', () => {
  it('renders all POIs when all categories enabled', () => {
    render(
      <GeoSidePanel
        mode="blind"
        pois={pois}
        progress={{}}
        filter={{ street: true, landmark: true, pd: true, fire: true, ems: true, ammu: true }}
        onSetCategory={() => {}}
      />,
    );
    expect(screen.getByTestId('chip-landmark.a')).toBeInTheDocument();
    expect(screen.getByTestId('chip-street.b')).toBeInTheDocument();
    expect(screen.getByTestId('chip-pd.c')).toBeInTheDocument();
  });

  it('hides disabled categories from list', () => {
    render(
      <GeoSidePanel
        mode="blind"
        pois={pois}
        progress={{}}
        filter={{ street: false, landmark: true, pd: false, fire: true, ems: true, ammu: true }}
        onSetCategory={() => {}}
      />,
    );
    expect(screen.getByTestId('chip-landmark.a')).toBeInTheDocument();
    expect(screen.queryByTestId('chip-street.b')).toBeNull();
    expect(screen.queryByTestId('chip-pd.c')).toBeNull();
  });

  it('computes progress percent over enabled categories only', () => {
    const progress = {
      'landmark.a': { score: 2, lastAskedAtTurn: 0 },
      // street.b, pd.c not started
    };
    render(
      <GeoSidePanel
        mode="blind"
        pois={pois}
        progress={progress}
        filter={{ street: true, landmark: true, pd: true, fire: true, ems: true, ammu: true }}
        onSetCategory={() => {}}
      />,
    );
    // 1 mastered out of 3 enabled = 33%
    expect(screen.getByTestId('geo-blind-progress-percent')).toHaveTextContent('33%');
  });

  it('reaches 100% when all enabled categories are mastered (filter scoped)', () => {
    const progress = {
      'landmark.a': { score: 2, lastAskedAtTurn: 0 },
    };
    render(
      <GeoSidePanel
        mode="blind"
        pois={pois}
        progress={progress}
        filter={{ street: false, landmark: true, pd: false, fire: true, ems: true, ammu: true }}
        onSetCategory={() => {}}
      />,
    );
    expect(screen.getByTestId('geo-blind-progress-percent')).toHaveTextContent('100%');
  });

  it('toggles category via checkbox callback', async () => {
    const user = userEvent.setup();
    const onSetCategory = vi.fn();
    render(
      <GeoSidePanel
        mode="name"
        pois={pois}
        progress={{}}
        filter={{ street: true, landmark: true, pd: true, fire: true, ems: true, ammu: true }}
        onSetCategory={onSetCategory}
      />,
    );
    await user.click(screen.getByTestId('geo-filter-pd'));
    expect(onSetCategory).toHaveBeenCalledWith('pd', false);
  });

  it('marks current POI with aria-current', () => {
    render(
      <GeoSidePanel
        mode="blind"
        pois={pois}
        progress={{}}
        filter={{ street: true, landmark: true, pd: true, fire: true, ems: true, ammu: true }}
        onSetCategory={() => {}}
        currentId="street.b"
      />,
    );
    const chip = screen.getByTestId('chip-street.b');
    expect(chip).toHaveAttribute('aria-current', 'true');
  });

  it('uses geo-name testids when in name mode', () => {
    render(
      <GeoSidePanel
        mode="name"
        pois={pois}
        progress={{}}
        filter={{ street: true, landmark: true, pd: true, fire: true, ems: true, ammu: true }}
        onSetCategory={() => {}}
      />,
    );
    expect(screen.getByTestId('geo-name-side-panel')).toBeInTheDocument();
    expect(screen.getByTestId('geo-name-progress-percent')).toBeInTheDocument();
    void within;
  });
});
