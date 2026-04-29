import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModeChoose } from './ModeChoose';
import { CODES } from '../data/codes';
import { saveState, type PersistedState } from '@/shared/storage';
import { mulberry32, resetRng, setRng } from '@/shared/rng';

beforeEach(() => setRng(mulberry32(2024)));
afterEach(() => resetRng());

function seedSinglePool(codeId: string): void {
  const progress: PersistedState['codes']['progress'] = {};
  for (const c of CODES) {
    if (c.importance === 'mandatory' && c.id !== codeId) {
      progress[c.id] = { score: 3, lastAskedAtTurn: -10 };
    }
  }
  saveState({
    schemaVersion: 1,
    codes: {
      progress,
      turn: 0,
      settings: { importanceFilter: { mandatory: true, rare: false, unnecessary: false } },
    },
  });
}

describe('<ModeChoose />', () => {
  it('shows the code and 5 options', async () => {
    seedSinglePool('10-0');
    render(<ModeChoose />);

    await waitFor(() => expect(screen.getByTestId('question-code')).toHaveTextContent('10-0'));

    const options = within(screen.getByTestId('options')).getAllByRole('button');
    expect(options).toHaveLength(5);
  });

  it('green-feedback on correct choice', async () => {
    const user = userEvent.setup();
    seedSinglePool('10-0');
    render(<ModeChoose />);

    await waitFor(() => screen.getByTestId('question-code'));

    await user.click(screen.getByTestId('option-10-0'));

    const fb = screen.getByTestId('feedback');
    expect(fb).toHaveAttribute('data-kind', 'correct');
  });

  it('highlights correct answer when user picks wrong', async () => {
    const user = userEvent.setup();
    seedSinglePool('10-0');
    render(<ModeChoose />);

    await waitFor(() => screen.getByTestId('question-code'));

    // Find any non-correct option and click it.
    const optionsContainer = screen.getByTestId('options');
    const wrongOption = within(optionsContainer)
      .getAllByRole('button')
      .find((el) => el.dataset['testid'] !== 'option-10-0' && !el.id?.includes('10-0'));
    // Simpler: pick a wrong option by data-testid
    const wrong = optionsContainer.querySelector(
      '[data-testid^="option-"]:not([data-testid="option-10-0"])',
    ) as HTMLButtonElement;
    expect(wrong).toBeTruthy();

    await user.click(wrong);

    const fb = screen.getByTestId('feedback');
    expect(fb).toHaveAttribute('data-kind', 'wrong');

    const correctBtn = screen.getByTestId('option-10-0');
    expect(correctBtn).toHaveAttribute('data-correct', 'true');
    void wrongOption; // silence unused
  });
});
