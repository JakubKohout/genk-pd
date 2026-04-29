import { Link } from 'react-router-dom';

const modules = [
  {
    to: '/codes',
    title: 'Desítkové kódy',
    description: 'Trénink rádiových kódů 10-X ve dvou režimech: psaní kódu a výběr významu.',
    enabled: true,
  },
  {
    to: '/laws',
    title: 'Zákony',
    description: 'Penal Code, Law Enforcement Act, Firearm Act — vědomostní testy nad zákony.',
    enabled: false,
  },
  {
    to: '/sasp',
    title: 'SASP příručka',
    description: 'Otázky nad provozní příručkou SASP — postupy, role, situace.',
    enabled: false,
  },
];

export function HomePage() {
  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-4xl text-sasp-tan sm:text-5xl">Tréninkové centrum</h1>
        <p className="max-w-2xl text-sasp-ink-dim">
          Edukativní nástroj pro členy PD. Vyber modul a začni trénovat. Tvůj progres se ukládá
          lokálně v prohlížeči.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) =>
          m.enabled ? (
            <Link
              key={m.to}
              to={m.to}
              className="card group p-6 transition hover:border-sasp-tan"
            >
              <h2 className="mb-2 text-2xl text-sasp-tan group-hover:text-sasp-gold">{m.title}</h2>
              <p className="text-sm text-sasp-ink-dim">{m.description}</p>
              <span className="mt-4 inline-block text-xs font-semibold uppercase tracking-wider text-sasp-tan">
                Otevřít →
              </span>
            </Link>
          ) : (
            <div
              key={m.to}
              className="card p-6 opacity-60"
              aria-disabled="true"
              title="Připravujeme"
            >
              <h2 className="mb-2 text-2xl text-sasp-ink-dim">{m.title}</h2>
              <p className="text-sm text-sasp-ink-dim">{m.description}</p>
              <span className="mt-4 inline-block text-xs font-semibold uppercase tracking-wider text-sasp-ink-dim">
                Připravujeme
              </span>
            </div>
          ),
        )}
      </div>
    </section>
  );
}
