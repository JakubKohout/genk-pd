import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { saveState, type PersistedState } from '@/shared/storage';
import { LAW_QUESTIONS } from '../data/questions';
import type { LawChoice } from '../data/types';
import { LawPage } from './LawPage';

type Progress = Record<string, { score: number; lastAskedAtTurn: number }>;

function baseState(lawProgress: Progress): PersistedState {
  return {
    schemaVersion: 10,
    codes: {
      progress: {},
      turn: 0,
      settings: { importanceFilter: { mandatory: true, rare: true, unnecessary: true } },
    },
    geo: {
      blind: { progress: {}, turn: 0 },
      name: { progress: {}, turn: 0 },
      settings: { categoryFilter: { street: true, highway: true, city: true, state: true } },
    },
    law: {
      progress: lawProgress,
      turn: 0,
      settings: {
        themeFilter: {
          pojmy: true,
          hodnosti: true,
          jednani: true,
          rto: true,
          vybava: true,
          zasah: true,
          zadrzeni: true,
          kriminalistika: true,
          paragrafy: true,
          scenky: true,
        },
      },
    },
  };
}

/** Saturate every question except `targetId` so the picker is deterministic. */
function pin(targetId: string) {
  const progress: Progress = {};
  for (const q of LAW_QUESTIONS) {
    if (q.id !== targetId) progress[q.id] = { score: 2, lastAskedAtTurn: -10 };
  }
  saveState(baseState(progress));
}

function renderPage() {
  render(
    <MemoryRouter>
      <LawPage />
    </MemoryRouter>,
  );
}

// A SASP choice question from the native pool
const CHOICE_ID = 'sasp.choice.pojmy.1'; // "Co odlišuje loupež od krádeže?" correctIndices:[0]

function choiceQuestion(id: string): LawChoice {
  return LAW_QUESTIONS.find((q) => q.id === id) as LawChoice;
}

function optionButtonByText(text: string): HTMLElement {
  const buttons = screen.getAllByTestId(/law-choice-option-/);
  const hit = buttons.find((b) => (b.textContent ?? '').includes(text));
  if (!hit) throw new Error(`option not found: ${text}`);
  return hit;
}

describe('<LawPage /> — choice questions', () => {
  it('renders the prompt for a pinned choice question', async () => {
    pin(CHOICE_ID);
    renderPage();
    await waitFor(() => screen.getByTestId('law-prompt'));
    expect(screen.getByTestId('law-prompt')).toHaveTextContent(/rozdíl|loupež/i);
    expect(screen.getByTestId('law-choice-options')).toBeInTheDocument();
  });

  it('reveals success when the correct option is selected and submitted', async () => {
    const user = userEvent.setup();
    pin(CHOICE_ID);
    renderPage();
    await waitFor(() => screen.getByTestId('law-prompt'));
    // Select all correct options (multi-correct safe)
    const q = choiceQuestion(CHOICE_ID);
    for (const i of q.correctIndices) {
      await user.click(optionButtonByText(q.options[i]!));
    }
    await user.click(screen.getByTestId('law-choice-submit'));
    expect(screen.getByTestId('law-reveal-correct')).toBeInTheDocument();
    expect(screen.getByTestId('law-next')).toBeInTheDocument();
  });

  it('reveals wrong feedback when an incorrect option is submitted', async () => {
    const user = userEvent.setup();
    pin(CHOICE_ID);
    renderPage();
    await waitFor(() => screen.getByTestId('law-prompt'));
    // Select the first wrong option
    const q = choiceQuestion(CHOICE_ID);
    const wrongText = q.options.find((_, i) => !q.correctIndices.includes(i))!;
    await user.click(optionButtonByText(wrongText));
    await user.click(screen.getByTestId('law-choice-submit'));
    expect(screen.getByTestId('law-reveal-wrong')).toBeInTheDocument();
    expect(screen.getByTestId('law-next')).toBeInTheDocument();
  });

  it('does not render a text input for a choice question', async () => {
    pin(CHOICE_ID);
    renderPage();
    await waitFor(() => screen.getByTestId('law-prompt'));
    expect(screen.queryByTestId('law-text-input')).toBeNull();
  });
});

describe('<LawPage /> — navigation', () => {
  it('skip advances past the current question', async () => {
    const user = userEvent.setup();
    // Keep two questions eligible so skip moves to a different one
    const keep = new Set([CHOICE_ID, LAW_QUESTIONS.find((q) => q.id !== CHOICE_ID)!.id]);
    const progress: Progress = {};
    for (const q of LAW_QUESTIONS) {
      if (!keep.has(q.id)) progress[q.id] = { score: 2, lastAskedAtTurn: -10 };
    }
    saveState(baseState(progress));
    renderPage();
    await waitFor(() => screen.getByTestId('law-prompt'));
    const first = screen.getByTestId('law-prompt').textContent ?? '';
    await user.click(screen.getByTestId('law-skip'));
    await waitFor(() => screen.getByTestId('law-prompt'));
    expect(screen.getByTestId('law-prompt').textContent).not.toBe(first);
  });

  it('shows congrats when all questions are mastered', async () => {
    const progress: Progress = {};
    for (const q of LAW_QUESTIONS) progress[q.id] = { score: 2, lastAskedAtTurn: -10 };
    saveState(baseState(progress));
    renderPage();
    await waitFor(() => screen.getByTestId('law-congrats'));
    expect(screen.getByTestId('law-congrats')).toBeInTheDocument();
  });
});

describe('<LawPage /> — scenario box', () => {
  it('renders ScenarioBox when current question has a scenario', async () => {
    // Find a question with a scenario field (adapted penal scenarios have scenario text)
    const scenarioQ = LAW_QUESTIONS.find((q) => q.scenario != null);
    if (!scenarioQ) {
      // No scenario questions – skip gracefully
      return;
    }
    pin(scenarioQ.id);
    renderPage();
    await waitFor(() => screen.getByTestId('law-prompt'));
    expect(screen.getByTestId('law-scenario')).toBeInTheDocument();
  });
});
