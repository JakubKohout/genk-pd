import type { ProgressEntry } from '@/shared/storage';

const SCORE_CLASS: Record<number, string> = {
  [-3]: 'bg-sasp-red text-sasp-ink border-sasp-red',
  [-2]: 'bg-sasp-red/70 text-sasp-ink border-sasp-red/70',
  [-1]: 'bg-sasp-red/40 text-sasp-ink border-sasp-red/50',
  0: 'bg-sasp-navy/40 text-sasp-ink border-sasp-tan/30',
  1: 'bg-emerald-700/40 text-sasp-ink border-emerald-600/50',
  2: 'bg-emerald-600/60 text-sasp-ink border-emerald-500/60',
  3: 'bg-emerald-500 text-sasp-bg border-emerald-400',
};

export interface PenalPanelItem {
  id: string;
  label: string;
  /** Optional secondary text shown next to the label. Hidden when omitted. */
  sublabel?: string;
  hoverTitle: string;
}

interface Props {
  items: readonly PenalPanelItem[];
  progress: Record<string, ProgressEntry>;
  testIdPrefix: string;
  onSelect?: (id: string) => void;
  currentId?: string;
  ariaLabel: string;
}

export function PenalSidePanel({
  items,
  progress,
  testIdPrefix,
  onSelect,
  currentId,
  ariaLabel,
}: Props) {
  const total = items.length;
  const clampedSum = items.reduce(
    (sum, it) => sum + Math.min(2, Math.max(0, progress[it.id]?.score ?? 0)),
    0,
  );
  const pct = total === 0 ? 0 : Math.round((clampedSum / (2 * total)) * 100);
  const isComplete = total > 0 && pct === 100;

  return (
    <aside
      className="card flex flex-col gap-3 p-4"
      data-testid={`${testIdPrefix}-side-panel`}
      aria-label={ariaLabel}
    >
      <ProgressHeader pct={pct} isComplete={isComplete} testIdPrefix={testIdPrefix} />
      <ul className="flex flex-col gap-1.5 list-none p-0 m-0" role="list">
        {items.map((it) => {
          const score = progress[it.id]?.score ?? 0;
          const done = score >= 2;
          const isCurrent = currentId === it.id;
          const baseClass = [
            'flex w-full items-center gap-3 rounded border px-2.5 py-1.5 text-sm transition text-left',
            SCORE_CLASS[score] ?? SCORE_CLASS[0]!,
          ].join(' ');
          const interactiveClass = onSelect
            ? 'cursor-pointer hover:brightness-110 aria-[current=true]:ring-2 aria-[current=true]:ring-sasp-tan aria-[current=true]:ring-offset-2 aria-[current=true]:ring-offset-sasp-bg'
            : '';
          const inner = (
            <>
              <span
                className={`font-mono text-xs shrink-0 ${it.sublabel ? 'w-14' : 'flex-1'}`}
              >
                {it.label}
              </span>
              {it.sublabel && (
                <span className="flex-1 min-w-0 break-words">{it.sublabel}</span>
              )}
              {done && <span aria-hidden className="text-xs">✓</span>}
            </>
          );
          return (
            <li key={it.id}>
              {onSelect ? (
                <button
                  type="button"
                  data-testid={`chip-${it.id}`}
                  data-score={score}
                  data-done={done}
                  title={it.hoverTitle}
                  aria-current={isCurrent ? 'true' : undefined}
                  onClick={() => onSelect(it.id)}
                  className={[baseClass, interactiveClass].join(' ')}
                >
                  {inner}
                </button>
              ) : (
                <div
                  data-testid={`chip-${it.id}`}
                  data-score={score}
                  data-done={done}
                  title={it.hoverTitle}
                  className={baseClass}
                >
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function ProgressHeader({
  pct,
  isComplete,
  testIdPrefix,
}: {
  pct: number;
  isComplete: boolean;
  testIdPrefix: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs uppercase tracking-wider text-sasp-ink-dim">
        <span>Splněno</span>
        <span data-testid={`${testIdPrefix}-progress-percent`} className="text-sasp-ink">
          {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sasp-navy">
        <div
          data-testid={`${testIdPrefix}-progress-bar`}
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
