import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeoAnswerInput } from './GeoAnswerInput';
import type { POI } from '../data/types';

const pool: POI[] = [
  {
    id: 'landmark.vinewood-sign',
    category: 'city',
    geometry: 'point',
    position: { x: 0.31, y: 0.55 },
    name: 'Vinewood Sign',
    description: 'desc',
    aliases: ['cedule'],
  },
  {
    id: 'landmark.maják',
    category: 'city',
    geometry: 'point',
    position: { x: 0.7, y: 0.07 },
    name: 'Maják',
    description: 'desc',
    aliases: ['lighthouse'],
  },
];

describe('<GeoAnswerInput />', () => {
  it('submits matched POI on direct name entry', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <GeoAnswerInput pool={pool} target={pool[0]!} disabled={false} onSubmit={onSubmit} />,
    );
    const input = screen.getByTestId('geo-answer-input');
    await user.type(input, 'Vinewood Sign');
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('Vinewood Sign', expect.objectContaining({ id: 'landmark.vinewood-sign' }));
  });

  it('submits with null match when target name does not equal input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <GeoAnswerInput pool={pool} target={pool[0]!} disabled={false} onSubmit={onSubmit} />,
    );
    const input = screen.getByTestId('geo-answer-input');
    await user.type(input, 'Maják');
    await user.click(screen.getByTestId('geo-answer-submit'));
    // 'Maják' is matched against [target=Vinewood Sign], not in target's aliases → null
    expect(onSubmit).toHaveBeenCalledWith('Maják', null);
  });

  it('shows autocomplete suggestions for partial input', async () => {
    const user = userEvent.setup();
    render(
      <GeoAnswerInput
        pool={pool}
        target={pool[0]!}
        disabled={false}
        onSubmit={() => {}}
      />,
    );
    await user.type(screen.getByTestId('geo-answer-input'), 'vine');
    expect(screen.getByTestId('geo-autocomplete-list')).toBeInTheDocument();
  });

  it('hard mode (disableSuggestions) hides autocomplete', async () => {
    const user = userEvent.setup();
    render(
      <GeoAnswerInput
        pool={pool}
        target={pool[0]!}
        disabled={false}
        disableSuggestions
        onSubmit={() => {}}
      />,
    );
    await user.type(screen.getByTestId('geo-answer-input'), 'vine');
    expect(screen.queryByTestId('geo-autocomplete-list')).toBeNull();
  });

  it('Enter fills from highlight when no direct match and autocomplete is open', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <GeoAnswerInput pool={pool} target={pool[1]!} disabled={false} onSubmit={onSubmit} />,
    );
    const input = screen.getByTestId('geo-answer-input');
    await user.type(input, 'lighthou'); // matches alias of Maják
    await user.keyboard('{Enter}');
    expect(input).toHaveValue('Maják'); // filled, not committed
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
