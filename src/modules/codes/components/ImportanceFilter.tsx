import { useSettings } from '../state/useSettings';
import { IMPORTANCE_LABELS, type Importance } from '../data/codes';
import { trackEvent } from '@/shared/analytics';

const ORDER: Importance[] = ['mandatory', 'rare', 'unnecessary'];

export function ImportanceFilter() {
  const { importanceFilter, setImportance } = useSettings();
  return (
    <fieldset
      className="card flex flex-wrap items-center gap-4 p-4"
      data-testid="importance-filter"
    >
      <legend className="px-2 text-xs uppercase tracking-[0.2em] text-sasp-ink-dim">
        Filtr důležitosti
      </legend>
      {ORDER.map((imp) => (
        <label
          key={imp}
          className="flex cursor-pointer items-center gap-2 text-sm text-sasp-ink"
        >
          <input
            type="checkbox"
            data-testid={`filter-${imp}`}
            checked={importanceFilter[imp]}
            onChange={(e) => {
              setImportance(imp, e.target.checked);
              trackEvent(`filter-${imp}-${e.target.checked ? 'on' : 'off'}`);
            }}
            className="h-4 w-4 accent-sasp-tan"
          />
          {IMPORTANCE_LABELS[imp]}
        </label>
      ))}
    </fieldset>
  );
}
