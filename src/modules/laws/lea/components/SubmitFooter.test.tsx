import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SubmitFooter } from './SubmitFooter';

describe('SubmitFooter', () => {
  it('shows only Vyhodnotit otázku in answering phase', () => {
    render(<SubmitFooter phase="answering" onSubmit={() => {}} onNext={() => {}} />);
    expect(screen.getByRole('button', { name: /vyhodnotit otázku/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /další otázka/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /vzdát se/i })).toBeNull();
  });

  it('shows only Další otázka in revealed phase', () => {
    render(<SubmitFooter phase="revealed" onSubmit={() => {}} onNext={() => {}} />);
    expect(screen.queryByRole('button', { name: /vyhodnotit otázku/i })).toBeNull();
    expect(screen.getByRole('button', { name: /další otázka/i })).toBeInTheDocument();
  });

  it('fires onSubmit when Vyhodnotit otázku is clicked', () => {
    const onSubmit = vi.fn();
    render(<SubmitFooter phase="answering" onSubmit={onSubmit} onNext={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /vyhodnotit otázku/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('fires onNext when Další otázka is clicked', () => {
    const onNext = vi.fn();
    render(<SubmitFooter phase="revealed" onSubmit={() => {}} onNext={onNext} />);
    fireEvent.click(screen.getByRole('button', { name: /další otázka/i }));
    expect(onNext).toHaveBeenCalledOnce();
  });
});
