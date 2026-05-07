import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { canonicalAnswerId } from '../logic/canonicalAnswerId';
import {
  SUGGEST_MAX_RESULTS,
  type ParagraphSuggestion,
  suggestParagraphs,
} from '../logic/suggestParagraph';
import type { PenalParagraph } from '../data/types';

interface Props {
  paragraphs: readonly PenalParagraph[];
  excludeKeys: ReadonlySet<string>;
  disabled: boolean;
  /** When true, autocomplete is suppressed (hard mode). */
  disableSuggestions?: boolean;
  onCommit: (raw: string) => void;
}

export function PenalAnswerInput({
  paragraphs,
  excludeKeys,
  disabled,
  disableSuggestions = false,
  onCommit,
}: Props) {
  const [value, setValue] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [open, setOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const suggestions: ParagraphSuggestion[] = open && !disableSuggestions
    ? suggestParagraphs(value, paragraphs, excludeKeys)
    : [];

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    onCommit(trimmed);
    setValue('');
    setHighlight(0);
    setOpen(true);
  };

  const fillFromHighlight = () => {
    const picked = suggestions[highlight];
    if (!picked) return false;
    setValue(picked.canonicalId);
    setOpen(false);
    return true;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If current value already parses to a valid canonical ID, commit directly.
      const direct = canonicalAnswerId(value);
      if (!direct && open && suggestions.length > 0) {
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
          placeholder="Napiš paragraf, např. 25b nebo §27…"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            setValue(e.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          data-testid="penal-answer-input"
        />
        <button
          type="button"
          className="btn-secondary shrink-0"
          onClick={() => {
            commit(value);
            inputRef.current?.focus();
          }}
          disabled={!canCommit}
          data-testid="penal-answer-add"
        >
          Přidat
        </button>
        {suggestions.length > 0 && (
          <ul className="autocomplete-list" data-testid="penal-autocomplete-list">
            {suggestions.slice(0, SUGGEST_MAX_RESULTS).map((s, idx) => (
              <li
                key={`${s.paragraphId}-${s.subId ?? '_'}`}
                className={`autocomplete-suggestion ${idx === highlight ? 'autocomplete-suggestion--active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setValue(s.canonicalId);
                  setOpen(false);
                  inputRef.current?.focus();
                }}
              >
                <span className="autocomplete-quote">
                  {s.display} — {s.title}
                </span>
                <span className="autocomplete-ref">{s.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="answer-input__hint">
        Napiš ID paragrafu (např. <code>25b</code>) a stiskni Enter. Sub-paragraf
        je povinný, pokud paragraf má varianty (a/b/c/d).
      </p>
    </div>
  );
}
