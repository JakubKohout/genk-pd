import type { ReactNode } from 'react';

interface Props {
  phase: 'answering' | 'revealed';
  skipTestId: string;
  onSubmit: () => void;
  onNext: () => void;
  onSkip: () => void;
  /** Optional content rendered on the left side; buttons stay grouped on the right. */
  leftSlot?: ReactNode;
}

export function PenalSubmitFooter({
  phase,
  skipTestId,
  onSubmit,
  onNext,
  onSkip,
  leftSlot,
}: Props) {
  const primary =
    phase === 'revealed' ? (
      <button type="button" className="btn-primary" onClick={onNext}>
        Další otázka
      </button>
    ) : (
      <button type="button" className="btn-primary" onClick={onSubmit}>
        Vyhodnotit otázku
      </button>
    );
  const buttons = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn-secondary"
        onClick={onSkip}
        data-testid={skipTestId}
      >
        Přeskakovat tuhle otázku
      </button>
      {primary}
    </div>
  );
  if (leftSlot) {
    return (
      <div className="submit-footer flex flex-wrap items-center justify-between gap-3">
        {leftSlot}
        {buttons}
      </div>
    );
  }
  return <div className="submit-footer submit-footer--end">{buttons}</div>;
}
