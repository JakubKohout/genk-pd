import type { POI, POICategory } from '../data/types';
import type { GeoCategoryFilter, ProgressEntry } from '@/shared/storage';

const SCORE_CLASS: Record<number, string> = {
  [-3]: 'bg-sasp-red text-sasp-ink border-sasp-red',
  [-2]: 'bg-sasp-red/70 text-sasp-ink border-sasp-red/70',
  [-1]: 'bg-sasp-red/40 text-sasp-ink border-sasp-red/50',
  0: 'bg-sasp-navy/40 text-sasp-ink border-sasp-tan/30',
  1: 'bg-emerald-700/40 text-sasp-ink border-emerald-600/50',
  2: 'bg-emerald-600/60 text-sasp-ink border-emerald-500/60',
  3: 'bg-emerald-500 text-sasp-bg border-emerald-400',
};

const CATEGORY_LABEL: Record<POICategory, string> = {
  street: 'Ulice',
  highway: 'Dálnice',
  city: 'Body ve městě',
  state: 'Body ve státě',
};

const CATEGORY_ABBR: Record<POICategory, string> = {
  street: 'ULI',
  highway: 'DÁL',
  city: 'MĚS',
  state: 'STÁT',
};

const CATEGORY_ORDER: POICategory[] = ['city', 'state', 'street', 'highway'];

interface Props {
  mode: 'blind' | 'name';
  pois: readonly POI[];
  progress: Record<string, ProgressEntry>;
  filter: GeoCategoryFilter;
  onSetCategory: (category: POICategory, enabled: boolean) => void;
  currentId?: string;
}

export function GeoSidePanel({
  mode,
  pois,
  progress,
  filter,
  onSetCategory,
  currentId,
}: Props) {
  const filtered = pois.filter((p) => filter[p.category]);
  const total = filtered.length;
  const clampedSum = filtered.reduce(
    (sum, p) => sum + Math.min(2, Math.max(0, progress[p.id]?.score ?? 0)),
    0,
  );
  const pct = total === 0 ? 0 : Math.round((clampedSum / (2 * total)) * 100);
  const isComplete = total > 0 && pct === 100;

  return (
    <aside
      className="card flex flex-col gap-3 p-4"
      data-testid={`geo-${mode}-side-panel`}
      aria-label="Přehled geografie"
    >
      <ProgressHeader mode={mode} pct={pct} isComplete={isComplete} />

      <fieldset className="flex flex-wrap gap-2 text-xs">
        <legend className="sr-only">Kategorie</legend>
        {CATEGORY_ORDER.map((cat) => (
          <label
            key={cat}
            className="flex items-center gap-1.5 cursor-pointer rounded border border-sasp-navy-light px-2 py-1 hover:bg-sasp-navy-light"
          >
            <input
              type="checkbox"
              checked={filter[cat]}
              onChange={(e) => onSetCategory(cat, e.target.checked)}
              data-testid={`geo-filter-${cat}`}
              className="accent-sasp-tan"
            />
            <span>{CATEGORY_LABEL[cat]}</span>
          </label>
        ))}
      </fieldset>

      <ul className="flex flex-col gap-1.5 list-none p-0 m-0" role="list">
        {filtered.map((p) => {
          const score = progress[p.id]?.score ?? 0;
          const done = score >= 2;
          const isCurrent = currentId === p.id;
          const cls = [
            'flex w-full items-center gap-3 rounded border px-2.5 py-1.5 text-sm transition text-left',
            SCORE_CLASS[score] ?? SCORE_CLASS[0]!,
            isCurrent ? 'ring-2 ring-sasp-tan ring-offset-2 ring-offset-sasp-bg' : '',
          ].join(' ');
          return (
            <li key={p.id}>
              <div
                data-testid={`chip-${p.id}`}
                data-score={score}
                data-done={done}
                title={p.description}
                aria-current={isCurrent ? 'true' : undefined}
                className={cls}
              >
                <span className="font-mono text-[10px] shrink-0 w-9 uppercase text-sasp-ink-dim">
                  {CATEGORY_ABBR[p.category]}
                </span>
                <span className="flex-1 min-w-0 truncate">{p.name}</span>
                {done && <span aria-hidden className="text-xs">✓</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function ProgressHeader({
  mode,
  pct,
  isComplete,
}: {
  mode: 'blind' | 'name';
  pct: number;
  isComplete: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs uppercase tracking-wider text-sasp-ink-dim">
        <span>Splněno</span>
        <span data-testid={`geo-${mode}-progress-percent`} className="text-sasp-ink">
          {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sasp-navy">
        <div
          data-testid={`geo-${mode}-progress-bar`}
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
