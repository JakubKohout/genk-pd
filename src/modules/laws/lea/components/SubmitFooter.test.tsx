import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SubmitFooter } from './SubmitFooter';

describe('SubmitFooter', () => {
  it('shows Vyhodnotit otázku and Skip in answering phase', () => {
    render(
      <SubmitFooter
        phase="answering"
        onSubmit={() => {}}
        onNext={() => {}}
        onSkip={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /vyhodnotit otázku/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /přeskakovat tuhle otázku/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /další otázka/i })).toBeNull();
  });

  it('shows Další otázka and Skip in revealed phase', () => {
    render(
      <SubmitFooter
        phase="revealed"
        onSubmit={() => {}}
        onNext={() => {}}
        onSkip={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: /vyhodnotit otázku/i })).toBeNull();
    expect(screen.getByRole('button', { name: /další otázka/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /přeskakovat tuhle otázku/i })).toBeInTheDocument();
  });

  it('fires onSubmit when Vyhodnotit otázku is clicked', () => {
    const onSubmit = vi.fn();
    render(
      <SubmitFooter
        phase="answering"
        onSubmit={onSubmit}
        onNext={() => {}}
        onSkip={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /vyhodnotit otázku/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('fires onNext when Další otázka is clicked', () => {
    const onNext = vi.fn();
    render(
      <SubmitFooter
        phase="revealed"
        onSubmit={() => {}}
        onNext={onNext}
        onSkip={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /další otázka/i }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('fires onSkip from either phase', () => {
    const onSkip = vi.fn();
    const { rerender } = render(
      <SubmitFooter
        phase="answering"
        onSubmit={() => {}}
        onNext={() => {}}
        onSkip={onSkip}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /přeskakovat tuhle otázku/i }));
    rerender(
      <SubmitFooter
        phase="revealed"
        onSubmit={() => {}}
        onNext={() => {}}
        onSkip={onSkip}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /přeskakovat tuhle otázku/i }));
    expect(onSkip).toHaveBeenCalledTimes(2);
  });
});
