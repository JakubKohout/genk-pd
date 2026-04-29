import { useEffect, useRef, useState } from 'react';
import { CODES, type Code, findCodeByNumber } from '../data/codes';
import { useCodeProgress } from '../state/useCodeProgress';
import { useSettings } from '../state/useSettings';
import { isComplete, pickNextCode } from '../state/selection';
import { CongratsBanner } from './CongratsBanner';

type Feedback =
  | { kind: 'correct'; current: Code }
  | { kind: 'wrong-existing'; current: Code; given: Code; rawInput: string }
  | { kind: 'wrong-nonexistent'; current: Code; rawInput: string };

export function ModeWrite() {
  const { progress, turn, recordAnswer } = useCodeProgress();
  const { importanceFilter } = useSettings();
  const [current, setCurrent] = useState<Code | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  // Pick the next question whenever we don't have one (and we're not currently
  // showing feedback for a previous answer). Re-runs on progress/turn changes
  // (e.g. after reset).
  useEffect(() => {
    if (current || feedback) return;
    if (isComplete({ progress, turn, filter: importanceFilter }, CODES)) return;
    const next = pickNextCode({ progress, turn, filter: importanceFilter }, CODES);
    setCurrent(next);
    setInput('');
  }, [current, feedback, importanceFilter, progress, turn]);

  // Focus input once it's actually in the DOM (the previous render may have shown
  // <QuestionSkeleton /> while current was null).
  useEffect(() => {
    if (current && !feedback) inputRef.current?.focus();
  }, [current, feedback]);

  // After answering, focus the Next button.
  useEffect(() => {
    if (feedback) queueMicrotask(() => nextBtnRef.current?.focus());
  }, [feedback]);

  const completed = isComplete({ progress, turn, filter: importanceFilter }, CODES);

  if (completed) {
    return <CongratsBanner />;
  }

  if (!current) return <QuestionSkeleton />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback) return;
    const trimmed = input.trim();
    const num = Number(trimmed);
    if (trimmed === '' || !Number.isFinite(num) || num < 0 || !Number.isInteger(num)) {
      // Reject empty or invalid input — let them retry.
      inputRef.current?.focus();
      return;
    }
    const correct = num === current.number;
    recordAnswer(current.id, correct);
    if (correct) {
      setFeedback({ kind: 'correct', current });
      return;
    }
    const givenCode = findCodeByNumber(num);
    if (givenCode) {
      setFeedback({ kind: 'wrong-existing', current, given: givenCode, rawInput: trimmed });
    } else {
      setFeedback({ kind: 'wrong-nonexistent', current, rawInput: trimmed });
    }
  };

  const handleNext = () => {
    setFeedback(null);
    setCurrent(null);
  };

  const showFeedback = feedback !== null;

  return (
    <div className="space-y-6" data-testid="mode-write">
      <p className="text-xs uppercase tracking-[0.2em] text-sasp-ink-dim">
        Doplňte správný desítkový kód
      </p>

      <form
        onSubmit={handleSubmit}
        className={[
          'card space-y-6 p-6 sm:p-8 border-2 transition-colors',
          feedback?.kind === 'correct' ? 'border-emerald-500/70' : '',
          feedback && feedback.kind !== 'correct' ? 'border-sasp-red' : '',
          !feedback ? 'border-sasp-navy-light' : '',
        ].join(' ')}
      >
        <div className="text-center">
          <h2
            data-testid="question-meaning"
            className="font-serif text-2xl text-sasp-tan sm:text-3xl"
          >
            {current.meaning}
          </h2>
        </div>

        <div className="flex items-center justify-center gap-2">
          <span
            aria-hidden="true"
            className="rounded border border-sasp-tan/50 bg-sasp-bg px-3 py-2 font-mono text-2xl text-sasp-tan"
          >
            10-
          </span>
          <label htmlFor="code-input" className="sr-only">
            Číslo kódu
          </label>
          <input
            id="code-input"
            data-testid="code-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
            disabled={showFeedback}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            placeholder="??"
            className="w-32 rounded border border-sasp-tan/50 bg-sasp-bg px-3 py-2 font-mono text-2xl text-sasp-ink focus:border-sasp-tan disabled:opacity-60"
          />
        </div>

        {!showFeedback && (
          <div className="flex justify-center">
            <button type="submit" className="btn-primary" data-testid="submit-button">
              Odeslat <kbd className="text-xs opacity-70">⏎</kbd>
            </button>
          </div>
        )}

        {feedback && (
          <FeedbackBlock feedback={feedback} onNext={handleNext} nextRef={nextBtnRef} />
        )}
      </form>
    </div>
  );
}

function FeedbackBlock({
  feedback,
  onNext,
  nextRef,
}: {
  feedback: Feedback;
  onNext: () => void;
  nextRef: React.Ref<HTMLButtonElement>;
}) {
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onNext();
  };
  if (feedback.kind === 'correct') {
    return (
      <div
        data-testid="feedback"
        data-kind="correct"
        className="space-y-3 rounded border border-emerald-500/50 bg-emerald-900/20 p-4 text-sm"
      >
        <p className="text-emerald-300">
          <strong>Správně!</strong> {feedback.current.id} — {feedback.current.meaning}.
        </p>
        <button
          ref={nextRef}
          type="button"
          onClick={onNext}
          onKeyDown={onKey}
          className="btn-primary"
          data-testid="next-button"
        >
          Další <kbd className="text-xs opacity-70">⏎</kbd>
        </button>
      </div>
    );
  }
  return (
    <div
      data-testid="feedback"
      data-kind={feedback.kind}
      className="space-y-3 rounded border border-sasp-red/60 bg-sasp-red/10 p-4 text-sm"
    >
      <p className="text-sasp-ink">
        <strong className="text-sasp-red">Špatně.</strong>{' '}
        Správný kód byl <span className="font-mono">{feedback.current.id}</span> —{' '}
        {feedback.current.meaning}.
      </p>
      {feedback.kind === 'wrong-existing' ? (
        <p className="text-sasp-ink-dim">
          Vy jste zadal <span className="font-mono">{feedback.given.id}</span> —{' '}
          {feedback.given.meaning}.
        </p>
      ) : (
        <p className="text-sasp-ink-dim">
          Vy jste zadal <span className="font-mono">10-{feedback.rawInput}</span> (neexistující kód).
        </p>
      )}
      <button
        ref={nextRef}
        type="button"
        onClick={onNext}
        onKeyDown={onKey}
        className="btn-primary"
        data-testid="next-button"
      >
        Další <kbd className="text-xs opacity-70">⏎</kbd>
      </button>
    </div>
  );
}

function QuestionSkeleton() {
  return (
    <div className="card animate-pulse p-8 text-center text-sasp-ink-dim" aria-busy="true">
      Načítání…
    </div>
  );
}
