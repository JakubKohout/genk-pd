import { useMemo } from 'react';
import { CODES } from '../data/codes';
import { useCodeProgress } from '../state/useCodeProgress';
import { useSettings } from '../state/useSettings';
import type { ImportanceFilter } from '@/shared/storage';

const SCORE_CLASS: Record<number, string> = {
  [-3]: 'bg-sasp-red text-sasp-ink border-sasp-red',
  [-2]: 'bg-sasp-red/70 text-sasp-ink border-sasp-red/70',
  [-1]: 'bg-sasp-red/40 text-sasp-ink border-sasp-red/50',
  0: 'bg-sasp-navy/40 text-sasp-ink border-sasp-tan/30',
  1: 'bg-emerald-700/40 text-sasp-ink border-emerald-600/50',
  2: 'bg-emerald-600/60 text-sasp-ink border-emerald-500/60',
  3: 'bg-emerald-500 text-sasp-bg border-emerald-400',
};

export function SidePanel() {
  const { progress } = useCodeProgress();
  const { importanceFilter } = useSettings();

  const filteredCodes = useMemo(
    () => CODES.filter((c) => importanceFilter[c.importance]),
    [importanceFilter],
  );

  const maxScore = filteredCodes.length * 3;
  const earnedScore = filteredCodes.reduce(
    (sum, c) => sum + Math.max(0, progress[c.id]?.score ?? 0),
    0,
  );
  const pct = maxScore === 0 ? 0 : Math.round((earnedScore / maxScore) * 100);
  const isComplete = maxScore > 0 && earnedScore === maxScore;

  return (
    <aside
      className="card flex flex-col gap-3 p-4"
      data-testid="side-panel"
      aria-label="Přehled kódů"
    >
      <ProgressHeader pct={pct} isComplete={isComplete} />
      <CodeGrid filteredCodes={filteredCodes} progress={progress} filter={importanceFilter} />
    </aside>
  );
}

function ProgressHeader({ pct, isComplete }: { pct: number; isComplete: boolean }) {
  return (
    <div data-testid="progress-header" className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs uppercase tracking-wider text-sasp-ink-dim">
        <span>Splněno</span>
        <span data-testid="progress-percent" className="text-sasp-ink">
          {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sasp-navy">
        <div
          data-testid="progress-bar"
          data-pct={pct}
          data-complete={isComplete}
          className={[
            'h-full transition-all duration-300',
            isComplete ? 'bg-sasp-gold animate-gold-pulse' : 'bg-sasp-tan',
          ].join(' ')}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

function CodeGrid({
  filteredCodes,
  progress,
  filter,
}: {
  filteredCodes: typeof CODES;
  progress: Record<string, { score: number; lastAskedAtTurn: number }>;
  filter: ImportanceFilter;
}) {
  if (filteredCodes.length === 0) {
    return (
      <p className="rounded border border-dashed border-sasp-navy-light p-4 text-center text-xs text-sasp-ink-dim">
        Žádné kódy ve zvoleném filtru. Zapni alespoň jednu kategorii v nastavení níže.
      </p>
    );
  }
  return (
    <div
      role="list"
      aria-label={`Kódy (${describeFilter(filter)})`}
      className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4"
    >
      {filteredCodes.map((c) => {
        const score = progress[c.id]?.score ?? 0;
        const done = score >= 3;
        return (
          <div
            key={c.id}
            role="listitem"
            data-testid={`chip-${c.id}`}
            data-score={score}
            data-done={done}
            title={`${c.id} — ${c.meaning}`}
            className={['chip', SCORE_CLASS[score] ?? SCORE_CLASS[0]!].join(' ')}
          >
            <span>{c.id}</span>
            {done && <span className="absolute right-1 top-0.5 text-[10px]">✓</span>}
          </div>
        );
      })}
    </div>
  );
}

function describeFilter(filter: ImportanceFilter): string {
  const parts: string[] = [];
  if (filter.mandatory) parts.push('Povinný');
  if (filter.rare) parts.push('Zřídka');
  if (filter.unnecessary) parts.push('Nepotřebný');
  return parts.length ? parts.join(', ') : 'žádný';
}
