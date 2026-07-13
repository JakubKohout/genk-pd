import { useEffect, useRef, useState } from 'react';
import type { LawText } from '../data/types';
import { matchText } from '../logic/matchText';
import { suggestText } from '../logic/suggest';

interface Props {
  question: LawText;
  hardMode: boolean;
  onSubmit: (raw: string, correct: boolean) => void;
}

export function TextInput({ question, hardMode, onSubmit }: Props) {
  const [value, setValue] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [open, setOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [question.id]);

  const suggestions = !hardMode && open ? suggestText(question, value) : [];

  const submit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const correct = matchText(question, trimmed);
    onSubmit(trimmed, correct);
    setValue('');
    setHighlight(0);
    setOpen(true);
  };

  const fillFromHighlight = () => {
    const picked = suggestions[highlight];
    if (!picked) return false;
    setValue(picked);
    setOpen(false);
    return true;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const directHit = matchText(question, value);
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

  const canCommit = value.trim().length > 0;

  return (
    <div className="answer-input">
      <div className="answer-input__row">
        <input
          ref={inputRef}
          type="text"
          className="answer-input__field"
          placeholder="Napiš odpověď…"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          data-testid="law-text-input"
        />
        <button
          type="button"
          className="btn-primary shrink-0"
          onClick={() => submit(value)}
          disabled={!canCommit}
          data-testid="law-text-submit"
        >
          Vyhodnotit
        </button>
        {suggestions.length > 0 && (
          <ul className="autocomplete-list" data-testid="law-text-autocomplete">
            {suggestions.map((s, idx) => (
              <li
                key={s}
                className={`autocomplete-suggestion ${idx === highlight ? 'autocomplete-suggestion--active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setValue(s);
                  setOpen(false);
                  inputRef.current?.focus();
                }}
              >
                <span className="autocomplete-quote">{s}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="answer-input__hint">
        Napiš odpověď. Enter nebo Vyhodnotit potvrzuje. ↑↓ vybírá nápovědu.
      </p>
    </div>
  );
}
