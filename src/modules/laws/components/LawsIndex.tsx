import { Link } from 'react-router-dom';

export function LawsIndex() {
  return (
    <div className="laws-index card p-6 sm:p-8">
      <h1>Zákony</h1>
      <ul className="laws-list">
        <li>
          <Link to="/laws/lea" className="btn-primary">
            Law Enforcement Act (006-19)
          </Link>
        </li>
        <li>
          <span className="btn-secondary disabled" aria-disabled="true">
            Penal Code (připravujeme)
          </span>
        </li>
        <li>
          <span className="btn-secondary disabled" aria-disabled="true">
            Firearm Act (připravujeme)
          </span>
        </li>
      </ul>
    </div>
  );
}
