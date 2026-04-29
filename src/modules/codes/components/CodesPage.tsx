import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { SidePanel } from './SidePanel';
import { ImportanceFilter } from './ImportanceFilter';
import { ResetButton } from './ResetButton';
import { useMediaQuery } from '@/shared/useMediaQuery';
import { CODES } from '../data/codes';
import { useCodeProgress } from '../state/useCodeProgress';
import { useSettings } from '../state/useSettings';

const tabs = [
  { to: 'write', label: 'Psaní kódu' },
  { to: 'choose', label: 'Výběr významu' },
];

export function CodesPage() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <section className="space-y-4">
      <header className="space-y-3">
        <div>
          <h1 className="text-3xl text-sasp-tan">Desítkové kódy</h1>
          <p className="text-sm text-sasp-ink-dim">
            Trénink rádiových kódů 10-X. Tvůj progres se ukládá lokálně.
          </p>
        </div>

        <nav className="flex flex-wrap gap-1" data-testid="mode-tabs">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              data-testid={`tab-${tab.to}`}
              className={({ isActive }) =>
                [
                  'rounded-md px-4 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-sasp-tan text-sasp-bg'
                    : 'border border-sasp-navy-light text-sasp-ink hover:bg-sasp-navy-light',
                ].join(' ')
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Outlet />
          <ImportanceFilter />
          <div className="flex justify-end">
            <ResetButton />
          </div>
        </div>

        {isDesktop ? <SidePanel /> : <MobilePanel />}
      </div>
    </section>
  );
}

function MobilePanel() {
  const [open, setOpen] = useState(false);
  const { progress } = useCodeProgress();
  const { importanceFilter } = useSettings();

  const filtered = CODES.filter((c) => importanceFilter[c.importance]);
  const maxScore = filtered.length * 3;
  const earned = filtered.reduce(
    (sum, c) => sum + Math.max(0, progress[c.id]?.score ?? 0),
    0,
  );
  const pct = maxScore === 0 ? 0 : Math.round((earned / maxScore) * 100);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="card cursor-pointer list-none p-3 text-sm font-medium text-sasp-tan">
        <span className="flex items-center justify-between gap-2">
          <span>
            Přehled kódů
            <span data-testid="mobile-progress-percent" className="ml-2 text-sasp-ink-dim">
              — {pct}% splněno
            </span>
          </span>
          <span aria-hidden className="text-xs">{open ? '▲' : '▼'}</span>
        </span>
      </summary>
      <div className="mt-2">
        <SidePanel />
      </div>
    </details>
  );
}
