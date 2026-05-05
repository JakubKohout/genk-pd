import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

  it('renders chips as non-interactive when onSelectQuestion is not provided', () => {
    render(<SidePanel questions={Q} progress={{}} />);
    expect(screen.getByTestId('chip-a').tagName).toBe('DIV');
  });

  it('renders chips as buttons when onSelectQuestion is provided', () => {
    render(<SidePanel questions={Q} progress={{}} onSelectQuestion={() => {}} />);
    expect(screen.getByTestId('chip-a').tagName).toBe('BUTTON');
  });

  it('calls onSelectQuestion with the question id on click', () => {
    const onSelect = vi.fn();
    render(<SidePanel questions={Q} progress={{}} onSelectQuestion={onSelect} />);
    fireEvent.click(screen.getByTestId('chip-a'));
    expect(onSelect).toHaveBeenCalledWith('a');
  });

  it('marks the active row with aria-current when currentId matches', () => {
    render(
      <SidePanel questions={Q} progress={{}} onSelectQuestion={() => {}} currentId="a" />,
    );
    expect(screen.getByTestId('chip-a')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('chip-b')).not.toHaveAttribute('aria-current');
  });
});
