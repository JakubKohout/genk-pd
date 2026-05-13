import { useState } from 'react';
import { DragDropTab } from './calibrate/DragDropTab';
import { AnchorImportTab } from './calibrate/AnchorImportTab';
import { AddPoiTab } from './calibrate/AddPoiTab';

type CalibTab = 'drag' | 'anchor' | 'add';

const TABS: { key: CalibTab; label: string }[] = [
  { key: 'drag', label: 'Drag & drop' },
  { key: 'anchor', label: 'Anchor & import (MG)' },
  { key: 'add', label: 'Přidat POI' },
];

export function GeoCalibratePage() {
  const [tab, setTab] = useState<CalibTab>('drag');

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl text-sasp-tan">Editor POI</h1>
        <p className="text-sm text-sasp-ink-dim">
          3 nástroje pro správu geografického datasetu. Drag & drop ladí existující
          POI, Anchor & import bulk-importuje z Map Genie po affine kalibraci,
          Přidat POI vytváří úplně nové (typicky ulice, towns, MANUAL položky).
        </p>
      </header>

      <nav
        className="inline-flex rounded border border-sasp-navy-light overflow-hidden"
        aria-label="Editor mode"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            data-testid={`geo-calibrate-tab-${t.key}`}
            className={[
              'px-3 py-1.5 text-sm transition',
              tab === t.key
                ? 'bg-sasp-tan text-sasp-bg'
                : 'bg-transparent text-sasp-ink-dim hover:text-sasp-ink',
            ].join(' ')}
            aria-pressed={tab === t.key}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'drag' && <DragDropTab />}
      {tab === 'anchor' && <AnchorImportTab />}
      {tab === 'add' && <AddPoiTab />}
    </section>
  );
}
