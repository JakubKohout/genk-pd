import { useEffect, useRef, useState } from 'react';
import type { POI } from '../data/types';
import { matchPoi } from '../logic/match';
import { suggestPois } from '../logic/suggest';

interface Props {
  /** Pool to suggest from. Match is checked against `target` only. */
  pool: readonly POI[];
  target: POI;
  disabled: boolean;
  disableSuggestions?: boolean;
  onSubmit: (raw: string, matched: POI | null) => void;
}

export function GeoAnswerInput({
  pool,
  target,
  disabled,
  disableSuggestions,
  onSubmit,
}: Props) {
  const [value, setValue] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [open, setOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const suggestions = !disableSuggestions && open ? suggestPois(value, pool) : [];

  const submit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const matched = matchPoi(trimmed, [target]);
    onSubmit(trimmed, matched);
    setValue('');
    setHighlight(0);
    setOpen(true);
  };

  const fillFromHighlight = () => {
    const picked = suggestions[highlight];
    if (!picked) return false;
    setValue(picked.name);
    setOpen(false);
    return true;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const directHit = matchPoi(value, pool);
      if (!directHit && open && suggestions.length > 0) {
        fillFromHighlight();
        return;
      }
      submit(value);
      return;
    }
    if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault();
      fillFromHighlight();
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
      return;
    }
    if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
      return;
    }
  };

  const canCommit = !disabled && value.trim().length > 0;

  return (
    <div className="answer-input">
      <div className="answer-input__row">
        <input
          ref={inputRef}
          type="text"
          className="answer-input__field"
          placeholder="Co je tady?"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            setValue(e.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          data-testid="geo-answer-input"
        />
        <button
          type="button"
          className="btn-primary shrink-0"
          onClick={() => submit(value)}
          disabled={!canCommit}
          data-testid="geo-answer-submit"
        >
          Vyhodnotit
        </button>
        {suggestions.length > 0 && (
          <ul className="autocomplete-list" data-testid="geo-autocomplete-list">
            {suggestions.map((s, idx) => (
              <li
                key={s.id}
                className={`autocomplete-suggestion ${idx === highlight ? 'autocomplete-suggestion--active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setValue(s.name);
                  setOpen(false);
                  inputRef.current?.focus();
                }}
              >
                <span className="autocomplete-quote">{s.name}</span>
                <span className="autocomplete-ref">{s.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="answer-input__hint">
        Napiš název. Enter nebo Vyhodnotit potvrzuje. ↑↓ vybírá nápovědu.
      </p>
    </div>
  );
}
