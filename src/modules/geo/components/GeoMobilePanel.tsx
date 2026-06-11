import { useState } from 'react';
import type { POI, POICategory } from '../data/types';
import type { GeoCategoryFilter, ProgressEntry } from '@/shared/storage';
import { GeoSidePanel } from './GeoSidePanel';

interface Props {
  mode: 'blind' | 'name';
  pois: readonly POI[];
  progress: Record<string, ProgressEntry>;
  filter: GeoCategoryFilter;
  onSetCategory: (category: POICategory, enabled: boolean) => void;
  currentId?: string;
}

export function GeoMobilePanel(props: Props) {
  const [open, setOpen] = useState(false);
  const filtered = props.pois.filter((p) => props.filter[p.category]);
  const total = filtered.length;
  const clampedSum = filtered.reduce(
    (sum, p) => sum + Math.min(2, Math.max(0, props.progress[p.id]?.score ?? 0)),
    0,
  );
  const pct = total === 0 ? 0 : Math.round((clampedSum / (2 * total)) * 100);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="card cursor-pointer list-none p-3 text-sm font-medium text-sasp-tan">
        <span className="flex items-center justify-between gap-2">
          <span>
            Přehled geografie
            <span
              data-testid={`geo-${props.mode}-mobile-progress-percent`}
              className="ml-2 text-sasp-ink-dim"
            >
              — {pct}% splněno
            </span>
          </span>
          <span aria-hidden className="text-xs">
            {open ? '▲' : '▼'}
          </span>
        </span>
      </summary>
      <div className="mt-2">
        <GeoSidePanel {...props} />
      </div>
    </details>
  );
}
