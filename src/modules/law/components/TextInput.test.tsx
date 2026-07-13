import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextInput } from './TextInput';
import type { LawText } from '../data/types';

const Q: LawText = {
  id: 't', source: 'sasp', theme: 'rto', prompt: 'p',
  kind: 'text', answer: 'Frekvence 1', aliases: ['f1'],
};

describe('TextInput', () => {
  it('submits correct=true for the answer', () => {
    const onSubmit = vi.fn();
    render(<TextInput question={Q} hardMode onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('law-text-input'), { target: { value: 'frekvence 1' } });
    fireEvent.click(screen.getByTestId('law-text-submit'));
    expect(onSubmit).toHaveBeenCalledWith('frekvence 1', true);
  });
  it('submits correct=false for a miss', () => {
    const onSubmit = vi.fn();
    render(<TextInput question={Q} hardMode onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('law-text-input'), { target: { value: 'xyz' } });
    fireEvent.click(screen.getByTestId('law-text-submit'));
    expect(onSubmit).toHaveBeenCalledWith('xyz', false);
  });
  it('hardMode hides the autocomplete dropdown', () => {
    render(<TextInput question={Q} hardMode onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByTestId('law-text-input'), { target: { value: 'frek' } });
    expect(screen.queryByTestId('law-text-autocomplete')).toBeNull();
  });
  it('without hardMode typing shows autocomplete with the matching suggestion', () => {
    render(<TextInput question={Q} hardMode={false} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByTestId('law-text-input'), { target: { value: 'frek' } });
    const list = screen.getByTestId('law-text-autocomplete');
    expect(list).toBeTruthy();
    expect(list.textContent).toContain('Frekvence 1');
  });
  it('clicking a suggestion fills the input', () => {
    const onSubmit = vi.fn();
    render(<TextInput question={Q} hardMode={false} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('law-text-input'), { target: { value: 'frek' } });
    const list = screen.getByTestId('law-text-autocomplete');
    fireEvent.mouseDown(list.querySelector('li')!);
    expect((screen.getByTestId('law-text-input') as HTMLInputElement).value).toBe('Frekvence 1');
    // dropdown closes after click
    expect(screen.queryByTestId('law-text-autocomplete')).toBeNull();
  });
});
