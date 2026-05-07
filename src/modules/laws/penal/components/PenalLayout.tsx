import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: 'scenarios', label: 'Scénky' },
  { to: 'recall', label: 'Recall' },
];

export function PenalLayout() {
  return (
    <section className="space-y-4">
      <header className="space-y-3">
        <div>
          <h1 className="text-3xl text-sasp-tan">Penal Code (002-19)</h1>
          <p className="text-sm text-sasp-ink-dim">
            Trénink Trestního zákoníku. Progres každého režimu se ukládá lokálně
            a má vlastní reset.
          </p>
        </div>

        <nav className="flex flex-wrap gap-1" data-testid="penal-mode-tabs">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              data-testid={`penal-tab-${tab.to}`}
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

      <Outlet />
    </section>
  );
}
