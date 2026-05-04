import { useEffect, useRef, useState } from 'react';
import type { AnswerItem } from '../data/types';
import { matchAnswer } from '../logic/match';
import { suggestItems } from '../logic/suggest';

interface Props {
  items: readonly AnswerItem[];
  foundIds: ReadonlySet<string>;
  disabled: boolean;
  onCommit: (value: string) => void;
}

export function AnswerInput({ items, foundIds, disabled, onCommit }: Props) {
  const [value, setValue] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const suggestions = suggestionsOpen ? suggestItems(value, items, foundIds) : [];

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    onCommit(trimmed);
    setValue('');
    setHighlight(0);
    setSuggestionsOpen(true);
  };

  const fillFromHighlight = () => {
    const picked = suggestions[highlight];
    if (!picked) return false;
    setValue(picked.quote);
    setSuggestionsOpen(false);
    return true;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const directHit = matchAnswer(value, items);
      if (!directHit && suggestionsOpen && suggestions.length > 0) {
        fillFromHighlight();
        return;
      }
      commit(value);
      return;
    }
    if (e.key === ',') {
      e.preventDefault();
      commit(value);
      return;
    }
    if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault();
      fillFromHighlight();
      return;
    }
    if (e.key === 'Escape') {
      setSuggestionsOpen(false);
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
          placeholder="Napiš odpověď…"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            setValue(e.target.value);
            setHighlight(0);
            setSuggestionsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          data-testid="answer-input"
        />
        <button
          type="button"
          className="btn-secondary shrink-0"
          onClick={() => {
            commit(value);
            inputRef.current?.focus();
          }}
          disabled={!canCommit}
          data-testid="answer-add"
        >
          Přidat
        </button>
        {suggestions.length > 0 && (
          <ul className="autocomplete-list" data-testid="autocomplete-list">
            {suggestions.map((s, idx) => (
              <li
                key={s.id}
                className={`autocomplete-suggestion ${idx === highlight ? 'autocomplete-suggestion--active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setValue(s.quote);
                  setSuggestionsOpen(false);
                  inputRef.current?.focus();
                }}
              >
                <span className="autocomplete-quote">{s.quote}</span>
                <span className="autocomplete-ref">{s.ref}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="answer-input__hint">
        Napiš jednu položku, stiskni Enter nebo Přidat. Po dokončení klikni
        Vyhodnotit otázku.
      </p>
    </div>
  );
}
