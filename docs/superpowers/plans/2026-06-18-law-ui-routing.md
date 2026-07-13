# Law UI + Routing (Fáze 1b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Postavit uživatelské rozhraní sjednoceného modulu „Teorie" na route `/law` — jedna stránka `LawPage`, která dispatchuje render+matching dle `kind` (choice multi-select / text / enumeration / match) nad `LAW_QUESTIONS`, s dvouúrovňovým filtrem (zdroj+téma); přesměrovat staré routy; ponechat Penal recall samostatně na `/penal/recall`; aktualizovat rozcestník v menu (AppLayout) i na homepage.

**Architecture:** `LawPage` kopíruje strukturu `src/modules/sasp/components/SaspQuizPage.tsx` (useState `current`, picker v `useEffect`, phase answering/revealed, completion screen, desktop/mobile side panel), ale větví render přes `current.kind` a používá engine z Fáze 1a (`@/modules/law/...`). Vizuální primitivy se reusují: enumeration přes LEA `AnswerList`/`AnswerRow`, autocomplete a submit-footer přes existující `.autocomplete-*`/`.submit-footer*` CSS třídy. Nové interakce: multi-select `ChoiceInput` a klik-párovací `MatchInput`. Staré moduly se zatím NEMAŽ�ou (jen se přesměrují routy) — smazání je samostatná úklidová fáze.

**Tech Stack:** Vite + React 18 + TS, react-router-dom 6 (`createHashRouter`), Vitest + @testing-library/react, Playwright. `@/` → `src/`.

**Engine API (Fáze 1a, hotové):**
- `@/modules/law/data` → `LAW_QUESTIONS: readonly LawQuestion[]`
- `@/modules/law/data/types` → `LawQuestion` (`LawChoice|LawText|LawEnumeration|LawMatch`), `LawSource`, `LawTheme`, `LAW_SOURCES`, `LAW_THEMES`
- `@/modules/law/logic/matchChoice` → `matchChoice(selected:number[], correct:number[]):boolean`
- `@/modules/law/logic/checkMatch` → `checkMatch(q, assignments:Record<string,string>):boolean`
- `@/modules/law/logic/matchEnumeration` → `matchEnumerationEntry(q, raw):string|null`, `matchOrdered(q, lines:string[]):boolean`
- `@/modules/law/state/useLawProgress` → `{progress, turn, recordSubmit(id,{perfect}), recordSkip(id), reset()}`
- `@/modules/law/state/useLawSettings` → `{sourceFilter, themeFilter, setSource(key,v), setTheme(key,v)}`
- `@/modules/law/state/selection` → `pickNextQuestion(state, all, sourceFilter, themeFilter)`, `isLawComplete(...)`, `eligibleQuestions(...)`

**Carry-forward z review Fáze 1a:**
- LEA `description` se mapuje do `note` — v UI zobrazit jako pomocný popis (ne jako „Pozor" edukační box).
- `matchOrdered` bere pole řádků; UI musí vstup splitnout na `[\n,]+` (zachovat SASP comma-split chování).

---

### Task 1: Law text matching + suggestions logic

**Files:** Create `src/modules/law/logic/matchText.ts`, `src/modules/law/logic/suggest.ts`; Tests alongside.

Engine nemá matcher pro `kind:'text'` ani autocomplete. Doplň je.

- [ ] **Step 1: failing test** `src/modules/law/logic/matchText.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { matchText } from './matchText';
import type { LawText } from '../data/types';

const Q: LawText = {
  id: 't', source: 'sasp', theme: 'rto', prompt: 'p',
  kind: 'text', answer: 'Frekvence 1', aliases: ['f1', 'kanál 1'],
};

describe('matchText', () => {
  it('matches the answer after normalize (case/diacritics)', () => {
    expect(matchText(Q, 'frekvence 1')).toBe(true);
  });
  it('matches an alias', () => {
    expect(matchText(Q, 'F1')).toBe(true);
  });
  it('false on miss', () => {
    expect(matchText(Q, 'nesmysl')).toBe(false);
  });
  it('false for non-text kinds', () => {
    expect(matchText({ ...Q, kind: 'match' } as never, 'x')).toBe(false);
  });
});
```

- [ ] **Step 2:** `npx vitest run src/modules/law/logic/matchText.test.ts` — FAIL.

- [ ] **Step 3: implement** `src/modules/law/logic/matchText.ts`:
```ts
import { normalize } from '@/shared/text/normalize';
import type { LawQuestion } from '../data/types';

export function matchText(question: LawQuestion, raw: string): boolean {
  if (question.kind !== 'text') return false;
  const norm = normalize(raw);
  if (!norm) return false;
  if (normalize(question.answer) === norm) return true;
  return question.aliases.some((a) => normalize(a) === norm);
}
```

- [ ] **Step 4:** rerun — PASS.

- [ ] **Step 5: failing test** `src/modules/law/logic/suggest.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { suggestText, suggestEnumeration } from './suggest';
import type { LawText, LawEnumeration } from '../data/types';

const T: LawText = {
  id: 't', source: 'sasp', theme: 'rto', prompt: 'p',
  kind: 'text', answer: 'Frekvence 1', aliases: ['kanál 1'],
};
const E: LawEnumeration = {
  id: 'e', source: 'lea', theme: 'paragrafy', prompt: 'p',
  kind: 'enumeration', matcher: 'alias',
  expected: [
    { key: 'a', label: 'Maják', aliases: ['varovne svetlo'] },
    { key: 'b', label: 'Houkačka', aliases: [] },
  ],
};

describe('suggestText', () => {
  it('returns the answer when input is a substring (min 2 chars)', () => {
    expect(suggestText(T, 'frek')).toContain('Frekvence 1');
  });
  it('returns [] below min length', () => {
    expect(suggestText(T, 'f')).toEqual([]);
  });
});

describe('suggestEnumeration', () => {
  it('suggests expected labels by substring, excluding already-found keys', () => {
    const out = suggestEnumeration(E, 'ho', new Set());
    expect(out.map((s) => s.label)).toContain('Houkačka');
  });
  it('excludes keys already found', () => {
    const out = suggestEnumeration(E, 'ma', new Set(['a']));
    expect(out).toEqual([]);
  });
});
```

- [ ] **Step 6:** `npx vitest run src/modules/law/logic/suggest.test.ts` — FAIL.

- [ ] **Step 7: implement** `src/modules/law/logic/suggest.ts`:
```ts
import { normalize } from '@/shared/text/normalize';
import type { LawQuestion } from '../data/types';

const MIN = 2;
const MAX = 5;

export function suggestText(question: LawQuestion, raw: string): string[] {
  if (question.kind !== 'text') return [];
  const norm = normalize(raw);
  if (norm.length < MIN) return [];
  const candidates = [question.answer, ...question.aliases];
  return candidates.filter((c) => normalize(c).includes(norm)).slice(0, MAX);
}

export interface EnumSuggestion {
  key: string;
  label: string;
}

export function suggestEnumeration(
  question: LawQuestion,
  raw: string,
  excludeKeys: Set<string>,
): EnumSuggestion[] {
  if (question.kind !== 'enumeration') return [];
  const norm = normalize(raw);
  if (norm.length < MIN) return [];
  return question.expected
    .filter((e) => !excludeKeys.has(e.key))
    .filter((e) =>
      normalize(e.label).includes(norm) ||
      (e.aliases ?? []).some((a) => normalize(a).includes(norm)),
    )
    .map((e) => ({ key: e.key, label: e.label }))
    .slice(0, MAX);
}
```

For `matcher:'paragraph'` enumeration the UI will use Penal `suggestParagraphs` directly (see Task 5); `suggestEnumeration` covers `matcher:'alias'`.

- [ ] **Step 8:** rerun both suggest+matchText tests — PASS.

- [ ] **Step 9: commit:**
```bash
git add src/modules/law/logic/matchText.ts src/modules/law/logic/matchText.test.ts src/modules/law/logic/suggest.ts src/modules/law/logic/suggest.test.ts
git commit -m "feat(law): text matching + autocomplete suggestions

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `ScenarioBox` + `ChoiceInput` (multi-select)

**Files:** Create `src/modules/law/components/ScenarioBox.tsx`, `src/modules/law/components/ChoiceInput.tsx`; Test `src/modules/law/components/ChoiceInput.test.tsx`.

`ChoiceInput`: renders ≥2 options as toggle buttons; user selects a SET; "Vyhodnotit" submits; all-or-nothing via `matchChoice`. Keys 1–9 toggle while answering. Reveal marks each option correct/wrong (chosen and unchosen). `ScenarioBox`: styled "Situace:" block.

- [ ] **Step 1: failing test** `src/modules/law/components/ChoiceInput.test.tsx`:
```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChoiceInput } from './ChoiceInput';
import type { LawChoice } from '../data/types';

const Q: LawChoice = {
  id: 'c', source: 'sasp', theme: 'rto', prompt: 'p',
  kind: 'choice',
  options: ['A', 'B', 'C', 'D', 'E'],
  correctIndices: [0, 2],
};

beforeEach(() => vi.clearAllMocks());

describe('ChoiceInput', () => {
  it('toggles selection and submits an all-or-nothing correct set', () => {
    const onSubmit = vi.fn();
    render(<ChoiceInput question={Q} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('law-choice-option-0'));
    fireEvent.click(screen.getByTestId('law-choice-option-2'));
    fireEvent.click(screen.getByTestId('law-choice-submit'));
    expect(onSubmit).toHaveBeenCalledWith([0, 2], true);
  });
  it('reports incorrect when the set is wrong', () => {
    const onSubmit = vi.fn();
    render(<ChoiceInput question={Q} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('law-choice-option-0'));
    fireEvent.click(screen.getByTestId('law-choice-submit'));
    expect(onSubmit).toHaveBeenCalledWith([0], false);
  });
  it('disables submit when nothing selected', () => {
    render(<ChoiceInput question={Q} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('law-choice-submit')).toBeDisabled();
  });
});
```

- [ ] **Step 2:** `npx vitest run src/modules/law/components/ChoiceInput.test.tsx` — FAIL.

- [ ] **Step 3: implement** `src/modules/law/components/ScenarioBox.tsx`:
```tsx
export function ScenarioBox({ text }: { text: string }) {
  return (
    <div
      data-testid="law-scenario"
      className="rounded border-l-4 border-sasp-tan bg-sasp-navy/40 px-4 py-3 text-sm text-sasp-ink"
    >
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-sasp-tan">
        Situace
      </span>
      {text}
    </div>
  );
}
```

`src/modules/law/components/ChoiceInput.tsx`:
```tsx
import { useState } from 'react';
import { matchChoice } from '../logic/matchChoice';
import type { LawChoice } from '../data/types';

interface Props {
  question: LawChoice;
  onSubmit: (selected: number[], correct: boolean) => void;
}

export function ChoiceInput({ question, onSubmit }: Props) {
  const [selected, setSelected] = useState<number[]>([]);

  const toggle = (idx: number) =>
    setSelected((s) => (s.includes(idx) ? s.filter((i) => i !== idx) : [...s, idx]));

  const submit = () => {
    const ordered = [...selected].sort((a, b) => a - b);
    onSubmit(ordered, matchChoice(ordered, question.correctIndices));
  };

  return (
    <div className="space-y-3">
      <ul className="grid gap-2" data-testid="law-choice-options">
        {question.options.map((opt, idx) => {
          const isSel = selected.includes(idx);
          return (
            <li key={idx}>
              <button
                type="button"
                data-testid={`law-choice-option-${idx}`}
                data-selected={isSel}
                onClick={() => toggle(idx)}
                className={[
                  'flex w-full items-center gap-3 rounded border px-4 py-3 text-left transition',
                  isSel
                    ? 'border-sasp-tan bg-sasp-navy-light/50'
                    : 'border-sasp-navy-light bg-sasp-bg/40 hover:border-sasp-tan',
                ].join(' ')}
              >
                <kbd className="rounded border border-sasp-navy-light bg-sasp-bg px-1.5 py-0.5 font-mono text-xs text-sasp-ink-dim">
                  {idx + 1}
                </kbd>
                <span>{opt}</span>
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
```

Note: keyboard 1–9 toggling lives in `LawPage` (Task 7), not here, to mirror SASP where the key listener is page-level. The reveal styling (marking correct/wrong after submit) is also rendered by `LawPage` from the returned `selected`; `ChoiceInput` only handles the answering phase.

- [ ] **Step 4:** rerun — PASS.

- [ ] **Step 5: commit:**
```bash
git add src/modules/law/components/ScenarioBox.tsx src/modules/law/components/ChoiceInput.tsx src/modules/law/components/ChoiceInput.test.tsx
git commit -m "feat(law): ScenarioBox + multi-select ChoiceInput

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `MatchInput` (klik-párování)

**Files:** Create `src/modules/law/components/MatchInput.tsx`; Test `src/modules/law/components/MatchInput.test.tsx`.

Left column = `pairs[].left` (in data order). Right column = shuffled `pairs[].right` (deterministic by question id hash). Click a left to select it, click a right to assign; clicking an assigned left clears it. Submit enabled when all lefts assigned. `onSubmit(assignments, correct)` via `checkMatch`.

- [ ] **Step 1: failing test** `src/modules/law/components/MatchInput.test.tsx`:
```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchInput } from './MatchInput';
import type { LawMatch } from '../data/types';

const Q: LawMatch = {
  id: 'm', source: 'sasp', theme: 'hodnosti', prompt: 'p',
  kind: 'match', leftLabel: 'Divize', rightLabel: 'Znak',
  pairs: [{ left: 'SWAT', right: 'David' }, { left: 'DBI', right: 'William' }],
};

describe('MatchInput', () => {
  it('pairs by clicking left then right and submits correct', () => {
    const onSubmit = vi.fn();
    render(<MatchInput question={Q} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('law-match-left-SWAT'));
    fireEvent.click(screen.getByTestId('law-match-right-David'));
    fireEvent.click(screen.getByTestId('law-match-left-DBI'));
    fireEvent.click(screen.getByTestId('law-match-right-William'));
    fireEvent.click(screen.getByTestId('law-match-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ SWAT: 'David', DBI: 'William' }, true);
  });
  it('submit disabled until all lefts assigned', () => {
    render(<MatchInput question={Q} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('law-match-submit')).toBeDisabled();
    fireEvent.click(screen.getByTestId('law-match-left-SWAT'));
    fireEvent.click(screen.getByTestId('law-match-right-David'));
    expect(screen.getByTestId('law-match-submit')).toBeDisabled();
  });
});
```

- [ ] **Step 2:** `npx vitest run src/modules/law/components/MatchInput.test.tsx` — FAIL.

- [ ] **Step 3: implement** `src/modules/law/components/MatchInput.tsx`:
```tsx
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
```

- [ ] **Step 4:** rerun — PASS.

- [ ] **Step 5: commit:**
```bash
git add src/modules/law/components/MatchInput.tsx src/modules/law/components/MatchInput.test.tsx
git commit -m "feat(law): click-pairing MatchInput

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `TextInput` (input + autocomplete + Hard mode)

**Files:** Create `src/modules/law/components/TextInput.tsx`; Test `src/modules/law/components/TextInput.test.tsx`.

First READ `src/modules/sasp/components/SaspAnswerInput.tsx` and the `.autocomplete-*` / `.answer-input*` CSS in `src/styles/index.css` and mirror its structure (input + "Vyhodnotit" + dropdown + Hard-mode-disables-suggestions). Use `suggestText` (Task 1) for suggestions and `matchText` for correctness. `onSubmit(raw, correct)`.

- [ ] **Step 1: failing test** `src/modules/law/components/TextInput.test.tsx`:
```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextInput } from './TextInput';
import type { LawText } from '../data/types';

const Q: LawText = {
  id: 't', source: 'sasp', theme: 'rto', prompt: 'p',
  kind: 'text', answer: 'Frekvence 1', aliases: ['f1'],
};

describe('TextInput', () => {
  it('submits correct=true for the answer', () => {
    const onSubmit = vi.fn();
    render(<TextInput question={Q} hardMode onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('law-text-input'), { target: { value: 'frekvence 1' } });
    fireEvent.click(screen.getByTestId('law-text-submit'));
    expect(onSubmit).toHaveBeenCalledWith('frekvence 1', true);
  });
  it('submits correct=false for a miss', () => {
    const onSubmit = vi.fn();
    render(<TextInput question={Q} hardMode onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('law-text-input'), { target: { value: 'xyz' } });
    fireEvent.click(screen.getByTestId('law-text-submit'));
    expect(onSubmit).toHaveBeenCalledWith('xyz', false);
  });
  it('hardMode hides the autocomplete dropdown', () => {
    render(<TextInput question={Q} hardMode onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByTestId('law-text-input'), { target: { value: 'frek' } });
    expect(screen.queryByTestId('law-text-autocomplete')).toBeNull();
  });
});
```

- [ ] **Step 2:** `npx vitest run src/modules/law/components/TextInput.test.tsx` — FAIL.

- [ ] **Step 3: implement** `src/modules/law/components/TextInput.tsx` — mirror `SaspAnswerInput` structure. Required: controlled input `data-testid="law-text-input"`; submit button `data-testid="law-text-submit"`; on submit call `onSubmit(value, matchText(question, value))`; when `!hardMode` and `suggestText(question, value).length > 0` render a dropdown `data-testid="law-text-autocomplete"` with clickable items that fill the input; Enter submits (or fills highlighted suggestion first, matching SASP behavior). Props: `{ question: LawText; hardMode: boolean; onSubmit: (raw: string, correct: boolean) => void }`. Reuse existing CSS classes; do not invent new global CSS.

- [ ] **Step 4:** rerun — PASS. Also run `npx tsc -b` clean.

- [ ] **Step 5: commit:**
```bash
git add src/modules/law/components/TextInput.tsx src/modules/law/components/TextInput.test.tsx
git commit -m "feat(law): TextInput with autocomplete + hard mode

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: `EnumerationInput` (výčtový seznam, alias + paragraph + ordered)

**Files:** Create `src/modules/law/components/EnumerationInput.tsx`; Test `src/modules/law/components/EnumerationInput.test.tsx`.

First READ LEA components `src/modules/laws/lea/components/AnswerInput.tsx`, `AnswerList.tsx`, `AnswerRow.tsx` and `src/modules/sasp/components/SaspOrderInput.tsx`. This component handles three sub-cases of `kind:'enumeration'`:
- **ordered** (`question.ordered`): render a textarea (mirror `SaspOrderInput`), `data-testid="law-enum-order-input"`, submit `data-testid="law-enum-order-submit"`; on submit split input on `/[\n,]+/`, call `onSubmit({ ordered: true, correct: matchOrdered(question, lines) })`.
- **unordered alias** (`matcher:'alias'`): reuse LEA `AnswerList`/`AnswerRow` stacked list; user adds entries via an input with autocomplete from `suggestEnumeration`; each entry matched via `matchEnumerationEntry`; track found keys; on submit compute perfect = all expected found, no wrong/duplicate; expose entries for reveal (correct/wrong/duplicate/missed) like LEA.
- **paragraph** (`matcher:'paragraph'`): same stacked list, but autocomplete uses Penal `suggestParagraphs` (READ `src/modules/laws/penal/logic/suggestParagraph.ts` for its signature) and matching via `matchEnumerationEntry` (which uses canonical IDs). excludeKeys = canonical keys already committed.

`onSubmit(result: { perfect: boolean })`. The component owns the entry/chips state and reveal mapping; mirror LEA `LeaQuizPage` chip→AnswerEntry logic. testids: `law-enum-input`, `law-enum-add`, `law-enum-list` (the `AnswerList` already uses `data-testid="chiplist"` — keep that), `law-enum-submit`.

- [ ] **Step 1: failing test** `src/modules/law/components/EnumerationInput.test.tsx` — cover: (a) alias enumeration: add a correct entry by typing a label, submit, `onSubmit` called with `{perfect:true}` when all found; (b) a wrong entry yields `{perfect:false}`; (c) ordered enumeration: textarea correct order → `onSubmit({perfect:true})`, wrong order → false. Write concrete RTL tests with the fixtures below:
```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnumerationInput } from './EnumerationInput';
import type { LawEnumeration } from '../data/types';

const ALIAS: LawEnumeration = {
  id: 'e', source: 'lea', theme: 'paragrafy', prompt: 'p', kind: 'enumeration', matcher: 'alias',
  expected: [{ key: 'a', label: 'Maják', aliases: [] }],
};
const ORDER: LawEnumeration = {
  id: 'o', source: 'sasp', theme: 'hodnosti', prompt: 'p', kind: 'enumeration', matcher: 'alias', ordered: true,
  expected: [{ key: 'Captain', label: 'Captain' }, { key: 'Cadet', label: 'Cadet' }],
};

describe('EnumerationInput', () => {
  it('alias: adding all expected then submit is perfect', () => {
    const onSubmit = vi.fn();
    render(<EnumerationInput question={ALIAS} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('law-enum-input'), { target: { value: 'Maják' } });
    fireEvent.click(screen.getByTestId('law-enum-add'));
    fireEvent.click(screen.getByTestId('law-enum-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ perfect: true });
  });
  it('ordered: correct order is perfect', () => {
    const onSubmit = vi.fn();
    render(<EnumerationInput question={ORDER} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('law-enum-order-input'), { target: { value: 'Captain\nCadet' } });
    fireEvent.click(screen.getByTestId('law-enum-order-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ perfect: true });
  });
  it('ordered: wrong order is not perfect', () => {
    const onSubmit = vi.fn();
    render(<EnumerationInput question={ORDER} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('law-enum-order-input'), { target: { value: 'Cadet\nCaptain' } });
    fireEvent.click(screen.getByTestId('law-enum-order-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ perfect: false });
  });
});
```

- [ ] **Step 2:** run — FAIL.
- [ ] **Step 3:** implement reusing LEA primitives (read them first). Keep reveal mapping (correct/wrong/duplicate/missed) consistent with LEA. If reuse requires importing LEA `AnswerList`/`AnswerRow`, import from `@/modules/laws/lea/components/...` (LEA stays in tree). Report if a clean reuse isn't possible (DONE_WITH_CONCERNS).
- [ ] **Step 4:** run — PASS; `npx tsc -b` clean.
- [ ] **Step 5: commit:**
```bash
git add src/modules/law/components/EnumerationInput.tsx src/modules/law/components/EnumerationInput.test.tsx
git commit -m "feat(law): EnumerationInput (alias/paragraph/ordered) reusing LEA primitives

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: `LawSidePanel` + `LawMobilePanel` + `LawResetButton`

**Files:** Create `src/modules/law/components/LawSidePanel.tsx`, `LawMobilePanel.tsx`, `LawResetButton.tsx`; Test `LawSidePanel.test.tsx`.

First READ `src/modules/sasp/components/SaspSidePanel.tsx`, `SaspMobilePanel.tsx`, `SaspResetButton.tsx`. Mirror them, but the filter is TWO-level: source checkboxes (`law-filter-source-{lea|penal|sasp}`) + theme checkboxes (`law-filter-theme-{theme}`), driven by `useLawSettings`. ProgressHeader testid `law-progress-percent` / `law-progress-bar` (desktop), `law-mobile-progress-percent` (mobile). Chip list: each item `data-testid="chip-<id>"`, label = `prompt`, with source+theme abbreviation; clickable → `onSelect(id)`; ✓ for mastered (score≥2). Progress pct = `Σ min(2,max(0,score)) / (2·N)` over filtered questions (reuse the clamp pattern). `LawResetButton` mirrors `SaspResetButton` (confirm dialog, testids `law-reset-button` / `-confirm` / `-cancel` / `-confirm-yes`).

- [ ] **Step 1:** failing test `LawSidePanel.test.tsx` — render with a couple questions + progress; assert progress percent testid renders, a source filter checkbox toggles via `onSetSource`, a chip with `data-testid="chip-<id>"` fires `onSelect`. (Write concrete RTL asserting these testids exist and a click calls the passed callback.)
- [ ] **Step 2:** run — FAIL.
- [ ] **Step 3:** implement mirroring SASP panel with the two-level filter. Props: `{ items; progress; sourceFilter; themeFilter; onSetSource; onSetTheme; currentId?; onSelect }`.
- [ ] **Step 4:** run — PASS; `npx tsc -b` clean.
- [ ] **Step 5: commit:**
```bash
git add src/modules/law/components/LawSidePanel.tsx src/modules/law/components/LawMobilePanel.tsx src/modules/law/components/LawResetButton.tsx src/modules/law/components/LawSidePanel.test.tsx
git commit -m "feat(law): side panel with two-level filter + mobile + reset

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: `LawPage` (dispatch + phase + progress + completion)

**Files:** Create `src/modules/law/components/LawPage.tsx`; Test `LawPage.test.tsx`.

First READ `src/modules/sasp/components/SaspQuizPage.tsx` — mirror its structure exactly (current in useState, picker in useEffect when `current===null && phase==='answering'`, completion screen, desktop/mobile panel via `useMediaQuery('(min-width: 1024px)')`, skip, reset). Differences:
- Use `useLawProgress`, `useLawSettings`, `pickNextQuestion(state, LAW_QUESTIONS, sourceFilter, themeFilter)`, `isLawComplete(...)`.
- Render `ScenarioBox` when `current.scenario`.
- Dispatch by `current.kind`:
  - `choice` → `ChoiceInput`; keyboard 1–9 toggles selection (page-level listener while answering); on submit `recordSubmit(id,{perfect:correct})` + reveal marking options.
  - `text` → `TextInput` (Hard-mode toggle state in page footer, like SASP); on submit perfect=correct.
  - `enumeration` → `EnumerationInput`; on submit perfect from its result.
  - `match` → `MatchInput`; on submit perfect=correct; reveal pair rows.
- Reveal area shows correctness + `current.note` (and for LEA `ref`) consistently.
- Skip → `recordSkip` + analytics (Task 8). testids: `law-prompt`, `law-skip`, `law-next`, `law-congrats`, plus the per-input testids from Tasks 2–5.

- [ ] **Step 1:** failing test `LawPage.test.tsx` — seed storage v7 with `law` slice pinned so a known choice question appears; render; answer it; assert reveal + "Další otázka". (jsdom: mirror how `SaspQuizPage.test.tsx` seeds + pins. READ it.) Cover at least: choice answer flow, and that the prompt renders. Add a second test that toggling completion shows `law-congrats` when all filtered are mastered.
- [ ] **Step 2:** run — FAIL.
- [ ] **Step 3:** implement mirroring SaspQuizPage with the kind dispatch.
- [ ] **Step 4:** run — PASS; full `npm test`; `npx tsc -b` clean.
- [ ] **Step 5: commit:**
```bash
git add src/modules/law/components/LawPage.tsx src/modules/law/components/LawPage.test.tsx
git commit -m "feat(law): LawPage dispatching all four answer formats

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Analytics `law_answered`

**Files:** Modify `src/shared/analytics.ts`; wire into `LawPage.tsx`.

First READ `src/shared/analytics.ts` (typed wrapper, per-event functions, test mock in `src/test/setup.ts`). Add `trackLawAnswered({ source, kind, success, question_id })` (event `law_answered`) and ensure `trackQuestionSkipped` supports `module: 'law'` and `trackProgressReset` supports `module: 'law'`. Wire calls into `LawPage` submit/skip and `LawResetButton`.

- [ ] **Step 1:** failing test in `src/shared/analytics.test.ts` — `trackLawAnswered` calls mixpanel.track with `'law_answered'` and the props. (READ existing analytics.test.ts patterns.)
- [ ] **Step 2:** run — FAIL.
- [ ] **Step 3:** implement + wire into LawPage.
- [ ] **Step 4:** run analytics test + full `npm test`; `npx tsc -b` clean.
- [ ] **Step 5: commit:**
```bash
git add src/shared/analytics.ts src/shared/analytics.test.ts src/modules/law/components/LawPage.tsx src/modules/law/components/LawResetButton.tsx
git commit -m "feat(analytics): law_answered event + law module reset/skip

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Routing + redirects + Penal recall standalone

**Files:** Modify `src/app/routes.tsx`.

- Add `{ path: 'law', element: <LawPage /> }`.
- Add standalone Penal recall: `{ path: 'penal/recall', element: <PenalRecallPage /> }` (import stays). Keep `PenalRecallPage` working over its `penal.recall` slice.
- Redirect old routes to `/law` using `<Navigate to="/law" replace />`: paths `laws`, `laws/lea`, `laws/penal` (+ its children `scenarios`), `sasp`. Keep `geo/*` and `codes/*` unchanged. Keep `laws/penal/recall`? No — recall now lives at `/penal/recall`; redirect `laws/penal/recall` → `/penal/recall`.

- [ ] **Step 1:** failing test `src/app/routes.test.tsx` (create if absent; otherwise add) — render the router at `/sasp` and assert it lands on the Law page (e.g. `law-prompt` or a known law testid present); render at `/penal/recall` and assert the recall input `penal-recall-input` is present. (READ how existing tests render the router / use `MemoryRouter`-style; hash router may need `createMemoryRouter` in test or testing via `RouterProvider`. Mirror any existing routing test; if none, test the redirect mapping by asserting `<Navigate>` targets in the route config via a lightweight unit assertion.)
- [ ] **Step 2:** run — FAIL.
- [ ] **Step 3:** implement route changes.
- [ ] **Step 4:** run — PASS; full `npm test`; `npx tsc -b` clean.
- [ ] **Step 5: commit:**
```bash
git add src/app/routes.tsx src/app/routes.test.tsx
git commit -m "feat(app): /law route + redirects from old routes + standalone /penal/recall

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Rozcestník — nav menu + homepage

**Files:** Modify `src/app/AppLayout.tsx`, `src/app/HomePage.tsx`; Tests if present.

Replace the 4-item nav/home structure with the new one:
- **AppLayout `navItems`**: `[{to:'/codes','Desítkové kódy'}, {to:'/law','Teorie'}, {to:'/geo','Geografie'}]` (all enabled). Remove the separate `/laws` and `/sasp` (disabled) items.
- **HomePage `modules`** tiles: Desítkové kódy (`/codes`), **Teorie** (`/law`, description e.g. "Zákony (LEA, Penal Code) i provozní příručka SASP v jednom — filtrovatelné dle zdroje a tématu."), Geografie (`/geo`). All enabled. Remove the old "Zákony" and the disabled "SASP příručka" tiles.
- Add a small secondary link to Penal recall (`/penal/recall`) — a low-emphasis link under the tiles or in the footer area of HomePage, label e.g. "Penal Code — recall paragrafů". Keep it visually minor (per spec: vedlejší blbůstka).

- [ ] **Step 1:** If `AppLayout`/`HomePage` have tests, update them; else add a small test asserting the nav has a "Teorie" link to `/law` and no "SASP příručka" item. Write/adjust to FAIL first if practical.
- [ ] **Step 2:** run — FAIL (or N/A if purely presentational; then proceed).
- [ ] **Step 3:** implement nav + homepage changes incl. the minor Penal recall link.
- [ ] **Step 4:** run — PASS; full `npm test`; `npx tsc -b` clean.
- [ ] **Step 5: commit:**
```bash
git add src/app/AppLayout.tsx src/app/HomePage.tsx
git commit -m "feat(app): rozcestník — Teorie nav + homepage tiles + Penal recall link

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: E2E specs

**Files:** Create `e2e/law/quiz-flow.spec.ts`, `e2e/law/redirects.spec.ts`; keep/relocate Penal recall E2E.

First READ `e2e/fixtures/seed.ts` (now writes v7 with `law` slice) and an existing spec (e.g. `e2e/sasp/quiz-flow.spec.ts`) for patterns + `pinNext*` helpers. Add a `pinNextLawQuestion` helper if needed (mirror `pinNextSaspQuestion`), and `LAW_QUESTION_IDS` if the seed needs it. Cover:
- A choice question flow on `/law` (select, evaluate, reveal, next).
- An enumeration (LEA-style) flow on `/law`.
- Filter: disable a source, confirm those questions don't appear.
- Redirect: visiting `/#/sasp` and `/#/laws/lea` lands on `/law`.
- `/penal/recall` still works standalone.

- [ ] **Step 1:** write specs.
- [ ] **Step 2:** run `npm run test:e2e` (subset if possible) — iterate to green.
- [ ] **Step 3: commit:**
```bash
git add e2e/law e2e/fixtures/seed.ts
git commit -m "test(e2e): law unified flow, filter, redirects, penal recall standalone

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 12: Final verification

- [ ] `npx tsc -b` — clean.
- [ ] `npm test` — all green (report counts).
- [ ] `npm run test:e2e` — all green (report counts).
- [ ] Manual sanity: `/law` reachable from nav "Teorie" and homepage tile; old routes redirect; `/penal/recall` works. (No commit.)

---

## Notes / NOT in this phase
- Old modules `laws/lea`, `laws/penal` (scenarios), `sasp` components + their slices remain in the tree (unreachable via nav; routes redirect). Their removal + schema v8 is the separate **Fáze 4 (úklid)**.
- **Fáze 2** (multi-choice content ≥5 options) and **Fáze 3** (SASP redesign: dedup, match sets, scenarios, legal questions, anti-leak) follow per the design spec.
