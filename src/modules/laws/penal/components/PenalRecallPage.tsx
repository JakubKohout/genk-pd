import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useMediaQuery } from '@/shared/useMediaQuery';
import { trackPenalAnswered, trackPenalCompleted, trackQuestionSkipped } from '@/shared/analytics';
import { RECALL_PARAGRAPHS } from '../data/recallPool';
import type { PenalParagraph } from '../data/types';
import { matchParagraph } from '../logic/matchParagraph';
import {
  isRecallComplete,
  pickNextRecallParagraph,
} from '../state/selection';
import { usePenalRecallProgress } from '../state/usePenalProgress';
import { PenalResetButton } from './PenalResetButton';
import { PenalSidePanel, type PenalPanelItem } from './PenalSidePanel';
import { PenalSubmitFooter } from './PenalSubmitFooter';

type Phase = 'answering' | 'revealed';

function panelItems(paragraphs: readonly PenalParagraph[]): PenalPanelItem[] {
  return paragraphs.map((p) => ({
    id: p.id,
    label: p.number,
    hoverTitle: `${p.title} — ${p.description}`,
  }));
}

export function PenalRecallPage() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { progress, turn, recordSubmit, recordSkip, reset } = usePenalRecallProgress();

  const [current, setCurrent] = useState<PenalParagraph | null>(null);
  const [value, setValue] = useState('');
  const [phase, setPhase] = useState<Phase>('answering');
  /** null when input doesn't match the current paragraf (or is blank). */
  const [submittedMatch, setSubmittedMatch] = useState<PenalParagraph | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (current !== null) return;
    if (phase !== 'answering') return;
    const next = pickNextRecallParagraph({ progress, turn }, RECALL_PARAGRAPHS);
    setCurrent(next);
  }, [current, phase, progress, turn]);

  useEffect(() => {
    if (phase === 'answering' && !!current) {
      inputRef.current?.focus();
    }
  }, [current, phase]);

  const items = useMemo(() => panelItems(RECALL_PARAGRAPHS), []);

  const handleSelect = (id: string) => {
    const selected = RECALL_PARAGRAPHS.find((p) => p.id === id);
    if (!selected || selected.id === current?.id) return;
    setValue('');
    setSubmittedMatch(null);
    setPhase('answering');
    setCurrent(selected);
  };

  if (isRecallComplete({ progress, turn }, RECALL_PARAGRAPHS) && !current) {
    return (
      <div className="lea-page">
        <div className="card congrats p-6 sm:p-8" data-testid="penal-recall-congrats">
          <h2>Hotovo!</h2>
          <p>Pamatuješ si všechny paragrafy.</p>
          <button type="button" className="btn-primary" onClick={reset}>
            Začít znovu
          </button>
        </div>
        {isDesktop ? (
          <PenalSidePanel
            items={items}
            progress={progress}
            testIdPrefix="penal-recall"
            ariaLabel="Přehled paragrafů"
            onSelect={handleSelect}
          />
        ) : (
          <PenalRecallMobilePanel
            items={items}
            progress={progress}
            onSelect={handleSelect}
          />
        )}
      </div>
    );
  }

  if (!current) return null;

  const handleSubmit = () => {
    const matched = matchParagraph(value, [current]);
    const perfect = matched !== null;
    recordSubmit(current.id, { perfect });
    trackPenalAnswered({ mode: 'recall', success: perfect, question_id: current.id });
    setSubmittedMatch(matched);
    setPhase('revealed');

    const newProgress = {
      ...progress,
      [current.id]: {
        score: Math.min(2, (progress[current.id]?.score ?? 0) + (perfect ? 2 : -2)),
        lastAskedAtTurn: turn,
      },
    };
    if (isRecallComplete({ progress: newProgress, turn: turn + 1 }, RECALL_PARAGRAPHS)) {
      trackPenalCompleted({ mode: 'recall' });
    }
  };

  const handleNext = () => {
    setValue('');
    setSubmittedMatch(null);
    setPhase('answering');
    setCurrent(null);
  };

  const handleSkip = () => {
    if (!current) return;
    recordSkip(current.id);
    trackQuestionSkipped({ module: 'penal-recall', question_id: current.id });
    setValue('');
    setSubmittedMatch(null);
    setPhase('answering');
    setCurrent(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && phase === 'answering') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="lea-page">
      <div className="space-y-4">
        <main className="card space-y-6 p-6 sm:p-8">
          <header className="lea-question-header">
            <h2>Co je {current.number}?</h2>
            <span className="lea-question-ref" data-testid="penal-recall-ref">
              {current.number}
            </span>
          </header>
          <div className="answer-input">
            <div className="answer-input__row">
              <input
                ref={inputRef}
                type="text"
                className="answer-input__field"
                placeholder="Napiš název paragrafu…"
                value={value}
                disabled={phase === 'revealed'}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                data-testid="penal-recall-input"
              />
            </div>
            <p className="answer-input__hint">
              Stačí název paragrafu (např. „Krádež"). Diakritika a velikost
              písmen nehrají roli.
            </p>
          </div>
          {phase === 'revealed' && (
            <RecallReveal current={current} matched={submittedMatch} attempt={value} />
          )}
          <PenalSubmitFooter
            phase={phase}
            skipTestId="penal-recall-skip"
            onSubmit={handleSubmit}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        </main>
        <div className="flex justify-end">
          <PenalResetButton
            module="penal-recall"
            testIdPrefix="penal-recall"
            onReset={reset}
          />
        </div>
      </div>
      {isDesktop ? (
        <PenalSidePanel
          items={items}
          progress={progress}
          testIdPrefix="penal-recall"
          ariaLabel="Přehled paragrafů"
          onSelect={handleSelect}
          currentId={current.id}
        />
      ) : (
        <PenalRecallMobilePanel
          items={items}
          progress={progress}
          onSelect={handleSelect}
          currentId={current.id}
        />
      )}
    </div>
  );
}

function RecallReveal({
  current,
  matched,
  attempt,
}: {
  current: PenalParagraph;
  matched: PenalParagraph | null;
  attempt: string;
}) {
  const wasCorrect = matched?.id === current.id;
  return (
    <div className="space-y-3" data-testid="penal-recall-reveal">
      {wasCorrect ? (
        <p className="reveal-perfect" data-testid="penal-recall-correct">
          Správně! {current.number} je <strong>{current.title}</strong>.
        </p>
      ) : (
        <p
          className="rounded border-l-4 border-rose-400 bg-sasp-navy/40 px-3 py-2 text-sm text-rose-100"
          data-testid="penal-recall-wrong"
        >
          {attempt.trim()
            ? <>Tvoje odpověď „{attempt.trim()}" se neshoduje. Správný název: <strong>{current.title}</strong>.</>
            : <>Nezadal jsi odpověď. Správný název: <strong>{current.title}</strong>.</>}
        </p>
      )}
      <div className="rounded border border-sasp-tan/40 bg-sasp-navy/40 p-3 text-sm">
        <p className="mb-2 text-sasp-ink">{current.description}</p>
        {current.subs.length > 0 && (
          <ul className="space-y-1 text-sasp-ink-dim">
            {current.subs.map((sub) => (
              <li key={sub.id}>
                <span className="font-mono text-sasp-tan">
                  {current.number}
                  {sub.id})
                </span>{' '}
                {sub.description}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PenalRecallMobilePanel({
  items,
  progress,
  onSelect,
  currentId,
}: {
  items: readonly PenalPanelItem[];
  progress: ReturnType<typeof usePenalRecallProgress>['progress'];
  onSelect?: (id: string) => void;
  currentId?: string;
}) {
  const [open, setOpen] = useState(false);
  const total = items.length;
  const clampedSum = items.reduce(
    (sum, it) => sum + Math.min(2, Math.max(0, progress[it.id]?.score ?? 0)),
    0,
  );
  const pct = total === 0 ? 0 : Math.round((clampedSum / (2 * total)) * 100);

  const handleSelect = onSelect
    ? (id: string) => {
        setOpen(false);
        onSelect(id);
      }
    : undefined;

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="card cursor-pointer list-none p-3 text-sm font-medium text-sasp-tan">
        <span className="flex items-center justify-between gap-2">
          <span>
            Přehled paragrafů
            <span
              data-testid="penal-recall-mobile-progress-percent"
              className="ml-2 text-sasp-ink-dim"
            >
              — {pct}% splněno
            </span>
          </span>
          <span aria-hidden className="text-xs">{open ? '▲' : '▼'}</span>
        </span>
      </summary>
      <div className="mt-2">
        <PenalSidePanel
          items={items}
          progress={progress}
          testIdPrefix="penal-recall"
          ariaLabel="Přehled paragrafů"
          onSelect={handleSelect}
          currentId={currentId}
        />
      </div>
    </details>
  );
}
