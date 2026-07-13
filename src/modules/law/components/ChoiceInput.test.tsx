import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChoiceInput } from './ChoiceInput';
import type { LawChoice } from '../data/types';

const Q: LawChoice = {
  id: 'c', source: 'sasp', theme: 'rto', prompt: 'p',
  kind: 'choice',
  options: ['A', 'B', 'C', 'D', 'E'],
  correctIndices: [0, 2],
};

const IDENTITY = [0, 1, 2, 3, 4];

beforeEach(() => vi.clearAllMocks());

describe('ChoiceInput', () => {
  it('toggles selection and submits an all-or-nothing correct set', () => {
    const onSubmit = vi.fn();
    render(<ChoiceInput question={Q} order={IDENTITY} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('law-choice-option-0'));
    fireEvent.click(screen.getByTestId('law-choice-option-2'));
    fireEvent.click(screen.getByTestId('law-choice-submit'));
    expect(onSubmit).toHaveBeenCalledWith([0, 2], true);
  });
  it('reports incorrect when the set is wrong', () => {
    const onSubmit = vi.fn();
    render(<ChoiceInput question={Q} order={IDENTITY} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('law-choice-option-0'));
    fireEvent.click(screen.getByTestId('law-choice-submit'));
    expect(onSubmit).toHaveBeenCalledWith([0], false);
  });
  it('disables submit when nothing selected', () => {
    render(<ChoiceInput question={Q} order={IDENTITY} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('law-choice-submit')).toBeDisabled();
  });

  it('renders options in the given order and maps clicks back to original indices', () => {
    const onSubmit = vi.fn();
    render(<ChoiceInput question={Q} order={[4, 3, 2, 1, 0]} onSubmit={onSubmit} />);
    // pozice 0 zobrazuje původní option 4 ("E")
    expect(screen.getByTestId('law-choice-option-0')).toHaveTextContent('E');
    // klik na pozice 4 a 2 → původní indexy 0 a 2 (correctIndices)
    fireEvent.click(screen.getByTestId('law-choice-option-4'));
    fireEvent.click(screen.getByTestId('law-choice-option-2'));
    fireEvent.click(screen.getByTestId('law-choice-submit'));
    expect(onSubmit).toHaveBeenCalledWith([0, 2], true);
  });

  it('digit keys toggle by displayed position', () => {
    const onSubmit = vi.fn();
    render(<ChoiceInput question={Q} order={[4, 3, 2, 1, 0]} onSubmit={onSubmit} />);
    fireEvent.keyDown(window, { key: '5' }); // pozice 5 → původní index 0
    fireEvent.keyDown(window, { key: '3' }); // pozice 3 → původní index 2
    fireEvent.click(screen.getByTestId('law-choice-submit'));
    expect(onSubmit).toHaveBeenCalledWith([0, 2], true);
  });
});
