import { Link } from 'react-router-dom';

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <h1 className="mb-2 text-3xl text-sasp-tan">{title}</h1>
      <p className="mb-6 text-sasp-ink-dim">Tento modul je v přípravě.</p>
      <Link to="/" className="btn-secondary">
        Zpět na rozcestník
      </Link>
    </div>
  );
}
