import { useEffect, useState } from 'react';
import { LEA_QUESTIONS } from '../data/questions';
import { matchAnswer } from '../logic/match';
import { isLeaComplete, pickNextQuestion } from '../state/selection';
import { useLeaProgress } from '../state/useLeaProgress';
import { useMediaQuery } from '@/shared/useMediaQuery';
import { AnswerInput } from './AnswerInput';
import { AnswerList, type AnswerEntry } from './AnswerList';
import { LeaResetButton } from './LeaResetButton';
import { SidePanel } from './SidePanel';
import { SubmitFooter } from './SubmitFooter';
import { trackLawAnswered, trackQuestionSkipped } from '@/shared/analytics';

type Phase = 'answering' | 'revealed';

interface AnsweredChip {
  key: string;
  raw: string;
  itemId: string | null;
  duplicate: boolean;
}

export function LeaQuizPage() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { progress, turn, recordSubmit, recordSkip, reset } = useLeaProgress();

  const [current, setCurrent] = useState<ReturnType<typeof pickNextQuestion>>(null);
  const [chips, setChips] = useState<AnsweredChip[]>([]);
  const [phase, setPhase] = useState<Phase>('answering');

  useEffect(() => {
    if (current !== null) return;
    if (phase !== 'answering') return;
    const next = pickNextQuestion({ progress, turn }, LEA_QUESTIONS);
    setCurrent(next);
  }, [current, phase, progress, turn]);

  const handleSelectQuestion = (questionId: string) => {
    const selected = LEA_QUESTIONS.find((q) => q.id === questionId);
    if (!selected || selected.id === current?.id) return;
    setChips([]);
    setPhase('answering');
    setCurrent(selected);
  };

  if (isLeaComplete({ progress, turn }, LEA_QUESTIONS) && !current) {
    return (
      <div className="lea-page">
        <div className="card congrats p-6 sm:p-8" data-testid="lea-congrats">
          <h2>Hotovo!</h2>
          <p>Zvládl jsi všechny otázky.</p>
          <button type="button" className="btn-primary" onClick={reset}>
            Začít znovu
          </button>
        </div>
        {isDesktop ? (
          <SidePanel
            questions={LEA_QUESTIONS}
            progress={progress}
            onSelectQuestion={handleSelectQuestion}
          />
        ) : (
          <LeaMobilePanel
            questions={LEA_QUESTIONS}
            progress={progress}
            onSelectQuestion={handleSelectQuestion}
          />
        )}
      </div>
    );
  }

  if (!current) return null;

  const foundIds = new Set(
    chips.filter((c) => c.itemId && !c.duplicate).map((c) => c.itemId as string),
  );

  const handleCommit = (raw: string) => {
    const item = matchAnswer(raw, current.items);
    const duplicate = !!item && foundIds.has(item.id);
    setChips((prev) => [
      ...prev,
      { key: `${prev.length}-${Date.now()}`, raw, itemId: item?.id ?? null, duplicate },
    ]);
  };

  const handleRemove = (key: string) => {
    setChips((prev) => prev.filter((c) => c.key !== key));
  };

  const handleSubmit = () => {
    if (!current) return;
    const wrongCount = chips.filter((c) => c.itemId === null).length;
    const dupCount = chips.filter((c) => c.duplicate).length;
    const found = chips.filter((c) => c.itemId && !c.duplicate);
    const perfect =
      wrongCount === 0 && dupCount === 0 && found.length === current.items.length;
    recordSubmit(current.id, { perfect });
    trackLawAnswered({ success: perfect, question_id: current.id });
    setPhase('revealed');
  };

  const handleNext = () => {
    setChips([]);
    setPhase('answering');
    setCurrent(null);
  };

  const handleSkip = () => {
    if (!current) return;
    recordSkip(current.id);
    trackQuestionSkipped({ module: 'lea', question_id: current.id });
    setChips([]);
    setPhase('answering');
    setCurrent(null);
  };

  const entries: AnswerEntry[] = chips.map((c) => {
    if (c.itemId === null) {
      return { key: c.key, status: 'wrong', text: c.raw, meta: 'žádná shoda' };
    }
    const item = current.items.find((i) => i.id === c.itemId)!;
    if (c.duplicate) {
      return { key: c.key, status: 'duplicate', text: item.quote, meta: 'duplikát' };
    }
    return { key: c.key, status: 'correct', text: item.quote, meta: item.ref };
  });

  if (phase === 'revealed') {
    const foundIdSet = new Set(
      chips.filter((c) => c.itemId && !c.duplicate).map((c) => c.itemId as string),
    );
    for (const item of current.items) {
      if (!foundIdSet.has(item.id)) {
        entries.push({
          key: `missed-${item.id}`,
          status: 'missed',
          text: item.quote,
          meta: item.ref,
        });
      }
    }
  }

  const hasMissed = entries.some((e) => e.status === 'missed');
  const hasWrong = entries.some((e) => e.status === 'wrong');
  const hasDuplicate = entries.some((e) => e.status === 'duplicate');
  const showPerfectBanner =
    phase === 'revealed' && !hasMissed && !hasWrong && !hasDuplicate && entries.length > 0;

  return (
    <div className="lea-page">
      <div className="space-y-4">
        <main className="card space-y-6 p-6 sm:p-8">
          <header className="lea-question-header">
            <h2>{current.prompt}</h2>
            <span className="lea-question-ref" data-testid="question-ref">
              {current.ref}
            </span>
          </header>
          <AnswerInput
            items={current.items}
            foundIds={foundIds}
            disabled={phase === 'revealed'}
            onCommit={handleCommit}
          />
          {showPerfectBanner && (
            <p className="reveal-perfect" data-testid="reveal-perfect">
              Perfekt! Vyjmenoval jsi všechno.
            </p>
          )}
          <AnswerList
            entries={entries}
            onRemove={phase === 'answering' ? handleRemove : undefined}
            showMissedHeading={phase === 'revealed' && hasMissed}
          />
          <SubmitFooter
            phase={phase}
            onSubmit={handleSubmit}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        </main>
        <div className="flex justify-end">
          <LeaResetButton />
        </div>
      </div>
      {isDesktop ? (
        <SidePanel
          questions={LEA_QUESTIONS}
          progress={progress}
          onSelectQuestion={handleSelectQuestion}
          currentId={current.id}
        />
      ) : (
        <LeaMobilePanel
          questions={LEA_QUESTIONS}
          progress={progress}
          onSelectQuestion={handleSelectQuestion}
          currentId={current.id}
        />
      )}
    </div>
  );
}

function LeaMobilePanel({
  questions,
  progress,
  onSelectQuestion,
  currentId,
}: {
  questions: typeof LEA_QUESTIONS;
  progress: ReturnType<typeof useLeaProgress>['progress'];
  onSelectQuestion?: (id: string) => void;
  currentId?: string;
}) {
  const [open, setOpen] = useState(false);
  const total = questions.length;
  const clampedSum = questions.reduce(
    (sum, q) => sum + Math.min(2, Math.max(0, progress[q.id]?.score ?? 0)),
    0,
  );
  const pct = total === 0 ? 0 : Math.round((clampedSum / (2 * total)) * 100);

  const handleSelect = onSelectQuestion
    ? (id: string) => {
        setOpen(false);
        onSelectQuestion(id);
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
            Přehled otázek
            <span data-testid="lea-mobile-progress-percent" className="ml-2 text-sasp-ink-dim">
              — {pct}% splněno
            </span>
          </span>
          <span aria-hidden className="text-xs">{open ? '▲' : '▼'}</span>
        </span>
      </summary>
      <div className="mt-2">
        <SidePanel
          questions={questions}
          progress={progress}
          onSelectQuestion={handleSelect}
          currentId={currentId}
        />
      </div>
    </details>
  );
}
