import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnswerRow } from './AnswerRow';

describe('AnswerRow', () => {
  it('renders text and meta', () => {
    render(<AnswerRow status="correct" text="maják" meta="§16 B 3b" />);
    expect(screen.getByText('maják')).toBeInTheDocument();
    expect(screen.getByText('§16 B 3b')).toBeInTheDocument();
  });

  it('applies the right testid per status', () => {
    const { rerender } = render(<AnswerRow status="correct" text="x" />);
    expect(screen.getByTestId('chip-correct')).toBeInTheDocument();
    rerender(<AnswerRow status="duplicate" text="x" />);
    expect(screen.getByTestId('chip-duplicate')).toBeInTheDocument();
    rerender(<AnswerRow status="wrong" text="x" />);
    expect(screen.getByTestId('chip-wrong')).toBeInTheDocument();
    rerender(<AnswerRow status="missed" text="x" />);
    expect(screen.getByTestId('chip-missed')).toBeInTheDocument();
  });

  it('shows remove button only when onRemove is provided', () => {
    const { rerender } = render(<AnswerRow status="correct" text="x" />);
    expect(screen.queryByRole('button', { name: /odebrat/i })).toBeNull();
    rerender(<AnswerRow status="correct" text="x" onRemove={() => {}} />);
    expect(screen.getByRole('button', { name: /odebrat/i })).toBeInTheDocument();
  });

  it('calls onRemove when × is clicked', () => {
    const onRemove = vi.fn();
    render(<AnswerRow status="wrong" text="blbost" onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button', { name: /odebrat/i }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('renders pending status with neutral icon', () => {
    render(<ul><AnswerRow status="pending" text="Captain" /></ul>);
    expect(screen.getByTestId('chip-pending')).toHaveTextContent('Captain');
  });
});
