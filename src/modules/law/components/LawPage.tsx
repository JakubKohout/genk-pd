import { useEffect, useMemo, useState } from 'react';
import { useMediaQuery } from '@/shared/useMediaQuery';
import { trackLawAnswered, trackQuestionSkipped } from '@/shared/analytics';
import { LAW_QUESTIONS } from '../data/index';
import type { LawChoice, LawQuestion } from '../data/types';
import { isLawComplete, pickNextQuestion } from '../state/selection';
import { useLawProgress } from '../state/useLawProgress';
import { useLawSettings } from '../state/useLawSettings';
import { ScenarioBox } from './ScenarioBox';
import { ChoiceInput } from './ChoiceInput';
import { TextInput } from './TextInput';
import { EnumerationInput } from './EnumerationInput';
import { MatchInput } from './MatchInput';
import { LawSidePanel, type LawPanelItem } from './LawSidePanel';
import { LawMobilePanel } from './LawMobilePanel';
import { LawResetButton } from './LawResetButton';

type Phase = 'answering' | 'revealed';

interface ChoiceResult {
  selected: number[];
  correct: boolean;
}

interface SimpleResult {
  correct: boolean;
}

function panelItems(questions: readonly LawQuestion[]): LawPanelItem[] {
  return questions.map((q) => ({
    id: q.id,
    source: q.source,
    theme: q.theme,
    label: q.title ?? q.prompt,
  }));
}

export function LawPage() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { progress, turn, recordSubmit, recordSkip, reset } = useLawProgress();
  const { sourceFilter, themeFilter, setSource, setTheme } = useLawSettings();

  const [current, setCurrent] = useState<LawQuestion | null>(null);
  const [phase, setPhase] = useState<Phase>('answering');
  const [hardMode, setHardMode] = useState(false);
  const [choiceResult, setChoiceResult] = useState<ChoiceResult | null>(null);
  const [simpleResult, setSimpleResult] = useState<SimpleResult | null>(null);

  const items = useMemo(() => panelItems(LAW_QUESTIONS), []);

  useEffect(() => {
    if (current !== null) return;
    if (phase !== 'answering') return;
    setCurrent(pickNextQuestion({ progress, turn }, LAW_QUESTIONS, sourceFilter, themeFilter));
  }, [current, phase, progress, turn, sourceFilter, themeFilter]);

  const isComplete = isLawComplete({ progress, turn }, LAW_QUESTIONS, sourceFilter, themeFilter);

  const handleSelect = (id: string) => {
    const selected = LAW_QUESTIONS.find((q) => q.id === id);
    if (!selected || selected.id === current?.id) return;
    setChoiceResult(null);
    setSimpleResult(null);
    setPhase('answering');
    setCurrent(selected);
  };

  const sidePanel = (currentId?: string) =>
    isDesktop ? (
      <LawSidePanel
        items={items}
        progress={progress}
        sourceFilter={sourceFilter}
        themeFilter={themeFilter}
        onSetSource={setSource}
        onSetTheme={setTheme}
        currentId={currentId}
        onSelect={handleSelect}
      />
    ) : (
      <LawMobilePanel
        items={items}
        progress={progress}
        sourceFilter={sourceFilter}
        themeFilter={themeFilter}
        onSetSource={setSource}
        onSetTheme={setTheme}
        currentId={currentId}
        onSelect={handleSelect}
      />
    );

  if (isComplete && !current) {
    return (
      <div className="lea-page">
        <div className="space-y-4">
          <div className="card congrats p-6 sm:p-8" data-testid="law-congrats">
            <h2>Hotovo!</h2>
            <p>Zvládl jsi všechny otázky.</p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => reset()}
            >
              Začít znovu
            </button>
          </div>
          <div className="flex justify-end">
            <LawResetButton onReset={reset} />
          </div>
        </div>
        {sidePanel()}
      </div>
    );
  }

  if (!current) return null;

  const handleChoiceSubmit = (selected: number[], correct: boolean) => {
    setChoiceResult({ selected, correct });
    setPhase('revealed');
    recordSubmit(current.id, { perfect: correct });
    trackLawAnswered({ source: current.source, kind: 'choice', success: correct, question_id: current.id });
  };

  const handleTextSubmit = (_raw: string, correct: boolean) => {
    setSimpleResult({ correct });
    setPhase('revealed');
    recordSubmit(current.id, { perfect: correct });
    trackLawAnswered({ source: current.source, kind: 'text', success: correct, question_id: current.id });
  };

  const handleEnumSubmit = ({ perfect }: { perfect: boolean }) => {
    setSimpleResult({ correct: perfect });
    setPhase('revealed');
    recordSubmit(current.id, { perfect });
    trackLawAnswered({ source: current.source, kind: 'enumeration', success: perfect, question_id: current.id });
  };

  const handleMatchSubmit = (_assignments: Record<string, string>, correct: boolean) => {
    setSimpleResult({ correct });
    setPhase('revealed');
    recordSubmit(current.id, { perfect: correct });
    trackLawAnswered({ source: current.source, kind: 'match', success: correct, question_id: current.id });
  };

  const handleNext = () => {
    setChoiceResult(null);
    setSimpleResult(null);
    setPhase('answering');
    setCurrent(null);
  };

  const handleSkip = () => {
    recordSkip(current.id);
    trackQuestionSkipped({ module: 'law', question_id: current.id });
    setChoiceResult(null);
    setSimpleResult(null);
    setPhase('answering');
    setCurrent(null);
  };

  const revealed = phase === 'revealed';
  const isCorrect =
    current.kind === 'choice' ? (choiceResult?.correct ?? false) : (simpleResult?.correct ?? false);

  return (
    <div className="lea-page">
      <div className="space-y-4">
        <main
          className={[
            'card space-y-6 p-6 sm:p-8 border-2 transition-colors',
            revealed && isCorrect ? 'border-emerald-500/70' : '',
            revealed && !isCorrect ? 'border-sasp-red' : '',
            !revealed ? 'border-sasp-navy-light' : '',
          ].join(' ')}
        >
          <header className="lea-question-header">
            {current.scenario && <ScenarioBox text={current.scenario} />}
            <h2 data-testid="law-prompt">{current.prompt}</h2>
            {current.ref && (
              <p className="text-xs text-sasp-ink-dim">{current.ref}</p>
            )}
          </header>

          {/* ── Choice ─────────────────────────────────────────── */}
          {current.kind === 'choice' && !revealed && (
            <ChoiceInput
              key={current.id}
              question={current as LawChoice}
              onSubmit={handleChoiceSubmit}
            />
          )}

          {/* ── Choice reveal ───────────────────────────────────── */}
          {current.kind === 'choice' && revealed && choiceResult && (
            <div className="space-y-3">
              <ul className="grid gap-2">
                {(current as LawChoice).options.map((opt, idx) => {
                  const isCorrectOpt = (current as LawChoice).correctIndices.includes(idx);
                  const isChosen = choiceResult.selected.includes(idx);
                  return (
                    <li key={idx}>
                      <div
                        className={[
                          'flex w-full items-center justify-between gap-3 rounded border px-4 py-3 text-left',
                          isCorrectOpt ? 'border-emerald-500 bg-emerald-900/30' : '',
                          isChosen && !isCorrectOpt ? 'border-sasp-red bg-sasp-red/20' : '',
                          !isCorrectOpt && !isChosen
                            ? 'border-sasp-navy-light bg-sasp-bg/30 opacity-60'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <span className="flex items-center gap-3">
                          <kbd className="rounded border border-sasp-navy-light bg-sasp-bg px-1.5 py-0.5 font-mono text-xs text-sasp-ink-dim">
                            {idx + 1}
                          </kbd>
                          <span>{opt}</span>
                        </span>
                        {isCorrectOpt && <span aria-hidden>✓</span>}
                        {isChosen && !isCorrectOpt && <span aria-hidden>✗</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* ── Text (answering) ────────────────────────────────── */}
          {current.kind === 'text' && !revealed && (
            <TextInput
              key={current.id}
              question={current}
              hardMode={hardMode}
              onSubmit={handleTextSubmit}
            />
          )}

          {/* ── Enumeration (always mounted; manages its own revealed state) ── */}
          {current.kind === 'enumeration' && (
            <EnumerationInput key={current.id} question={current} onSubmit={handleEnumSubmit} />
          )}

          {/* ── Match (answering) ────────────────────────────────── */}
          {current.kind === 'match' && !revealed && (
            <MatchInput key={current.id} question={current} onSubmit={handleMatchSubmit} />
          )}

          {/* ── Simple reveal (text / match only) ────────────────── */}
          {revealed && (current.kind === 'text' || current.kind === 'match') && (
            <div className="space-y-3" data-testid="law-reveal">
              {isCorrect ? (
                <p className="reveal-perfect" data-testid="law-reveal-correct">
                  Správně!
                </p>
              ) : (
                <p
                  className="rounded border-l-4 border-rose-400 bg-sasp-navy/40 px-3 py-2 text-sm text-rose-100"
                  data-testid="law-reveal-wrong"
                >
                  Špatně.
                  {current.kind === 'text' && (
                    <> Správná odpověď: <strong>{current.answer}</strong>.</>
                  )}
                </p>
              )}
              {current.note && (
                <p className="text-sm text-sasp-ink-dim" data-testid="law-reveal-note">
                  {current.note}
                </p>
              )}
            </div>
          )}

          {/* ── Choice reveal feedback ────────────────────────────── */}
          {revealed && current.kind === 'choice' && choiceResult && (
            <div className="space-y-3" data-testid="law-reveal-choice">
              {choiceResult.correct ? (
                <p className="reveal-perfect" data-testid="law-reveal-correct">
                  Správně!
                </p>
              ) : (
                <p className="text-sm text-sasp-ink" data-testid="law-reveal-wrong">
                  <strong className="text-sasp-red">Špatně.</strong>
                </p>
              )}
              {current.note && (
                <p className="text-sm text-sasp-ink-dim" data-testid="law-reveal-note">
                  {current.note}
                </p>
              )}
            </div>
          )}

          {/* ── Footer ─────────────────────────────────────────── */}
          <div className="submit-footer submit-footer--split">
            {current.kind === 'text' ? (
              <label className="flex items-center gap-2 text-xs text-sasp-ink-dim">
                <input
                  type="checkbox"
                  checked={hardMode}
                  onChange={(e) => setHardMode(e.target.checked)}
                  data-testid="law-hard-mode"
                  className="accent-sasp-tan"
                  disabled={revealed}
                />
                Hard mode (bez nápovědy)
              </label>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSkip}
                data-testid="law-skip"
              >
                Přeskočit
              </button>
              {revealed && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleNext}
                  data-testid="law-next"
                >
                  Další otázka
                </button>
              )}
            </div>
          </div>
        </main>
        <div className="flex justify-end">
          <LawResetButton onReset={reset} />
        </div>
      </div>
      {sidePanel(current.id)}
    </div>
  );
}
