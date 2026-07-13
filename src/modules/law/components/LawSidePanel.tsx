import { useEffect, useState } from 'react';
import type { ProgressEntry, LawSourceFilter, LawThemeFilter, LawThemeKey } from '@/shared/storage';
import { LAW_SOURCE_KEYS, LAW_THEME_KEYS } from '@/shared/storage';
import type { LawSource, LawTheme } from '../data/types';

const SCORE_CLASS: Record<number, string> = {
  [-3]: 'bg-sasp-red text-sasp-ink border-sasp-red',
  [-2]: 'bg-sasp-red/70 text-sasp-ink border-sasp-red/70',
  [-1]: 'bg-sasp-red/40 text-sasp-ink border-sasp-red/50',
  0: 'bg-sasp-navy/40 text-sasp-ink border-sasp-tan/30',
  1: 'bg-emerald-700/40 text-sasp-ink border-emerald-600/50',
  2: 'bg-emerald-600/60 text-sasp-ink border-emerald-500/60',
  3: 'bg-emerald-500 text-sasp-bg border-emerald-400',
};

const SOURCE_LABEL: Record<LawSource, string> = {
  lea: 'LEA',
  penal: 'Penal',
  sasp: 'SASP',
};

const SOURCE_ABBR: Record<LawSource, string> = {
  lea: 'L',
  penal: 'P',
  sasp: 'S',
};

const THEME_LABEL: Record<LawTheme, string> = {
  pojmy: 'Pojmy',
  hodnosti: 'Hodnosti',
  jednani: 'Jednání',
  rto: 'Rádio',
  vybava: 'Výbava',
  zasah: 'Zásah',
  zadrzeni: 'Zadržení',
  kriminalistika: 'Kriminalistika',
  paragrafy: 'Paragrafy',
};

export interface LawPanelItem {
  id: string;
  source: LawSource;
  theme: LawTheme;
  /** Compact text shown in the chip (the question title or prompt). */
  label: string;
}

interface Props {
  items: readonly LawPanelItem[];
  progress: Record<string, ProgressEntry>;
  sourceFilter: LawSourceFilter;
  themeFilter: LawThemeFilter;
  onSetSource: (key: LawSource, enabled: boolean) => void;
  onSetTheme: (key: LawThemeKey, enabled: boolean) => void;
  currentId?: string;
  /** When provided, chips become clickable and switch to that question. */
  onSelect?: (id: string) => void;
}

function clampedScoreSum(items: readonly LawPanelItem[], progress: Record<string, ProgressEntry>) {
  return items.reduce((sum, it) => sum + Math.min(2, Math.max(0, progress[it.id]?.score ?? 0)), 0);
}

export function LawSidePanel({
  items,
  progress,
  sourceFilter,
  themeFilter,
  onSetSource,
  onSetTheme,
  currentId,
  onSelect,
}: Props) {
  const filtered = items.filter((it) => sourceFilter[it.source] && themeFilter[it.theme]);
  const total = filtered.length;
  const pct = total === 0 ? 0 : Math.round((clampedScoreSum(filtered, progress) / (2 * total)) * 100);
  const isComplete = total > 0 && pct === 100;

  const groups = LAW_THEME_KEYS.map((theme) => ({
    theme,
    items: filtered.filter((it) => it.theme === theme),
  })).filter((g) => g.items.length > 0);

  const currentTheme = currentId
    ? filtered.find((it) => it.id === currentId)?.theme
    : undefined;

  const [expanded, setExpanded] = useState<Set<LawTheme>>(() =>
    currentTheme ? new Set([currentTheme]) : new Set(),
  );

  useEffect(() => {
    if (!currentTheme) return;
    setExpanded((prev) => (prev.has(currentTheme) ? prev : new Set(prev).add(currentTheme)));
  }, [currentTheme]);

  const toggle = (theme: LawTheme) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(theme)) next.delete(theme);
      else next.add(theme);
      return next;
    });

  return (
    <aside
      className="card flex flex-col gap-3 p-4"
      data-testid="law-side-panel"
      aria-label="Přehled zákonů"
    >
      <ProgressHeader pct={pct} isComplete={isComplete} />

      <fieldset className="flex flex-wrap gap-2 text-xs">
        <legend className="sr-only">Zdroje</legend>
        {LAW_SOURCE_KEYS.map((source) => (
          <label
            key={source}
            className="flex items-center gap-1.5 cursor-pointer rounded border border-sasp-navy-light px-2 py-1 hover:bg-sasp-navy-light"
          >
            <input
              type="checkbox"
              checked={sourceFilter[source]}
              onChange={(e) => onSetSource(source, e.target.checked)}
              data-testid={`law-filter-source-${source}`}
              className="accent-sasp-tan"
            />
            <span>{SOURCE_LABEL[source]}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-wrap gap-2 text-xs">
        <legend className="sr-only">Témata</legend>
        {LAW_THEME_KEYS.map((theme) => (
          <label
            key={theme}
            className="flex items-center gap-1.5 cursor-pointer rounded border border-sasp-navy-light px-2 py-1 hover:bg-sasp-navy-light"
          >
            <input
              type="checkbox"
              checked={themeFilter[theme]}
              onChange={(e) => onSetTheme(theme, e.target.checked)}
              data-testid={`law-filter-theme-${theme}`}
              className="accent-sasp-tan"
            />
            <span>{THEME_LABEL[theme]}</span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-2">
        {groups.map((g) => {
          const isOpen = expanded.has(g.theme);
          const gTotal = g.items.length;
          const gMastered = g.items.filter((it) => (progress[it.id]?.score ?? 0) >= 2).length;
          const gPct = Math.round((clampedScoreSum(g.items, progress) / (2 * gTotal)) * 100);
          return (
            <div key={g.theme} className="flex flex-col gap-1.5">
              <button
                type="button"
                data-testid={`law-group-${g.theme}`}
                aria-expanded={isOpen}
                onClick={() => toggle(g.theme)}
                className="flex w-full items-center gap-2 rounded border border-sasp-navy-light px-2.5 py-1.5 text-left text-sm hover:bg-sasp-navy-light"
              >
                <span aria-hidden className="w-3 shrink-0 text-xs text-sasp-ink-dim">
                  {isOpen ? '▾' : '▸'}
                </span>
                <span className="flex-1 min-w-0 truncate font-medium">{THEME_LABEL[g.theme]}</span>
                <span className="shrink-0 text-xs text-sasp-ink-dim">
                  {gMastered}/{gTotal}
                </span>
                <span
                  aria-hidden
                  className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-sasp-navy"
                >
                  <span
                    data-testid={`law-group-${g.theme}-bar`}
                    className="block h-full bg-sasp-tan"
                    style={{ width: `${gPct}%` }}
                  />
                </span>
              </button>

              {isOpen && (
                <ul className="flex flex-col gap-1.5 list-none p-0 m-0 pl-2" role="list">
                  {g.items.map((it) => {
                    const score = progress[it.id]?.score ?? 0;
                    const done = score >= 2;
                    const isCurrent = currentId === it.id;
                    const cls = [
                      'flex w-full items-center gap-3 rounded border px-2.5 py-1.5 text-sm transition text-left',
                      SCORE_CLASS[score] ?? SCORE_CLASS[0]!,
                      isCurrent ? 'ring-2 ring-sasp-tan ring-offset-2 ring-offset-sasp-bg' : '',
                      onSelect ? 'cursor-pointer hover:ring-1 hover:ring-sasp-tan' : '',
                    ].join(' ');
                    const inner = (
                      <>
                        <span className="font-mono text-[10px] shrink-0 w-3 uppercase text-sasp-ink-dim">
                          {SOURCE_ABBR[it.source]}
                        </span>
                        <span className="flex-1 min-w-0 truncate">{it.label}</span>
                        {done && (
                          <span aria-hidden className="text-xs">
                            ✓
                          </span>
                        )}
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
                            title={it.label}
                            aria-current={isCurrent ? 'true' : undefined}
                            onClick={() => onSelect(it.id)}
                            className={cls}
                          >
                            {inner}
                          </button>
                        ) : (
                          <div
                            data-testid={`chip-${it.id}`}
                            data-score={score}
                            data-done={done}
                            title={it.label}
                            aria-current={isCurrent ? 'true' : undefined}
                            className={cls}
                          >
                            {inner}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function ProgressHeader({ pct, isComplete }: { pct: number; isComplete: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs uppercase tracking-wider text-sasp-ink-dim">
        <span>Splněno</span>
        <span data-testid="law-progress-percent" className="text-sasp-ink">
          {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sasp-navy">
        <div
          data-testid="law-progress-bar"
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
