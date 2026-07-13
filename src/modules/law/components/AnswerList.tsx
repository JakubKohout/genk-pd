import { Fragment } from 'react';
import { AnswerRow, type AnswerStatus } from './AnswerRow';

export interface AnswerEntry {
  key: string;
  status: AnswerStatus;
  text: string;
  meta?: string;
}

interface Props {
  entries: AnswerEntry[];
  onRemove?: (key: string) => void;
  showMissedHeading?: boolean;
}

export function AnswerList({ entries, onRemove, showMissedHeading }: Props) {
  if (entries.length === 0) return null;

  const firstMissedIdx = entries.findIndex((e) => e.status === 'missed');
  const renderHeading =
    showMissedHeading === true && firstMissedIdx > 0;

  return (
    <ul className="answer-list" data-testid="chiplist">
      {entries.map((e, idx) => (
        <Fragment key={e.key}>
          {renderHeading && idx === firstMissedIdx && (
            <li className="answer-list__divider" aria-hidden>
              Zapomněl jsi:
            </li>
          )}
          <AnswerRow
            status={e.status}
            text={e.text}
            meta={e.meta}
            onRemove={onRemove ? () => onRemove(e.key) : undefined}
          />
        </Fragment>
      ))}
    </ul>
  );
}
