import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeaResetButton } from './LeaResetButton';
import { saveState, loadState } from '@/shared/storage';

function seedLea(): void {
  saveState({
    schemaVersion: 3,
    codes: {
      progress: { '10-4': { score: 2, lastAskedAtTurn: 0 } },
      turn: 5,
      settings: {
        importanceFilter: { mandatory: true, rare: true, unnecessary: false },
      },
    },
    lea: {
      progress: { 'lea.7': { score: 2, lastAskedAtTurn: 0 } },
      turn: 3,
    },
    penal: {
      scenarios: { progress: {}, turn: 0 },
      recall: { progress: {}, turn: 0 },
    },
  });
}

describe('<LeaResetButton />', () => {
  it('asks for confirmation before resetting', async () => {
    const user = userEvent.setup();
    seedLea();
    render(<LeaResetButton />);

    await user.click(screen.getByTestId('lea-reset-button'));
    expect(screen.getByTestId('lea-reset-confirm')).toBeInTheDocument();

    // Cancel keeps progress.
    await user.click(screen.getByTestId('lea-reset-cancel'));
    expect(loadState().lea.progress['lea.7']?.score).toBe(2);
  });

  it('clears LEA progress on confirm but preserves codes slice', async () => {
    const user = userEvent.setup();
    seedLea();
    render(<LeaResetButton />);

    await user.click(screen.getByTestId('lea-reset-button'));
    await user.click(screen.getByTestId('lea-reset-confirm-yes'));

    const after = loadState();
    expect(after.lea.progress).toEqual({});
    expect(after.lea.turn).toBe(0);
    // Codes slice preserved
    expect(after.codes.progress['10-4']?.score).toBe(2);
    expect(after.codes.turn).toBe(5);
    expect(after.codes.settings.importanceFilter.rare).toBe(true);
  });
});
