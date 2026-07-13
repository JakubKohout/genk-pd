import { useState } from 'react';
import type { ProgressEntry, LawThemeFilter, LawThemeKey } from '@/shared/storage';
import { LawSidePanel, type LawPanelItem } from './LawSidePanel';

interface Props {
  items: readonly LawPanelItem[];
  progress: Record<string, ProgressEntry>;
  themeFilter: LawThemeFilter;
  onSetTheme: (key: LawThemeKey, enabled: boolean) => void;
  currentId?: string;
  onSelect?: (id: string) => void;
}

export function LawMobilePanel({
  items,
  progress,
  themeFilter,
  onSetTheme,
  currentId,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const handleSelect = onSelect
    ? (id: string) => {
        setOpen(false);
        onSelect(id);
      }
    : undefined;
  const filtered = items.filter((it) => themeFilter[it.theme]);
  const total = filtered.length;
  const clampedSum = filtered.reduce(
    (sum, it) => sum + Math.min(2, Math.max(0, progress[it.id]?.score ?? 0)),
    0,
  );
  const pct = total === 0 ? 0 : Math.round((clampedSum / (2 * total)) * 100);

  return (
    <details open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="card cursor-pointer list-none p-3 text-sm font-medium text-sasp-tan">
        <span className="flex items-center justify-between gap-2">
          <span>
            Přehled zákonů
            <span
              data-testid="law-mobile-progress-percent"
              className="ml-2 text-sasp-ink-dim"
            >
              — {pct}% splněno
            </span>
          </span>
          <span aria-hidden className="text-xs">{open ? '▲' : '▼'}</span>
        </span>
      </summary>
      <div className="mt-2">
        <LawSidePanel
          items={items}
          progress={progress}
          themeFilter={themeFilter}
          onSetTheme={onSetTheme}
          currentId={currentId}
          onSelect={handleSelect}
        />
      </div>
    </details>
  );
}
