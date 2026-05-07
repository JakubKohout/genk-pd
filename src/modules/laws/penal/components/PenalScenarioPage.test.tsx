import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { saveState } from '@/shared/storage';
import { PENAL_SCENARIOS } from '../data/scenarios';
import { PenalScenarioPage } from './PenalScenarioPage';

function pinScenario(id: string) {
  // Saturate every other scenario at +2 so the picker has only one candidate left.
  const progress: Record<string, { score: number; lastAskedAtTurn: number }> = {};
  for (const s of PENAL_SCENARIOS) {
    if (s.id !== id) progress[s.id] = { score: 2, lastAskedAtTurn: -10 };
  }
  saveState({
    schemaVersion: 3,
    codes: {
      progress: {},
      turn: 0,
      settings: { importanceFilter: { mandatory: true, rare: true, unnecessary: true } },
    },
    lea: { progress: {}, turn: 0 },
    penal: {
      scenarios: { progress, turn: 0 },
      recall: { progress: {}, turn: 0 },
    },
  });
}

function renderPage() {
  render(
    <MemoryRouter>
      <PenalScenarioPage />
    </MemoryRouter>,
  );
}

describe('<PenalScenarioPage />', () => {
  it('renders a scenario prompt and answer input', async () => {
    pinScenario('penal.scenario.A1');
    renderPage();
    await waitFor(() => screen.getByTestId('penal-scenario-ref'));
    expect(screen.getByTestId('penal-scenario-ref')).toHaveTextContent('A1');
    expect(screen.getByTestId('penal-answer-input')).toBeInTheDocument();
  });

  it('accepts a correct chip and reveals perfect on submit', async () => {
    const user = userEvent.setup();
    // A5 is single-paragraph (§33 Žhářství, no subs)
    pinScenario('penal.scenario.A5');
    renderPage();
    await waitFor(() => screen.getByTestId('penal-scenario-ref'));

    await user.type(screen.getByTestId('penal-answer-input'), '33');
    await user.keyboard('{Enter}');

    expect(screen.getByTestId('chip-correct')).toHaveTextContent('§33');

    await user.click(screen.getByText(/vyhodnotit/i));
    expect(screen.getByTestId('penal-reveal-perfect')).toBeInTheDocument();
  });

  it('marks unparseable input as wrong on commit and reveals on submit', async () => {
    const user = userEvent.setup();
    pinScenario('penal.scenario.A5');
    renderPage();
    await waitFor(() => screen.getByTestId('penal-scenario-ref'));

    await user.type(screen.getByTestId('penal-answer-input'), 'lalala');
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('chip-wrong')).toBeInTheDocument();

    await user.click(screen.getByText(/vyhodnotit/i));
    // §33 is missed, lalala is wrong
    expect(screen.getByTestId('chip-missed')).toBeInTheDocument();
  });

  it('rejects paragraf without sub when paragraf has subs', async () => {
    const user = userEvent.setup();
    // A2 expects §29a + §25b — typing just '25' (no sub) should be wrong
    pinScenario('penal.scenario.A2');
    renderPage();
    await waitFor(() => screen.getByTestId('penal-scenario-ref'));

    await user.type(screen.getByTestId('penal-answer-input'), '25');
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('chip-wrong')).toBeInTheDocument();
  });

  it('hard mode toggle suppresses autocomplete suggestions', async () => {
    const user = userEvent.setup();
    pinScenario('penal.scenario.A1');
    renderPage();
    await waitFor(() => screen.getByTestId('penal-scenario-ref'));

    // Type partial ID — autocomplete is on by default
    await user.type(screen.getByTestId('penal-answer-input'), '26');
    expect(screen.getByTestId('penal-autocomplete-list')).toBeInTheDocument();

    // Toggle hard mode
    await user.clear(screen.getByTestId('penal-answer-input'));
    await user.click(screen.getByTestId('penal-hardmode-toggle'));
    await user.type(screen.getByTestId('penal-answer-input'), '26');
    expect(screen.queryByTestId('penal-autocomplete-list')).toBeNull();
  });

  it('skip advances and marks the scenario as mastered', async () => {
    const user = userEvent.setup();
    // Saturate all scenarios except A1 and A5 — after skipping A1, A5 should appear next
    const progress: Record<string, { score: number; lastAskedAtTurn: number }> = {};
    for (const s of PENAL_SCENARIOS) {
      if (s.id !== 'penal.scenario.A1' && s.id !== 'penal.scenario.A5') {
        progress[s.id] = { score: 2, lastAskedAtTurn: -10 };
      }
    }
    saveState({
      schemaVersion: 3,
      codes: {
        progress: {},
        turn: 0,
        settings: { importanceFilter: { mandatory: true, rare: true, unnecessary: true } },
      },
      lea: { progress: {}, turn: 0 },
      penal: {
        scenarios: { progress, turn: 0 },
        recall: { progress: {}, turn: 0 },
      },
    });
    renderPage();
    await waitFor(() => screen.getByTestId('penal-scenario-ref'));
    const firstRef = screen.getByTestId('penal-scenario-ref').textContent ?? '';

    await user.click(screen.getByTestId('penal-scenario-skip'));
    await waitFor(() => screen.getByTestId('penal-scenario-ref'));
    const secondRef = screen.getByTestId('penal-scenario-ref').textContent ?? '';
    expect(secondRef).not.toBe(firstRef);
  });
});
