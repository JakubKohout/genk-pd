import { useMemo, useState } from 'react';
import { parseCitizens, buildSearchUrl, type MdtCitizen } from './parseCitizens';

export function MdtCitizensPage() {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('');
  const [submitted, setSubmitted] = useState<{ source: string; query: string } | null>(null);

  const searchUrl = useMemo(() => buildSearchUrl(query), [query]);

  const citizens = useMemo<MdtCitizen[] | null>(() => {
    if (!submitted) return null;
    return parseCitizens(submitted.source);
  }, [submitted]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted({ source, query });
  }

  function handleReset() {
    setQuery('');
    setSource('');
    setSubmitted(null);
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl text-sasp-tan sm:text-4xl">MDT — registr občanů</h1>
        <p className="max-w-3xl text-sm text-sasp-ink-dim">
          Pomocný nástroj na vyhledávání v MDT. Zadej jméno, otevři <code className="text-sasp-tan">view-source</code>{' '}
          odkaz, zkopíruj <em>celý</em> zdrojový kód stránky a vlož ho do textového pole níže. Po
          vyhodnocení dostaneš přehlednou tabulku s odkazy na detail.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <div className="space-y-2">
          <label htmlFor="mdt-query" className="block text-sm font-medium text-sasp-ink">
            1. Jméno hledaného občana
          </label>
          <input
            id="mdt-query"
            data-testid="mdt-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="např. Woodward"
            className="w-full rounded-md border border-sasp-navy-light bg-sasp-bg/60 px-3 py-2 text-sasp-ink placeholder:text-sasp-ink-dim focus:border-sasp-tan focus:outline-none"
            autoComplete="off"
          />
          {searchUrl ? (
            <div className="text-sm text-sasp-ink-dim">
              <span className="block sm:inline">2. Otevři tento odkaz v novém tabu:</span>{' '}
              <a
                href={searchUrl}
                target="_blank"
                rel="noreferrer"
                data-testid="mdt-source-link"
                className="break-all text-sasp-tan hover:text-sasp-gold underline"
              >
                {searchUrl}
              </a>
              <p className="mt-1 text-xs text-sasp-ink-dim">
                Některé prohlížeče <code>view-source:</code> blokují přes <code>target=&quot;_blank&quot;</code> —
                pokud nereaguje, zkopíruj URL ručně do nového tabu.
              </p>
            </div>
          ) : (
            <p className="text-sm text-sasp-ink-dim">
              2. Po zadání jména se zde objeví <code>view-source</code> URL.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="mdt-source" className="block text-sm font-medium text-sasp-ink">
            3. Vlož zdrojový kód stránky (Ctrl+A → Ctrl+C → sem)
          </label>
          <textarea
            id="mdt-source"
            data-testid="mdt-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            rows={8}
            placeholder="<!DOCTYPE html>..."
            className="w-full rounded-md border border-sasp-navy-light bg-sasp-bg/60 px-3 py-2 font-mono text-xs text-sasp-ink placeholder:text-sasp-ink-dim focus:border-sasp-tan focus:outline-none"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            data-testid="mdt-submit"
            disabled={!source.trim()}
            className="btn-primary"
          >
            Vyhodnotit
          </button>
          <button
            type="button"
            data-testid="mdt-reset"
            onClick={handleReset}
            className="btn-secondary"
          >
            Vyčistit
          </button>
        </div>
      </form>

      {citizens && <ResultsTable citizens={citizens} />}
    </section>
  );
}

function ResultsTable({ citizens }: { citizens: MdtCitizen[] }) {
  if (citizens.length === 0) {
    return (
      <div
        data-testid="mdt-empty"
        className="card p-6 text-center text-sm text-sasp-ink-dim"
      >
        Ve vloženém zdrojovém kódu nebyli nalezeni žádní občané. Zkontroluj, že jsi zkopíroval
        celou stránku <code>view-source</code> až po <code>&lt;/html&gt;</code>.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden" data-testid="mdt-results">
      <div className="border-b border-sasp-navy-light px-6 py-3 text-xs uppercase tracking-wider text-sasp-ink-dim">
        Nalezeno {citizens.length}{' '}
        {citizens.length === 1 ? 'občan' : citizens.length < 5 ? 'občané' : 'občanů'}
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-sasp-navy-light/40 text-xs uppercase tracking-wider text-sasp-ink-dim">
          <tr>
            <th className="px-6 py-3">Křestní jméno</th>
            <th className="px-6 py-3">Příjmení</th>
            <th className="px-6 py-3">Datum narození</th>
            <th className="px-6 py-3 text-right">Detail v MDT</th>
          </tr>
        </thead>
        <tbody>
          {citizens.map((c) => (
            <tr
              key={c.id}
              data-testid={`mdt-row-${c.id}`}
              className="border-t border-sasp-navy-light/60 hover:bg-sasp-navy-light/20"
            >
              <td className="px-6 py-3 text-sasp-ink">{c.firstName}</td>
              <td className="px-6 py-3 text-sasp-ink">{c.lastName}</td>
              <td className="px-6 py-3 text-sasp-ink-dim">{c.dateOfBirth || '—'}</td>
              <td className="px-6 py-3 text-right">
                <a
                  href={c.detailUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sasp-tan hover:text-sasp-gold underline"
                >
                  Otevřít →
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
