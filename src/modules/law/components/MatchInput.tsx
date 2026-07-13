import { useMemo, useState } from 'react';
import { checkMatch } from '../logic/checkMatch';
import type { LawMatch } from '../data/types';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Props {
  question: LawMatch;
  onSubmit: (assignments: Record<string, string>, correct: boolean) => void;
}

export function MatchInput({ question, onSubmit }: Props) {
  const rights = useMemo(
    () => shuffle(question.pairs.map((p) => p.right), mulberry32(hash(question.id))),
    [question.id, question.pairs],
  );
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const assignedRights = new Set(Object.values(assignments));

  const clickLeft = (left: string) => {
    if (assignments[left]) {
      const next = { ...assignments };
      delete next[left];
      setAssignments(next);
      setSelectedLeft(left);
      return;
    }
    setSelectedLeft(left);
  };

  const clickRight = (right: string) => {
    if (!selectedLeft) return;
    setAssignments((a) => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(a)) if (v !== right) next[k] = v;
      next[selectedLeft] = right;
      return next;
    });
    setSelectedLeft(null);
  };

  const allAssigned = question.pairs.every((p) => assignments[p.left]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4" data-testid="law-match">
        <ul className="space-y-2">
          {question.pairs.map((p) => (
            <li key={p.left}>
              <button
                type="button"
                data-testid={`law-match-left-${p.left}`}
                data-selected={selectedLeft === p.left}
                data-assigned={!!assignments[p.left]}
                onClick={() => clickLeft(p.left)}
                className={[
                  'flex w-full items-center justify-between gap-2 rounded border px-3 py-2 text-left transition',
                  selectedLeft === p.left ? 'border-sasp-tan bg-sasp-navy-light/50' : 'border-sasp-navy-light',
                ].join(' ')}
              >
                <span>{p.left}</span>
                {assignments[p.left] && <span className="text-xs text-sasp-tan">→ {assignments[p.left]}</span>}
              </button>
            </li>
          ))}
        </ul>
        <ul className="space-y-2">
          {rights.map((right) => (
            <li key={right}>
              <button
                type="button"
                data-testid={`law-match-right-${right}`}
                disabled={assignedRights.has(right)}
                onClick={() => clickRight(right)}
                className={[
                  'w-full rounded border px-3 py-2 text-left transition',
                  assignedRights.has(right)
                    ? 'border-sasp-navy-light opacity-40'
                    : 'border-sasp-navy-light hover:border-sasp-tan',
                ].join(' ')}
              >
                {right}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        className="btn-primary"
        data-testid="law-match-submit"
        disabled={!allAssigned}
        onClick={() => onSubmit(assignments, checkMatch(question, assignments))}
      >
        Vyhodnotit
      </button>
    </div>
  );
}
