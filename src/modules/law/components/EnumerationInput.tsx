import { useEffect, useRef, useState } from 'react';
import type { LawEnumeration } from '../data/types';
import { matchEnumerationEntry, matchOrdered } from '../logic/matchEnumeration';
import { suggestEnumeration } from '../logic/suggest';
import { AnswerList, type AnswerEntry } from './AnswerList';
import { PENAL_PARAGRAPHS } from '../data/paragraphs';
import { suggestParagraphs } from '../logic/suggestParagraph';
import { lookupParagraph } from '../logic/lookupParagraph';

interface Props {
  question: LawEnumeration;
  onSubmit: (result: { perfect: boolean }) => void;
}

interface CommittedEntry {
  key: string;
  raw: string;
  matchedKey: string | null;
  duplicate: boolean;
}

// ─── Stacked entry input (alias + paragraph) ──────────────────────────────

function StackedInput({
  question,
  onSubmit,
}: {
  question: LawEnumeration;
  onSubmit: (result: { perfect: boolean }) => void;
}) {
  const [value, setValue] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [entries, setEntries] = useState<CommittedEntry[]>([]);
  const [phase, setPhase] = useState<'answering' | 'revealed'>('answering');
  const inputRef = useRef<HTMLInputElement>(null);
  const isOrdered = question.ordered === true;

  useEffect(() => {
    if (phase === 'answering') inputRef.current?.focus();
  }, [phase]);

  const foundKeys = new Set(
    entries.filter((e) => e.matchedKey !== null && !e.duplicate).map((e) => e.matchedKey as string),
  );

  const getSuggestions = () => {
    if (!suggestionsOpen || phase === 'revealed') return [];
    if (question.matcher === 'paragraph') {
      return suggestParagraphs(value, PENAL_PARAGRAPHS, foundKeys);
    }
    return suggestEnumeration(question, value, foundKeys);
  };

  const suggestions = getSuggestions();

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const matchedKey = matchEnumerationEntry(question, trimmed);
    const duplicate = matchedKey !== null && foundKeys.has(matchedKey);
    setEntries((prev) => [
      ...prev,
      { key: `${prev.length}-${Date.now()}`, raw: trimmed, matchedKey, duplicate },
    ]);
    setValue('');
    setHighlight(0);
    setSuggestionsOpen(true);
  };

  const fillFromHighlight = (): boolean => {
    if (suggestions.length === 0) return false;
    const picked = suggestions[highlight];
    if (!picked) return false;
    // Both EnumSuggestion and ParagraphSuggestion have a label/display property
    const displayValue = 'label' in picked ? picked.label : picked.display;
    setValue(displayValue);
    setSuggestionsOpen(false);
    return true;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (matchEnumerationEntry(question, value.trim()) !== null) {
        commit(value);
        return;
      }
      if (suggestionsOpen && suggestions.length > 0) {
        const filled = fillFromHighlight();
        if (filled) return;
      }
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

  const handleRemove = (key: string) => {
    setEntries((prev) => prev.filter((e) => e.key !== key));
  };

  const handleSubmit = () => {
    const wrongCount = entries.filter((e) => e.matchedKey === null).length;
    const dupCount = entries.filter((e) => e.duplicate).length;
    const correctCount = entries.filter((e) => e.matchedKey !== null && !e.duplicate).length;
    const perfect = isOrdered
      ? matchOrdered(question, entries.map((e) => e.matchedKey))
      : wrongCount === 0 && dupCount === 0 && correctCount === question.expected.length;
    setPhase('revealed');
    onSubmit({ perfect });
  };

  // Build AnswerEntry list for AnswerList
  const answerEntries: AnswerEntry[] = entries.map((e, idx) => {
    if (isOrdered) {
      if (phase === 'answering') return { key: e.key, status: 'pending', text: e.raw };
      const expectedAt = question.expected[idx];
      if (expectedAt !== undefined && e.matchedKey === expectedAt.key) {
        return { key: e.key, status: 'correct', text: expectedAt.label };
      }
      return {
        key: e.key,
        status: 'wrong',
        text: e.raw,
        meta: expectedAt ? `správně: ${expectedAt.label}` : 'navíc',
      };
    }
    if (e.matchedKey === null) {
      if (question.matcher === 'paragraph') {
        const lookedUp = lookupParagraph(e.raw, PENAL_PARAGRAPHS);
        if (lookedUp.kind === 'valid') {
          return { key: e.key, status: 'wrong', text: lookedUp.display, meta: 'nevztahuje se' };
        }
        if (lookedUp.kind === 'unknown') {
          return { key: e.key, status: 'wrong', text: e.raw, meta: 'neexistující paragraf' };
        }
      }
      return { key: e.key, status: 'wrong', text: e.raw, meta: 'žádná shoda' };
    }
    const expected = question.expected.find((ex) => ex.key === e.matchedKey)!;
    if (e.duplicate) {
      return { key: e.key, status: 'duplicate', text: expected.label, meta: 'duplikát' };
    }
    return { key: e.key, status: 'correct', text: expected.label };
  });

  if (phase === 'revealed') {
    if (isOrdered) {
      for (let i = entries.length; i < question.expected.length; i++) {
        const ex = question.expected[i]!;
        answerEntries.push({ key: `missed-${ex.key}`, status: 'missed', text: ex.label });
      }
    } else {
      for (const ex of question.expected) {
        if (!foundKeys.has(ex.key)) {
          answerEntries.push({
            key: `missed-${ex.key}`,
            status: 'missed',
            text: ex.label,
          });
        }
      }
    }
  }

  const hasMissed = answerEntries.some((e) => e.status === 'missed');
  const canCommitInput = value.trim().length > 0 && phase === 'answering';

  return (
    <div className="answer-input">
      <div className="answer-input__row">
        <input
          ref={inputRef}
          type="text"
          className="answer-input__field"
          placeholder="Napiš odpověď…"
          value={value}
          disabled={phase === 'revealed'}
          onChange={(e) => {
            setValue(e.target.value);
            setHighlight(0);
            setSuggestionsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          data-testid="law-enum-input"
        />
        <button
          type="button"
          className="btn-secondary shrink-0"
          onClick={() => {
            commit(value);
            inputRef.current?.focus();
          }}
          disabled={!canCommitInput}
          data-testid="law-enum-add"
        >
          Přidat
        </button>
        {suggestions.length > 0 && phase === 'answering' && (
          <ul className="autocomplete-list" data-testid="law-enum-autocomplete">
            {suggestions.map((s, idx) => {
              const displayValue = 'label' in s ? s.label : s.display;
              const key = 'label' in s ? s.key : s.canonicalId;
              return (
                <li
                  key={key}
                  className={`autocomplete-suggestion ${idx === highlight ? 'autocomplete-suggestion--active' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setValue(displayValue);
                    setSuggestionsOpen(false);
                    inputRef.current?.focus();
                  }}
                >
                  <span className="autocomplete-quote">{displayValue}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {answerEntries.length > 0 && (
        <AnswerList
          entries={answerEntries}
          onRemove={phase === 'answering' ? handleRemove : undefined}
          showMissedHeading={phase === 'revealed' && hasMissed}
        />
      )}
      {phase === 'answering' && (
        <div className="submit-footer submit-footer--end">
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            data-testid="law-enum-submit"
          >
            Vyhodnotit otázku
          </button>
        </div>
      )}
      {(() => {
        const hint =
          question.matcher === 'paragraph'
            ? 'Zadávej paragrafy ve formátu §25b — na písmenu subu záleží. Uveď všechny, které se na situaci vztahují. Enter potvrdí položku, Vyhodnotit otázku uzavře odpověď.'
            : isOrdered
              ? 'Zadávej položky postupně ve správném pořadí — každou potvrď Enterem. Po dokončení klikni Vyhodnotit otázku.'
              : 'Piš vlastními slovy — každou položku potvrď Enterem. Po vyjmenování všeho klikni Vyhodnotit otázku.';
        return (
          <p className="answer-input__hint" data-testid="law-enum-hint">
            {hint}
          </p>
        );
      })()}
    </div>
  );
}

// ─── Public component ──────────────────────────────────────────────────────

export function EnumerationInput({ question, onSubmit }: Props) {
  return <StackedInput question={question} onSubmit={onSubmit} />;
}
