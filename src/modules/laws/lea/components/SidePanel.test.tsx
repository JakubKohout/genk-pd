import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SidePanel } from './SidePanel';
import type { Question } from '../data/types';

const Q: Question[] = [
  { id: 'a', prompt: 'A?', description: 'První zákon', ref: '§a', items: [] },
  { id: 'b', prompt: 'B?', description: 'Druhý zákon', ref: '§b', items: [] },
];

describe('LEA SidePanel', () => {
  it('renders 0% when nothing is in progress', () => {
    render(<SidePanel questions={Q} progress={{}} />);
    expect(screen.getByTestId('lea-progress-percent')).toHaveTextContent('0%');
  });

  it('clamps negative scores to 0 in the percentage formula', () => {
    render(
      <SidePanel
        questions={Q}
        progress={{ a: { score: -3, lastAskedAtTurn: 0 }, b: { score: 0, lastAskedAtTurn: 0 } }}
      />,
    );
    expect(screen.getByTestId('lea-progress-percent')).toHaveTextContent('0%');
  });

  it('computes percent from sum of clamped scores over 3 × N', () => {
    render(
      <SidePanel
        questions={Q}
        progress={{ a: { score: 3, lastAskedAtTurn: 0 }, b: { score: 0, lastAskedAtTurn: 0 } }}
      />,
    );
    expect(screen.getByTestId('lea-progress-percent')).toHaveTextContent('50%');
  });

  it('renders one row per question with the ref and description', () => {
    render(<SidePanel questions={Q} progress={{}} />);
    expect(screen.getByText('§a')).toBeInTheDocument();
    expect(screen.getByText('§b')).toBeInTheDocument();
    expect(screen.getByText('První zákon')).toBeInTheDocument();
    expect(screen.getByText('Druhý zákon')).toBeInTheDocument();
  });

  it('marks mastered rows with data-done', () => {
    render(
      <SidePanel
        questions={Q}
        progress={{ a: { score: 3, lastAskedAtTurn: 0 } }}
      />,
    );
    expect(screen.getByTestId('chip-a')).toHaveAttribute('data-done', 'true');
    expect(screen.getByTestId('chip-b')).toHaveAttribute('data-done', 'false');
  });

  it('exposes the score on each row via data-score', () => {
    render(
      <SidePanel
        questions={Q}
        progress={{ a: { score: -2, lastAskedAtTurn: 0 }, b: { score: 1, lastAskedAtTurn: 0 } }}
      />,
    );
    expect(screen.getByTestId('chip-a')).toHaveAttribute('data-score', '-2');
    expect(screen.getByTestId('chip-b')).toHaveAttribute('data-score', '1');
  });
});
