export type AnswerStatus = 'correct' | 'duplicate' | 'wrong' | 'missed';

const ICON: Record<AnswerStatus, string> = {
  correct: '✓',
  duplicate: '⊘',
  wrong: '✗',
  missed: '○',
};

const ROW_CLASS: Record<AnswerStatus, string> = {
  correct: 'answer-row--correct',
  duplicate: 'answer-row--duplicate',
  wrong: 'answer-row--wrong',
  missed: 'answer-row--missed',
};

interface Props {
  status: AnswerStatus;
  text: string;
  meta?: string;
  onRemove?: () => void;
}

export function AnswerRow({ status, text, meta, onRemove }: Props) {
  return (
    <li className={`answer-row ${ROW_CLASS[status]}`} data-testid={`chip-${status}`}>
      <span className="answer-row__icon" aria-hidden>{ICON[status]}</span>
      <span className="answer-row__text">{text}</span>
      {meta && <span className="answer-row__meta">{meta}</span>}
      {onRemove && (
        <button
          type="button"
          className="answer-row__remove"
          aria-label="Odebrat odpověď"
          onClick={onRemove}
        >
          ×
        </button>
      )}
    </li>
  );
}
