import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { saveState } from '@/shared/storage';
import { PENAL_PARAGRAPHS } from '../data/paragraphs';
import { PenalRecallPage } from './PenalRecallPage';

function pinParagraph(paragraphId: string) {
  const progress: Record<string, { score: number; lastAskedAtTurn: number }> = {};
  for (const p of PENAL_PARAGRAPHS) {
    if (p.id !== paragraphId) progress[p.id] = { score: 2, lastAskedAtTurn: -10 };
  }
  saveState({
    schemaVersion: 7,
    codes: {
      progress: {},
      turn: 0,
      settings: { importanceFilter: { mandatory: true, rare: true, unnecessary: true } },
    },
    lea: { progress: {}, turn: 0 },
    penal: {
      scenarios: { progress: {}, turn: 0 },
      recall: { progress, turn: 0 },
    },
    geo: {
      blind: { progress: {}, turn: 0 },
      name: { progress: {}, turn: 0 },
      settings: { categoryFilter: { street: true, highway: true, city: true, state: true } },
    },
  });
}

function renderPage() {
  render(
    <MemoryRouter>
      <PenalRecallPage />
    </MemoryRouter>,
  );
}

describe('<PenalRecallPage />', () => {
  it('renders a paragraf number and waits for an answer', async () => {
    pinParagraph('penal.25');
    renderPage();
    await waitFor(() => screen.getByTestId('penal-recall-ref'));
    expect(screen.getByTestId('penal-recall-ref')).toHaveTextContent('§25');
    expect(screen.getByText(/Co je §25\?/i)).toBeInTheDocument();
    expect(screen.getByTestId('penal-recall-input')).toBeInTheDocument();
  });

  it('accepts the correct title via Enter and reveals success', async () => {
    const user = userEvent.setup();
    pinParagraph('penal.25');
    renderPage();
    await waitFor(() => screen.getByTestId('penal-recall-ref'));

    await user.type(screen.getByTestId('penal-recall-input'), 'Krádež');
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('penal-recall-correct')).toHaveTextContent(/správně/i);
  });

  it('accepts an alias (after diakritika strip)', async () => {
    const user = userEvent.setup();
    pinParagraph('penal.25');
    renderPage();
    await waitFor(() => screen.getByTestId('penal-recall-ref'));

    await user.type(screen.getByTestId('penal-recall-input'), 'krast');
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('penal-recall-correct')).toBeInTheDocument();
  });

  it('marks wrong answer and shows the correct title', async () => {
    const user = userEvent.setup();
    pinParagraph('penal.25');
    renderPage();
    await waitFor(() => screen.getByTestId('penal-recall-ref'));

    await user.type(screen.getByTestId('penal-recall-input'), 'něco úplně jiného');
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('penal-recall-wrong')).toBeInTheDocument();
    expect(screen.getByTestId('penal-recall-wrong')).toHaveTextContent(/Krádež/);
  });

  it('side panel shows only paragraf numbers (no titles or descriptions)', async () => {
    pinParagraph('penal.25');
    renderPage();
    await waitFor(() => screen.getByTestId('penal-recall-ref'));

    // Side panel chip exists for §25 and shows only the paragraf number
    const chip = screen.getAllByTestId('chip-penal.25')[0];
    expect(chip).toHaveTextContent('§25');
    expect(chip).not.toHaveTextContent('Krádež');
    expect(chip).not.toHaveTextContent('Přisvojení');
  });

  it('side panel pool is restricted to scenario-referenced paragrafy (no §1, §2, §3)', async () => {
    pinParagraph('penal.25');
    renderPage();
    await waitFor(() => screen.getByTestId('penal-recall-ref'));
    expect(screen.queryByTestId('chip-penal.1')).toBeNull();
    expect(screen.queryByTestId('chip-penal.2')).toBeNull();
    expect(screen.queryByTestId('chip-penal.3')).toBeNull();
  });

  it('reveal lists all sub-paragrafy when the paragraf has them', async () => {
    const user = userEvent.setup();
    pinParagraph('penal.25');
    renderPage();
    await waitFor(() => screen.getByTestId('penal-recall-ref'));

    await user.type(screen.getByTestId('penal-recall-input'), 'krádež');
    await user.keyboard('{Enter}');
    const reveal = screen.getByTestId('penal-recall-reveal');
    expect(reveal).toHaveTextContent('§25a');
    expect(reveal).toHaveTextContent('§25b');
    expect(reveal).toHaveTextContent('§25c');
    expect(reveal).toHaveTextContent('§25d');
  });

  it('skip advances to a different paragraf', async () => {
    const user = userEvent.setup();
    // Leave 2 unmastered (§25 and §27) so skip can pick the other
    const progress: Record<string, { score: number; lastAskedAtTurn: number }> = {};
    for (const p of PENAL_PARAGRAPHS) {
      if (p.id !== 'penal.25' && p.id !== 'penal.27') {
        progress[p.id] = { score: 2, lastAskedAtTurn: -10 };
      }
    }
    saveState({
      schemaVersion: 7,
      codes: {
        progress: {},
        turn: 0,
        settings: { importanceFilter: { mandatory: true, rare: true, unnecessary: true } },
      },
      lea: { progress: {}, turn: 0 },
      penal: {
        scenarios: { progress: {}, turn: 0 },
        recall: { progress, turn: 0 },
      },
      geo: {
        blind: { progress: {}, turn: 0 },
        name: { progress: {}, turn: 0 },
        settings: { categoryFilter: { street: true, highway: true, city: true, state: true } },
      },
    });
    renderPage();
    await waitFor(() => screen.getByTestId('penal-recall-ref'));
    const first = screen.getByTestId('penal-recall-ref').textContent ?? '';

    await user.click(screen.getByTestId('penal-recall-skip'));
    await waitFor(() => screen.getByTestId('penal-recall-ref'));
    const second = screen.getByTestId('penal-recall-ref').textContent ?? '';
    expect(second).not.toBe(first);
  });
});
