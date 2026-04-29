import { NavLink, Outlet } from 'react-router-dom';
import { BadgeIcon } from '@/shared/ui/BadgeIcon';

const navItems = [
  { to: '/codes', label: 'Desítkové kódy', enabled: true },
  { to: '/laws', label: 'Zákony', enabled: false },
  { to: '/sasp', label: 'SASP příručka', enabled: false },
];

export function AppLayout() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-sasp-navy-light bg-sasp-bg/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/" className="flex items-center gap-3">
            <BadgeIcon className="h-9 w-9" />
            <div className="leading-tight">
              <div className="font-serif text-lg text-sasp-tan">San Andreas State Police</div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-sasp-ink-dim">
                Police Academy
              </div>
            </div>
          </NavLink>

          <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
            {navItems.map((item) =>
              item.enabled ? (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'rounded px-3 py-1.5 text-sm font-medium transition',
                      isActive
                        ? 'bg-sasp-tan text-sasp-bg'
                        : 'text-sasp-ink hover:bg-sasp-navy-light',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ) : (
                <span
                  key={item.to}
                  aria-disabled="true"
                  title="Připravujeme"
                  className="rounded px-3 py-1.5 text-sm font-medium text-sasp-ink-dim/60 cursor-not-allowed"
                >
                  {item.label}
                </span>
              ),
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      <footer className="mt-auto border-t border-sasp-navy-light/60 px-4 py-3 text-center text-xs text-sasp-ink-dim sm:px-6">
        San Andreas State Police — Training tool · genk.cz
      </footer>
    </div>
  );
}
