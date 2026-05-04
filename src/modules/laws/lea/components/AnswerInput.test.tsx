import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnswerInput } from './AnswerInput';
import type { AnswerItem } from '../data/types';

const items: AnswerItem[] = [
  { id: 'a', quote: 'výstražné světlo modré či červené barvy', aliases: ['maják'], ref: '§x A' },
  { id: 'b', quote: 'gestem', aliases: ['gesto'], ref: '§x B' },
  { id: 'c', quote: 'výstražný zvuk', aliases: ['siréna'], ref: '§x C' },
];

describe('AnswerInput', () => {
  it('does not show suggestions below 4 characters', () => {
    render(
      <AnswerInput items={items} foundIds={new Set()} disabled={false} onCommit={() => {}} />,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'maj' } });
    expect(screen.queryByTestId('autocomplete-list')).toBeNull();
  });

  it('shows matching suggestions at 4+ characters', () => {
    render(
      <AnswerInput items={items} foundIds={new Set()} disabled={false} onCommit={() => {}} />,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'majak' } });
    const list = screen.getByTestId('autocomplete-list');
    expect(list).toHaveTextContent('výstražné světlo modré či červené barvy');
  });

  it('Enter commits when no suggestions are visible (no match)', () => {
    const onCommit = vi.fn();
    render(
      <AnswerInput items={items} foundIds={new Set()} disabled={false} onCommit={onCommit} />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'něco jiného' } });
    expect(screen.queryByTestId('autocomplete-list')).toBeNull();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('něco jiného');
    expect(input.value).toBe('');
  });

  it('Enter fills the highlighted suggestion when typed text is not a direct match (no arrow nav needed)', () => {
    const onCommit = vi.fn();
    render(
      <AnswerInput items={items} foundIds={new Set()} disabled={false} onCommit={onCommit} />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'siré' } });
    expect(screen.getByTestId('autocomplete-list')).toHaveTextContent('výstražný zvuk');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe('výstražný zvuk');
  });

  it('Enter commits the typed text when it is itself an exact alias match', () => {
    const onCommit = vi.fn();
    render(
      <AnswerInput items={items} foundIds={new Set()} disabled={false} onCommit={onCommit} />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'maják' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('maják');
    expect(input.value).toBe('');
  });

  it('Enter after ArrowDown still fills the highlighted suggestion', () => {
    const onCommit = vi.fn();
    render(
      <AnswerInput items={items} foundIds={new Set()} disabled={false} onCommit={onCommit} />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'siré' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe('výstražný zvuk');
  });

  it('commits the input value on Comma', () => {
    const onCommit = vi.fn();
    render(
      <AnswerInput items={items} foundIds={new Set()} disabled={false} onCommit={onCommit} />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'gesto' } });
    fireEvent.keyDown(input, { key: ',' });
    expect(onCommit).toHaveBeenCalledWith('gesto');
  });

  it('Přidat button commits the input value just like Enter', () => {
    const onCommit = vi.fn();
    render(
      <AnswerInput items={items} foundIds={new Set()} disabled={false} onCommit={onCommit} />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'gesto' } });
    fireEvent.click(screen.getByTestId('answer-add'));
    expect(onCommit).toHaveBeenCalledWith('gesto');
    expect(input.value).toBe('');
  });

  it('Přidat button is disabled when input is empty', () => {
    render(
      <AnswerInput items={items} foundIds={new Set()} disabled={false} onCommit={() => {}} />,
    );
    expect(screen.getByTestId('answer-add')).toBeDisabled();
  });

  it('Přidat button is disabled when input contains only whitespace', () => {
    render(
      <AnswerInput items={items} foundIds={new Set()} disabled={false} onCommit={() => {}} />,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
    expect(screen.getByTestId('answer-add')).toBeDisabled();
  });

  it('Přidat button is disabled when component is disabled', () => {
    render(
      <AnswerInput items={items} foundIds={new Set()} disabled={true} onCommit={() => {}} />,
    );
    expect(screen.getByTestId('answer-add')).toBeDisabled();
  });

  it('renders the inline hint about Enter and Vyhodnotit', () => {
    render(
      <AnswerInput items={items} foundIds={new Set()} disabled={false} onCommit={() => {}} />,
    );
    expect(
      screen.getByText(/stiskni Enter nebo Přidat\. Po dokončení klikni Vyhodnotit otázku/i),
    ).toBeInTheDocument();
  });

  it('Tab inserts the highlighted suggestion (full quote) into the input', () => {
    render(
      <AnswerInput items={items} foundIds={new Set()} disabled={false} onCommit={() => {}} />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'majak' } });
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(input.value).toBe('výstražné světlo modré či červené barvy');
  });

  it('Backspace on an empty input does nothing (does not delete previous answers)', () => {
    const onCommit = vi.fn();
    render(
      <AnswerInput items={items} foundIds={new Set()} disabled={false} onCommit={onCommit} />,
    );
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Backspace' });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('hides suggestions on Escape', () => {
    render(
      <AnswerInput items={items} foundIds={new Set()} disabled={false} onCommit={() => {}} />,
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'majak' } });
    expect(screen.getByTestId('autocomplete-list')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByTestId('autocomplete-list')).toBeNull();
  });

  it('disables input when disabled prop is true', () => {
    render(
      <AnswerInput items={items} foundIds={new Set()} disabled={true} onCommit={() => {}} />,
    );
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
