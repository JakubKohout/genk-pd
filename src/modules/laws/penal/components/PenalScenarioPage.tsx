import { useEffect, useMemo, useState } from 'react';
import { useMediaQuery } from '@/shared/useMediaQuery';
import { trackPenalAnswered, trackPenalCompleted, trackQuestionSkipped } from '@/shared/analytics';
import { AnswerList, type AnswerEntry } from '@/modules/laws/lea/components/AnswerList';
import { PENAL_PARAGRAPHS } from '../data/paragraphs';
import { PENAL_SCENARIOS } from '../data/scenarios';
import type { ExpectedAnswer, PenalScenario } from '../data/types';
import { matchScenarioAnswer } from '../logic/matchScenario';
import {
  isScenariosComplete,
  pickNextScenario,
} from '../state/selection';
import { usePenalScenarioProgress } from '../state/usePenalProgress';
import { PenalAnswerInput } from './PenalAnswerInput';
import { PenalResetButton } from './PenalResetButton';
import { PenalSidePanel, type PenalPanelItem } from './PenalSidePanel';
import { PenalSubmitFooter } from './PenalSubmitFooter';

type Phase = 'answering' | 'revealed';

interface AnsweredChip {
  key: string;
  raw: string;
  /** null when input could not be parsed to a known paragraf+sub. */
  parsed: ExpectedAnswer | null;
  /** true when this is the second+ chip referring to the same parsed answer. */
  duplicate: boolean;
}

const paragraphById = new Map(PENAL_PARAGRAPHS.map((p) => [p.id, p]));

function expectedKey(e: ExpectedAnswer): string {
  return e.subId ? `${e.paragraphId}#${e.subId}` : e.paragraphId;
}

function expectedDisplay(e: ExpectedAnswer): { text: string; meta: string } {
  const p = paragraphById.get(e.paragraphId)!;
  const sub = e.subId ? p.subs.find((s) => s.id === e.subId) : undefined;
  return {
    text: e.subId ? `${p.number}${e.subId}` : p.number,
    meta: sub ? `${p.title} — ${sub.description}` : p.title,
  };
}

function panelItems(scenarios: readonly PenalScenario[]): PenalPanelItem[] {
  return scenarios.map((s) => ({
    id: s.id,
    label: s.ref,
    sublabel: s.prompt.length > 80 ? s.prompt.slice(0, 77) + '…' : s.prompt,
    hoverTitle: s.prompt,
  }));
}

export function PenalScenarioPage() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { progress, turn, recordSubmit, recordSkip, reset } = usePenalScenarioProgress();

  const [current, setCurrent] = useState<PenalScenario | null>(null);
  const [chips, setChips] = useState<AnsweredChip[]>([]);
  const [phase, setPhase] = useState<Phase>('answering');
  const [hardMode, setHardMode] = useState(false);

  useEffect(() => {
    if (current !== null) return;
    if (phase !== 'answering') return;
    const next = pickNextScenario({ progress, turn }, PENAL_SCENARIOS);
    setCurrent(next);
  }, [current, phase, progress, turn]);

  const items = useMemo(() => panelItems(PENAL_SCENARIOS), []);

  const handleSelect = (id: string) => {
    const selected = PENAL_SCENARIOS.find((s) => s.id === id);
    if (!selected || selected.id === current?.id) return;
    setChips([]);
    setPhase('answering');
    setCurrent(selected);
  };

  if (isScenariosComplete({ progress, turn }, PENAL_SCENARIOS) && !current) {
    return (
      <div className="lea-page">
        <div className="card congrats p-6 sm:p-8" data-testid="penal-scenarios-congrats">
          <h2>Hotovo!</h2>
          <p>Zvládl jsi všechny scénky.</p>
          <button type="button" className="btn-primary" onClick={reset}>
            Začít znovu
          </button>
        </div>
        {isDesktop ? (
          <PenalSidePanel
            items={items}
            progress={progress}
            testIdPrefix="penal-scenarios"
            ariaLabel="Přehled scénář"
            onSelect={handleSelect}
          />
        ) : (
          <PenalScenariosMobilePanel
            items={items}
            progress={progress}
            onSelect={handleSelect}
          />
        )}
      </div>
    );
  }

  if (!current) return null;

  const foundKeys = new Set(
    chips.filter((c) => c.parsed && !c.duplicate).map((c) => expectedKey(c.parsed!)),
  );

  const handleCommit = (raw: string) => {
    const parsed = matchScenarioAnswer(raw, PENAL_PARAGRAPHS);
    const key = parsed ? expectedKey(parsed) : null;
    const duplicate = !!key && foundKeys.has(key);
    setChips((prev) => [
      ...prev,
      { key: `${prev.length}-${Date.now()}`, raw, parsed, duplicate },
    ]);
  };

  const handleRemove = (key: string) => {
    setChips((prev) => prev.filter((c) => c.key !== key));
  };

  const expectedKeys = new Set(current.expected.map(expectedKey));

  const handleSubmit = () => {
    if (!current) return;
    let correct = 0;
    let wrong = 0;
    let duplicate = 0;
    for (const c of chips) {
      if (!c.parsed) {
        wrong += 1;
        continue;
      }
      if (c.duplicate) {
        duplicate += 1;
        continue;
      }
      const k = expectedKey(c.parsed);
      if (expectedKeys.has(k)) correct += 1;
      else wrong += 1;
    }
    const perfect = wrong === 0 && duplicate === 0 && correct === current.expected.length;
    recordSubmit(current.id, { perfect });
    trackPenalAnswered({ mode: 'scenario', success: perfect, question_id: current.id });
    setPhase('revealed');

    // Detect completion (this scenario was the last not yet mastered)
    const newProgress = {
      ...progress,
      [current.id]: {
        score: Math.min(2, (progress[current.id]?.score ?? 0) + (perfect ? 2 : -2)),
        lastAskedAtTurn: turn,
      },
    };
    if (isScenariosComplete({ progress: newProgress, turn: turn + 1 }, PENAL_SCENARIOS)) {
      trackPenalCompleted({ mode: 'scenario' });
    }
  };

  const handleNext = () => {
    setChips([]);
    setPhase('answering');
    setCurrent(null);
  };

  const handleSkip = () => {
    if (!current) return;
    recordSkip(current.id);
    trackQuestionSkipped({ module: 'penal-scenario', question_id: current.id });
    setChips([]);
    setPhase('answering');
    setCurrent(null);
  };

  // Build entries
  const entries: AnswerEntry[] = chips.map((c) => {
    if (!c.parsed) {
      return { key: c.key, status: 'wrong', text: c.raw, meta: 'neznámý paragraf' };
    }
    const display = expectedDisplay(c.parsed);
    if (c.duplicate) {
      return { key: c.key, status: 'duplicate', text: display.text, meta: 'duplikát' };
    }
    const k = expectedKey(c.parsed);
    if (!expectedKeys.has(k)) {
      return { key: c.key, status: 'wrong', text: display.text, meta: 'neaplikovatelný' };
    }
    return { key: c.key, status: 'correct', text: display.text, meta: display.meta };
  });

  if (phase === 'revealed') {
    for (const exp of current.expected) {
      const k = expectedKey(exp);
      if (!foundKeys.has(k)) {
        const display = expectedDisplay(exp);
        entries.push({
          key: `missed-${k}`,
          status: 'missed',
          text: display.text,
          meta: display.meta,
        });
      }
    }
  }

  const hasMissed = entries.some((e) => e.status === 'missed');
  const hasWrong = entries.some((e) => e.status === 'wrong');
  const hasDuplicate = entries.some((e) => e.status === 'duplicate');
  const showPerfectBanner =
    phase === 'revealed' && !hasMissed && !hasWrong && !hasDuplicate && entries.length > 0;

  // Currently committed canonical IDs to exclude from suggestions
  const excludeKeys = new Set<string>();
  for (const c of chips) {
    if (c.parsed) {
      const num = c.parsed.paragraphId.replace('penal.', '');
      excludeKeys.add(c.parsed.subId ? `${num}${c.parsed.subId}` : num);
    }
  }

  return (
    <div className="lea-page">
      <div className="space-y-4">
        <main className="card space-y-6 p-6 sm:p-8">
          <header className="lea-question-header">
            <h2>{current.prompt}</h2>
            <span className="lea-question-ref" data-testid="penal-scenario-ref">
              Scénář {current.ref}
            </span>
          </header>
          <PenalAnswerInput
            paragraphs={PENAL_PARAGRAPHS}
            excludeKeys={excludeKeys}
            disabled={phase === 'revealed'}
            disableSuggestions={hardMode}
            onCommit={handleCommit}
          />
          {showPerfectBanner && (
            <p className="reveal-perfect" data-testid="penal-reveal-perfect">
              Perfekt! Aplikoval jsi přesně ty správné paragrafy.
            </p>
          )}
          {phase === 'revealed' && current.educationalNote && (
            <p
              className="rounded border border-sasp-tan/40 bg-sasp-navy/40 p-3 text-sm text-sasp-ink"
              data-testid="penal-scenario-note"
            >
              <strong>Pozor:</strong> {current.educationalNote}
            </p>
          )}
          <AnswerList
            entries={entries}
            onRemove={phase === 'answering' ? handleRemove : undefined}
            showMissedHeading={phase === 'revealed' && hasMissed}
          />
          <PenalSubmitFooter
            phase={phase}
            skipTestId="penal-scenario-skip"
            onSubmit={handleSubmit}
            onNext={handleNext}
            onSkip={handleSkip}
            leftSlot={
              <label className="flex cursor-pointer items-center gap-2 text-xs text-sasp-ink-dim">
                <input
                  type="checkbox"
                  checked={hardMode}
                  onChange={(e) => setHardMode(e.target.checked)}
                  data-testid="penal-hardmode-toggle"
                />
                <span>Hard mode — bez nápovědy</span>
              </label>
            }
          />
        </main>
        <div className="flex justify-end">
          <PenalResetButton
            module="penal-scenario"
            testIdPrefix="penal-scenario"
            onReset={reset}
          />
        </div>
      </div>
      {isDesktop ? (
        <PenalSidePanel
          items={items}
          progress={progress}
          testIdPrefix="penal-scenarios"
          ariaLabel="Přehled scénář"
          onSelect={handleSelect}
          currentId={current.id}
        />
      ) : (
        <PenalScenariosMobilePanel
          items={items}
          progress={progress}
          onSelect={handleSelect}
          currentId={current.id}
        />
      )}
    </div>
  );
}

function PenalScenariosMobilePanel({
  items,
  progress,
  onSelect,
  currentId,
}: {
  items: readonly PenalPanelItem[];
  progress: ReturnType<typeof usePenalScenarioProgress>['progress'];
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
            Přehled scénář
            <span
              data-testid="penal-scenarios-mobile-progress-percent"
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
          testIdPrefix="penal-scenarios"
          ariaLabel="Přehled scénář"
          onSelect={handleSelect}
          currentId={currentId}
        />
      </div>
    </details>
  );
}
