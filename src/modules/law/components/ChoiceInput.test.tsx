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

beforeEach(() => vi.clearAllMocks());

describe('ChoiceInput', () => {
  it('toggles selection and submits an all-or-nothing correct set', () => {
    const onSubmit = vi.fn();
    render(<ChoiceInput question={Q} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('law-choice-option-0'));
    fireEvent.click(screen.getByTestId('law-choice-option-2'));
    fireEvent.click(screen.getByTestId('law-choice-submit'));
    expect(onSubmit).toHaveBeenCalledWith([0, 2], true);
  });
  it('reports incorrect when the set is wrong', () => {
    const onSubmit = vi.fn();
    render(<ChoiceInput question={Q} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('law-choice-option-0'));
    fireEvent.click(screen.getByTestId('law-choice-submit'));
    expect(onSubmit).toHaveBeenCalledWith([0], false);
  });
  it('disables submit when nothing selected', () => {
    render(<ChoiceInput question={Q} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('law-choice-submit')).toBeDisabled();
  });
});
