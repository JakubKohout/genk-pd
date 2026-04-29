import { useEffect, useRef, useState } from 'react';
import { CODES, type Code } from '../data/codes';
import { useCodeProgress } from '../state/useCodeProgress';
import { useSettings } from '../state/useSettings';
import { isComplete, pickNextCode } from '../state/selection';
import { buildOptions } from '../state/distractors';
import { CongratsBanner } from './CongratsBanner';

type Choice = { kind: 'correct' } | { kind: 'wrong'; chosenId: string };

export function ModeChoose() {
  const { progress, turn, recordAnswer } = useCodeProgress();
  const { importanceFilter } = useSettings();
  const [current, setCurrent] = useState<Code | null>(null);
  const [options, setOptions] = useState<Code[]>([]);
  const [choice, setChoice] = useState<Choice | null>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (current || choice) return;
    if (isComplete({ progress, turn, filter: importanceFilter }, CODES)) return;
    const next = pickNextCode({ progress, turn, filter: importanceFilter }, CODES);
    if (next) {
      setCurrent(next);
      setOptions(buildOptions(next, CODES));
    }
  }, [current, choice, importanceFilter, progress, turn]);

  useEffect(() => {
    if (choice) queueMicrotask(() => nextBtnRef.current?.focus());
  }, [choice]);

  useEffect(() => {
    if (!current || choice) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = Number(e.key) - 1;
      if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) return;
      e.preventDefault();
      const chosen = options[idx]!;
      const correct = chosen.id === current.id;
      recordAnswer(current.id, correct);
      setChoice(correct ? { kind: 'correct' } : { kind: 'wrong', chosenId: chosen.id });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, choice, options, recordAnswer]);

  const completed = isComplete({ progress, turn, filter: importanceFilter }, CODES);

  if (completed) return <CongratsBanner />;
  if (!current) {
    return (
      <div className="card animate-pulse p-8 text-center text-sasp-ink-dim" aria-busy="true">
        Načítání…
      </div>
    );
  }

  const handleChoose = (chosen: Code) => {
    if (choice) return;
    const correct = chosen.id === current.id;
    recordAnswer(current.id, correct);
    setChoice(correct ? { kind: 'correct' } : { kind: 'wrong', chosenId: chosen.id });
  };

  const handleNext = () => {
    setChoice(null);
    setCurrent(null);
    setOptions([]);
  };

  return (
    <div className="space-y-6" data-testid="mode-choose">
      <p className="text-xs uppercase tracking-[0.2em] text-sasp-ink-dim">
        Vyberte správný význam kódu
      </p>

      <div
        className={[
          'card space-y-6 p-6 sm:p-8 border-2 transition-colors',
          choice?.kind === 'correct' ? 'border-emerald-500/70' : '',
          choice?.kind === 'wrong' ? 'border-sasp-red' : '',
          !choice ? 'border-sasp-navy-light' : '',
        ].join(' ')}
      >
        <div className="text-center">
          <span
            data-testid="question-code"
            className="font-mono text-5xl text-sasp-tan sm:text-6xl"
          >
            {current.id}
          </span>
        </div>

        <ul className="grid gap-2" data-testid="options">
          {options.map((opt, idx) => {
            const isCorrect = opt.id === current.id;
            const isChosen = choice?.kind === 'wrong' && choice.chosenId === opt.id;
            const showResult = choice !== null;
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  data-testid={`option-${opt.id}`}
                  data-correct={isCorrect}
                  data-chosen={isChosen}
                  disabled={showResult}
                  onClick={() => handleChoose(opt)}
                  className={[
                    'group flex w-full items-center justify-between gap-3 rounded border px-4 py-3 text-left transition',
                    !showResult &&
                      'border-sasp-navy-light bg-sasp-bg/40 hover:border-sasp-tan hover:bg-sasp-navy-light/50',
                    showResult && isCorrect && 'border-emerald-500 bg-emerald-900/30',
                    showResult && isChosen && 'border-sasp-red bg-sasp-red/20',
                    showResult &&
                      !isCorrect &&
                      !isChosen &&
                      'border-sasp-navy-light bg-sasp-bg/30 opacity-60',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="flex items-center gap-3">
                    <kbd className="rounded border border-sasp-navy-light bg-sasp-bg px-1.5 py-0.5 font-mono text-xs text-sasp-ink-dim">
                      {idx + 1}
                    </kbd>
                    <span>{opt.meaning}</span>
                  </span>
                  {showResult && isCorrect && <span aria-hidden>✓</span>}
                  {showResult && isChosen && !isCorrect && <span aria-hidden>✗</span>}
                </button>
              </li>
            );
          })}
        </ul>

        {choice && (
          <div data-testid="feedback" data-kind={choice.kind}>
            {choice.kind === 'correct' ? (
              <p className="text-sm text-emerald-300">
                <strong>Správně!</strong> {current.id} — {current.meaning}.
              </p>
            ) : (
              <p className="text-sm text-sasp-ink">
                <strong className="text-sasp-red">Špatně.</strong> Správná odpověď byla{' '}
                <em>{current.meaning}</em>.
              </p>
            )}
            <button
              ref={nextBtnRef}
              type="button"
              onClick={handleNext}
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
              className="btn-primary mt-3"
              data-testid="next-button"
            >
              Další <kbd className="text-xs opacity-70">⏎</kbd>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
