import { useEffect, useState } from 'react';
import { matchChoice } from '../logic/matchChoice';
import type { LawChoice } from '../data/types';

interface Props {
  question: LawChoice;
  /** order[pozice] = index do question.options; submit vraci puvodni indexy */
  order: number[];
  onSubmit: (selected: number[], correct: boolean) => void;
}

export function ChoiceInput({ question, order, onSubmit }: Props) {
  const [selected, setSelected] = useState<number[]>([]);

  const toggle = (origIdx: number) =>
    setSelected((s) => (s.includes(origIdx) ? s.filter((i) => i !== origIdx) : [...s, origIdx]));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) return;
      const digit = parseInt(e.key, 10);
      if (isNaN(digit) || digit < 1 || digit > order.length) return;
      toggle(order[digit - 1]!);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [order]);

  const submit = () => {
    const ordered = [...selected].sort((a, b) => a - b);
    onSubmit(ordered, matchChoice(ordered, question.correctIndices));
  };

  return (
    <div className="space-y-3">
      <ul className="grid gap-2" data-testid="law-choice-options">
        {order.map((origIdx, pos) => {
          const isSel = selected.includes(origIdx);
          return (
            <li key={origIdx}>
              <button
                type="button"
                data-testid={`law-choice-option-${pos}`}
                data-selected={isSel}
                onClick={() => toggle(origIdx)}
                className={[
                  'flex w-full items-center gap-3 rounded border px-4 py-3 text-left transition',
                  isSel
                    ? 'border-sasp-tan bg-sasp-navy-light/50'
                    : 'border-sasp-navy-light bg-sasp-bg/40 hover:border-sasp-tan',
                ].join(' ')}
              >
                <kbd className="rounded border border-sasp-navy-light bg-sasp-bg px-1.5 py-0.5 font-mono text-xs text-sasp-ink-dim">
                  {pos + 1}
                </kbd>
                <span>{question.options[origIdx]}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-sasp-ink-dim">Vyber všechny správné odpovědi.</p>
      <button
        type="button"
        className="btn-primary"
        data-testid="law-choice-submit"
        disabled={selected.length === 0}
        onClick={submit}
      >
        Vyhodnotit
      </button>
    </div>
  );
}
