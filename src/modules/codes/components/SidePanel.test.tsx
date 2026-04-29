import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SidePanel } from './SidePanel';
import { saveState, type PersistedState } from '@/shared/storage';

function seed(state: Partial<PersistedState['codes']>): void {
  const full: PersistedState = {
    schemaVersion: 1,
    codes: {
      progress: state.progress ?? {},
      turn: state.turn ?? 0,
      settings: state.settings ?? {
        importanceFilter: { mandatory: true, rare: false, unnecessary: false },
      },
    },
  };
  saveState(full);
}

describe('<SidePanel />', () => {
  it('renders chips for codes in the active filter', () => {
    seed({});
    render(<SidePanel />);
    // 10-44 is rare → not in default filter
    expect(screen.queryByTestId('chip-10-44')).toBeNull();
    // 10-0 is mandatory
    expect(screen.getByTestId('chip-10-0')).toBeInTheDocument();
  });

  it('shows the right score color via data-score attribute', () => {
    seed({
      progress: {
        '10-0': { score: 3, lastAskedAtTurn: 0 },
        '10-1': { score: -2, lastAskedAtTurn: 0 },
      },
    });
    render(<SidePanel />);
    expect(screen.getByTestId('chip-10-0').dataset['score']).toBe('3');
    expect(screen.getByTestId('chip-10-0').dataset['done']).toBe('true');
    expect(screen.getByTestId('chip-10-1').dataset['score']).toBe('-2');
  });

  it('shows percentage in the header', () => {
    seed({
      progress: {
        '10-0': { score: 3, lastAskedAtTurn: 0 },
        '10-1': { score: 3, lastAskedAtTurn: 0 },
        '10-2': { score: 0, lastAskedAtTurn: 0 }, // rare → not counted in default filter
      },
    });
    render(<SidePanel />);
    const percent = screen.getByTestId('progress-percent');
    expect(percent.textContent).toMatch(/^\d+%$/);
    const bar = screen.getByTestId('progress-bar');
    expect(bar.dataset['pct']).toBe(percent.textContent!.replace('%', ''));
    expect(bar.dataset['complete']).toBe('false');
  });

  it('marks 100% complete when every code in filter is at +3', () => {
    seed({
      settings: {
        importanceFilter: { mandatory: false, rare: true, unnecessary: false },
      },
      progress: {
        '10-2': { score: 3, lastAskedAtTurn: 0 },
        '10-6': { score: 3, lastAskedAtTurn: 0 },
        '10-24': { score: 3, lastAskedAtTurn: 0 },
        '10-44': { score: 3, lastAskedAtTurn: 0 },
        '10-49': { score: 3, lastAskedAtTurn: 0 },
        '10-54': { score: 3, lastAskedAtTurn: 0 },
        '10-55': { score: 3, lastAskedAtTurn: 0 },
        '10-71': { score: 3, lastAskedAtTurn: 0 },
      },
    });
    render(<SidePanel />);
    const bar = screen.getByTestId('progress-bar');
    expect(bar.dataset['pct']).toBe('100');
    expect(bar.dataset['complete']).toBe('true');
  });

  it('renders empty state when filter selects no codes', () => {
    seed({
      settings: {
        importanceFilter: { mandatory: false, rare: false, unnecessary: false },
      },
    });
    render(<SidePanel />);
    expect(screen.getByText(/Žádné kódy ve zvoleném filtru/i)).toBeInTheDocument();
  });
});
