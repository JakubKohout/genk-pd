interface Props {
  phase: 'answering' | 'revealed';
  onSubmit: () => void;
  onNext: () => void;
}

export function SubmitFooter({ phase, onSubmit, onNext }: Props) {
  if (phase === 'revealed') {
    return (
      <div className="submit-footer submit-footer--end">
        <button type="button" className="btn-primary" onClick={onNext}>
          Další otázka
        </button>
      </div>
    );
  }
  return (
    <div className="submit-footer submit-footer--end">
      <button type="button" className="btn-primary" onClick={onSubmit}>
        Vyhodnotit otázku
      </button>
    </div>
  );
}
