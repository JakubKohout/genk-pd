import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchInput } from './MatchInput';
import type { LawMatch } from '../data/types';

const Q: LawMatch = {
  id: 'm', theme: 'hodnosti', prompt: 'p',
  kind: 'match', leftLabel: 'Divize', rightLabel: 'Znak',
  pairs: [{ left: 'SWAT', right: 'David' }, { left: 'DBI', right: 'William' }],
};

describe('MatchInput', () => {
  it('pairs by clicking left then right and submits correct', () => {
    const onSubmit = vi.fn();
    render(<MatchInput question={Q} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('law-match-left-SWAT'));
    fireEvent.click(screen.getByTestId('law-match-right-David'));
    fireEvent.click(screen.getByTestId('law-match-left-DBI'));
    fireEvent.click(screen.getByTestId('law-match-right-William'));
    fireEvent.click(screen.getByTestId('law-match-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ SWAT: 'David', DBI: 'William' }, true);
  });
  it('submit disabled until all lefts assigned', () => {
    render(<MatchInput question={Q} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('law-match-submit')).toBeDisabled();
    fireEvent.click(screen.getByTestId('law-match-left-SWAT'));
    fireEvent.click(screen.getByTestId('law-match-right-David'));
    expect(screen.getByTestId('law-match-submit')).toBeDisabled();
  });
});
