import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetButton } from './ResetButton';
import { saveState, loadState, type PersistedState } from '@/shared/storage';

function seed(progress: PersistedState['codes']['progress']): void {
  saveState({
    schemaVersion: 1,
    codes: {
      progress,
      turn: 5,
      settings: {
        importanceFilter: { mandatory: true, rare: true, unnecessary: false },
      },
    },
  });
}

describe('<ResetButton />', () => {
  it('asks for confirmation before resetting', async () => {
    const user = userEvent.setup();
    seed({ '10-44': { score: 2, lastAskedAtTurn: 0 } });
    render(<ResetButton />);

    await user.click(screen.getByTestId('reset-button'));
    expect(screen.getByTestId('reset-confirm')).toBeInTheDocument();

    // Cancel keeps progress.
    await user.click(screen.getByTestId('reset-cancel'));
    expect(loadState().codes.progress['10-44']?.score).toBe(2);
  });

  it('clears progress on confirm but preserves settings', async () => {
    const user = userEvent.setup();
    seed({ '10-44': { score: 2, lastAskedAtTurn: 0 } });
    render(<ResetButton />);

    await user.click(screen.getByTestId('reset-button'));
    await user.click(screen.getByTestId('reset-confirm-yes'));

    const after = loadState();
    expect(after.codes.progress).toEqual({});
    expect(after.codes.turn).toBe(0);
    // Settings preserved
    expect(after.codes.settings.importanceFilter.rare).toBe(true);
  });
});
