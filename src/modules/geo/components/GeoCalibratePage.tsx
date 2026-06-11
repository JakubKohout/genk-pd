import { useState } from 'react';
import { DragDropTab } from './calibrate/DragDropTab';
import { AnchorImportTab } from './calibrate/AnchorImportTab';
import { AddPoiTab } from './calibrate/AddPoiTab';
import { StreetAnchorsTab } from './calibrate/StreetAnchorsTab';

type CalibTab = 'drag' | 'anchor' | 'add' | 'streets';

const TABS: { key: CalibTab; label: string }[] = [
  { key: 'drag', label: 'Drag & drop' },
  { key: 'streets', label: 'Kalibrace ulic' },
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
          4 nástroje pro správu geografického datasetu. Drag & drop ladí
          existující POI, Kalibrace ulic přemapuje Foxxite anchory → silnice se
          přegenerují živě, Anchor & import bulk-importuje z Map Genie po affine
          kalibraci, Přidat POI vytváří úplně nové (typicky towns, MANUAL položky).
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
      {tab === 'streets' && <StreetAnchorsTab />}
      {tab === 'anchor' && <AnchorImportTab />}
      {tab === 'add' && <AddPoiTab />}
    </section>
  );
}
