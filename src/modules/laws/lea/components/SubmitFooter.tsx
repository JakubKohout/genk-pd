interface Props {
  phase: 'answering' | 'revealed';
  onSubmit: () => void;
  onNext: () => void;
  onSkip: () => void;
}

export function SubmitFooter({ phase, onSubmit, onNext, onSkip }: Props) {
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
  return (
    <div className="submit-footer submit-footer--end">
      <button
        type="button"
        className="btn-secondary"
        onClick={onSkip}
        data-testid="lea-skip"
      >
        Přeskakovat tuhle otázku
      </button>
      {primary}
    </div>
  );
}
