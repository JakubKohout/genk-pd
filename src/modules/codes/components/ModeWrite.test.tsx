import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModeWrite } from './ModeWrite';
import { CODES } from '../data/codes';
import { saveState, type PersistedState } from '@/shared/storage';
import { mulberry32, resetRng, setRng } from '@/shared/rng';

beforeEach(() => setRng(mulberry32(123)));
afterEach(() => resetRng());

function seedSinglePool(codeId: string, score = 0): void {
  // To make the question deterministic, restrict the pool to a single mandatory code.
  // We do that by setting all OTHER mandatory codes to +2 (out of pool), so only `codeId` remains.
  // That requires `codeId` to be mandatory; for our tests we use 10-0.
  const progress: PersistedState['codes']['progress'] = {};
  // Mark every mandatory code at +2 except the target
  for (const c of CODES) {
    if (c.importance === 'mandatory' && c.id !== codeId) {
      progress[c.id] = { score: 2, lastAskedAtTurn: -10 };
    }
  }
  if (score !== 0) progress[codeId] = { score, lastAskedAtTurn: -10 };

  saveState({
    schemaVersion: 6,
    codes: {
      progress,
      turn: 0,
      settings: { importanceFilter: { mandatory: true, rare: false, unnecessary: false } },
    },
    lea: { progress: {}, turn: 0 },
    penal: {
      scenarios: { progress: {}, turn: 0 },
      recall: { progress: {}, turn: 0 },
    },
    geo: {
      blind: { progress: {}, turn: 0 },
      name: { progress: {}, turn: 0 },
      settings: { categoryFilter: { street: true, landmark: true, pd: true, fire: true, ems: true, ammu: true } },
    },
  });
}

describe('<ModeWrite />', () => {
  it('renders a question and accepts a correct answer', async () => {
    const user = userEvent.setup();
    seedSinglePool('10-0');
    render(<ModeWrite />);

    await waitFor(() =>
      expect(screen.getByTestId('question-meaning')).toHaveTextContent('Vizuální kontakt ztracen'),
    );

    await user.type(screen.getByTestId('code-input'), '0');
    await user.click(screen.getByTestId('submit-button'));

    const fb = screen.getByTestId('feedback');
    expect(fb).toHaveAttribute('data-kind', 'correct');
    expect(fb).toHaveTextContent(/Správně/);
    expect(fb).toHaveTextContent('10-0');
  });

  it('shows wrong-existing feedback when user enters another valid code', async () => {
    const user = userEvent.setup();
    seedSinglePool('10-0');
    render(<ModeWrite />);

    await waitFor(() =>
      expect(screen.getByTestId('question-meaning')).toHaveTextContent('Vizuální kontakt ztracen'),
    );
    await user.type(screen.getByTestId('code-input'), '44'); // valid but wrong
    await user.click(screen.getByTestId('submit-button'));

    const fb = screen.getByTestId('feedback');
    expect(fb).toHaveAttribute('data-kind', 'wrong-existing');
    expect(fb).toHaveTextContent('Osoba zemřela'); // meaning of 10-44
    expect(fb).toHaveTextContent('Vizuální kontakt ztracen'); // correct meaning
  });

  it('shows wrong-nonexistent feedback when user enters an invalid number', async () => {
    const user = userEvent.setup();
    seedSinglePool('10-0');
    render(<ModeWrite />);

    await waitFor(() =>
      expect(screen.getByTestId('question-meaning')).toHaveTextContent('Vizuální kontakt ztracen'),
    );
    await user.type(screen.getByTestId('code-input'), '999'); // not in dataset
    await user.click(screen.getByTestId('submit-button'));

    const fb = screen.getByTestId('feedback');
    expect(fb).toHaveAttribute('data-kind', 'wrong-nonexistent');
    expect(fb).toHaveTextContent('neexistující kód');
  });

  it('skip masters the current code (+2) and advances to a different question', async () => {
    const user = userEvent.setup();
    // Two mandatory codes eligible: 10-0 and 10-1.
    const progress: PersistedState['codes']['progress'] = {};
    for (const c of CODES) {
      if (c.importance === 'mandatory' && c.id !== '10-0' && c.id !== '10-1') {
        progress[c.id] = { score: 2, lastAskedAtTurn: -10 };
      }
    }
    saveState({
      schemaVersion: 6,
      codes: {
        progress,
        turn: 0,
        settings: { importanceFilter: { mandatory: true, rare: false, unnecessary: false } },
      },
      lea: { progress: {}, turn: 0 },
      penal: {
        scenarios: { progress: {}, turn: 0 },
        recall: { progress: {}, turn: 0 },
      },
      geo: {
        blind: { progress: {}, turn: 0 },
        name: { progress: {}, turn: 0 },
        settings: { categoryFilter: { street: true, landmark: true, pd: true, fire: true, ems: true, ammu: true } },
      },
    });
    render(<ModeWrite />);
    await waitFor(() => screen.getByTestId('question-meaning'));
    const firstMeaning = screen.getByTestId('question-meaning').textContent ?? '';
    expect(firstMeaning.length).toBeGreaterThan(0);

    await user.click(screen.getByTestId('codes-skip'));

    await waitFor(() =>
      expect(screen.getByTestId('question-meaning').textContent).not.toBe(firstMeaning),
    );
    // The skipped code should now be at score 2 in storage.
    const stored = JSON.parse(localStorage.getItem('genk-pd:v1') ?? '{}');
    const skippedId = firstMeaning.includes('Vizuální kontakt ztracen') ? '10-0' : '10-1';
    expect(stored.codes.progress[skippedId].score).toBe(2);
  });
});
