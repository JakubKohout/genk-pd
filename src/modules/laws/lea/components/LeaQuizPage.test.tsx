import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LeaQuizPage } from './LeaQuizPage';
import { __resetCacheForTests, saveState, initialState } from '@/shared/storage';
import { mulberry32, resetRng, setRng } from '@/shared/rng';

beforeEach(() => {
  localStorage.clear();
  __resetCacheForTests();
  setRng(mulberry32(1));
  // master every question except lea.16.B so the picker deterministically lands there
  const next = JSON.parse(JSON.stringify(initialState));
  for (const id of [
    'lea.7', 'lea.9.A', 'lea.9.B', 'lea.10', 'lea.11',
    'lea.12.A', 'lea.12.C', 'lea.15',
    'lea.17.A', 'lea.18.A', 'lea.19.A', 'lea.21.A', 'lea.23.B', 'lea.37',
    'lea.zbrojni-prukaz', 'lea.ridicsky-prukaz',
  ]) {
    next.lea.progress[id] = { score: 3, lastAskedAtTurn: 0 };
  }
  saveState(next);
});

afterEach(() => {
  localStorage.clear();
  __resetCacheForTests();
  resetRng();
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <LeaQuizPage />
    </MemoryRouter>,
  );

describe('LeaQuizPage', () => {
  it('renders the active question prompt and ref', () => {
    renderPage();
    expect(screen.getByText(/Vyjmenuj způsoby/i)).toBeInTheDocument();
    expect(screen.getByTestId('question-ref')).toHaveTextContent('§16 B');
  });

  it('commits a correct row when typing a known alias and pressing Enter', () => {
    renderPage();
    const input = screen.getByTestId('answer-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'maják' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('chip-correct')).toHaveTextContent(/výstražným zvukovým/i);
  });

  it('marks a duplicate alias as duplicate', () => {
    renderPage();
    const input = screen.getByTestId('answer-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'maják' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: 'modré světlo' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('chip-duplicate')).toBeInTheDocument();
  });

  it('marks an unknown answer as wrong', () => {
    renderPage();
    const input = screen.getByTestId('answer-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'blbost' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('chip-wrong')).toHaveTextContent('blbost');
  });

  it('Vyhodnotit otázku reveals missed rows and disables the input', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /vyhodnotit otázku/i }));
    expect(screen.getAllByTestId('chip-missed').length).toBeGreaterThan(0);
    expect(screen.getByTestId('answer-input')).toBeDisabled();
  });

  it('shows perfect banner when everything is found and submitted', () => {
    renderPage();
    const input = screen.getByTestId('answer-input') as HTMLInputElement;
    for (const value of ['ústně', 'písemně', 'maják', 'varovný výstřel', 'gestem']) {
      fireEvent.change(input, { target: { value } });
      fireEvent.keyDown(input, { key: 'Enter' });
    }
    fireEvent.click(screen.getByRole('button', { name: /vyhodnotit otázku/i }));
    expect(screen.getByTestId('reveal-perfect')).toBeInTheDocument();
    expect(screen.queryAllByTestId('chip-missed')).toHaveLength(0);
  });

  it('Další otázka returns to answering phase', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /vyhodnotit otázku/i }));
    fireEvent.click(screen.getByRole('button', { name: /další otázka/i }));
    expect(screen.getByText(/Vyjmenuj způsoby/i)).toBeInTheDocument();
  });

  it('keeps the missed rows visible after submit even when other questions are eligible', () => {
    // Override the beforeEach: don't saturate other questions. Multiple are eligible.
    localStorage.clear();
    __resetCacheForTests();
    setRng(mulberry32(1));
    // No saved state → all 15 questions eligible.

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /vyhodnotit otázku/i }));
    expect(screen.getAllByTestId('chip-missed').length).toBeGreaterThan(0);
    expect(screen.getByTestId('answer-input')).toBeDisabled();
  });

  it('switches the active question when a chip in the side panel is clicked', () => {
    renderPage();
    expect(screen.getByTestId('question-ref')).toHaveTextContent('§16 B');
    fireEvent.click(screen.getByTestId('chip-lea.7'));
    expect(screen.getByTestId('question-ref')).toHaveTextContent('§7 A');
  });

  it('clears in-progress answers when switching question via chip click', () => {
    renderPage();
    const input = screen.getByTestId('answer-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'maják' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('chip-correct')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('chip-lea.7'));
    expect(screen.queryByTestId('chip-correct')).not.toBeInTheDocument();
    expect(screen.getByTestId('answer-input')).not.toBeDisabled();
  });
});
