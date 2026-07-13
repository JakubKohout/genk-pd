# Law Unification Engine (Fáze 1a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Postavit datový + logický + stavový engine pro sjednocený modul „Teorie" (`law`), který sloučí LEA + Penal scénky + SASP do jednoho poolu `LAW_QUESTIONS` s discriminated-union typem, společným matchingem a jednou progress slice — vše unit-testované, bez UI.

**Architecture:** Nový modul `src/modules/law/` s `data/` (union typy + adaptéry existujících dat → `LAW_QUESTIONS`), `logic/` (matchery per kind, reuse existujících LEA/Penal matcherů), `state/` (progress hook, settings, selection). Storage dostane **aditivní** schema v7: přidá `law` slice (settings+progress+turn) spočtenou z existujících slices; staré slices (lea/penal/sasp) zůstávají netknuté, takže staré moduly i jejich testy dál fungují. UI a routing přijdou samostatným plánem.

**Tech Stack:** Vite + React 18 + TypeScript 5.6, Vitest 2, `@/` alias → `src/`. Reuse `@/shared/text/normalize`, `@/shared/quiz/pickNextFromPool`, `@/modules/laws/penal/logic/canonicalAnswerId`.

---

### Task 1: Baseline commit

**Files:**
- Delete: `docs/superpowers/specs/2026-06-17-sasp-module-design.md` (superseded)
- Untracked SASP práce + nový spec se commitnou jako baseline

- [ ] **Step 1: Verify baseline tests are green**

Run: `npm test`
Expected: PASS (existující unit/component testy vč. necommitnutého SASP modulu). Pokud něco padá, ZASTAV a nahlas — engine se nesmí stavět na rozbitém baseline.

- [ ] **Step 2: Remove superseded old spec**

Run: `git rm docs/superpowers/specs/2026-06-17-sasp-module-design.md`

- [ ] **Step 3: Commit baseline**

```bash
git add -A
git commit -m "chore(law): baseline before unification (SASP module + unified design spec)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Expected: working tree čistý (`git status` → nothing to commit).

---

### Task 2: Law union types

**Files:**
- Create: `src/modules/law/data/types.ts`
- Test: `src/modules/law/data/types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { LAW_SOURCES, LAW_THEMES } from './types';

describe('law taxonomy', () => {
  it('has 3 sources', () => {
    expect(LAW_SOURCES).toEqual(['lea', 'penal', 'sasp']);
  });
  it('has 9 themes', () => {
    expect(LAW_THEMES).toHaveLength(9);
    expect(LAW_THEMES).toContain('paragrafy');
    expect(LAW_THEMES).toContain('zasah');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/law/data/types.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the types**

```ts
export type LawSource = 'lea' | 'penal' | 'sasp';
export const LAW_SOURCES: readonly LawSource[] = ['lea', 'penal', 'sasp'];

export type LawTheme =
  | 'pojmy' | 'hodnosti' | 'jednani' | 'rto' | 'vybava'
  | 'zasah' | 'zadrzeni' | 'kriminalistika' | 'paragrafy';
export const LAW_THEMES: readonly LawTheme[] = [
  'pojmy', 'hodnosti', 'jednani', 'rto', 'vybava',
  'zasah', 'zadrzeni', 'kriminalistika', 'paragrafy',
];

interface LawBase {
  id: string;
  source: LawSource;
  theme: LawTheme;
  prompt: string;
  ref?: string;
  note?: string;
  scenario?: string;
}

export interface LawChoice extends LawBase {
  kind: 'choice';
  options: string[];
  correctIndices: number[];
}
export interface LawText extends LawBase {
  kind: 'text';
  answer: string;
  aliases: string[];
}
export interface LawExpected {
  key: string;
  label: string;
  aliases?: string[];
  subId?: string;
}
export interface LawEnumeration extends LawBase {
  kind: 'enumeration';
  expected: LawExpected[];
  ordered?: boolean;
  matcher: 'alias' | 'paragraph';
}
export interface LawMatch extends LawBase {
  kind: 'match';
  leftLabel: string;
  rightLabel: string;
  pairs: { left: string; right: string }[];
}
export type LawQuestion = LawChoice | LawText | LawEnumeration | LawMatch;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/law/data/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/law/data/types.ts src/modules/law/data/types.test.ts
git commit -m "feat(law): union types for unified question pool

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: SASP adapter

**Files:**
- Create: `src/modules/law/data/adaptSasp.ts`
- Test: `src/modules/law/data/adaptSasp.test.ts`

SASP `kind` mapping: `choice`→`choice` (single `correctIndex` → `correctIndices:[i]`), `text`→`text`, `order`→`enumeration` (`ordered:true`, `matcher:'alias'`). Theme z SASP topicu 1:1.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { SASP_QUESTIONS } from '@/modules/sasp/data/questions';
import { adaptSaspQuestions } from './adaptSasp';

describe('adaptSasp', () => {
  const adapted = adaptSaspQuestions();

  it('adapts every SASP question', () => {
    expect(adapted).toHaveLength(SASP_QUESTIONS.length);
  });
  it('tags all as source sasp with a valid theme', () => {
    for (const q of adapted) expect(q.source).toBe('sasp');
  });
  it('maps single-correct choice to one-element correctIndices', () => {
    const choice = adapted.find((q) => q.kind === 'choice');
    expect(choice).toBeDefined();
    if (choice?.kind === 'choice') expect(choice.correctIndices).toHaveLength(1);
  });
  it('maps order questions to ordered enumeration', () => {
    const ord = adapted.find((q) => q.kind === 'enumeration' && q.ordered);
    expect(ord).toBeDefined();
    if (ord?.kind === 'enumeration') {
      expect(ord.matcher).toBe('alias');
      expect(ord.expected.length).toBeGreaterThan(1);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/law/data/adaptSasp.test.ts`
Expected: FAIL (adaptSasp not found).

- [ ] **Step 3: Write the adapter**

```ts
import { SASP_QUESTIONS } from '@/modules/sasp/data/questions';
import type { SaspQuestion, SaspTopic } from '@/modules/sasp/data/types';
import type { LawQuestion, LawTheme } from './types';

const SASP_THEME: Record<SaspTopic, LawTheme> = {
  terms: 'pojmy',
  ranks: 'hodnosti',
  conduct: 'jednani',
  radio: 'rto',
  equipment: 'vybava',
  procedures: 'zasah',
  criminalistics: 'kriminalistika',
};

function adaptOne(q: SaspQuestion): LawQuestion {
  const base = {
    id: q.id,
    source: 'sasp' as const,
    theme: SASP_THEME[q.topic],
    prompt: q.prompt,
    note: q.note,
  };
  if (q.kind === 'choice') {
    return { ...base, kind: 'choice', options: q.options, correctIndices: [q.correctIndex] };
  }
  if (q.kind === 'order') {
    return {
      ...base,
      kind: 'enumeration',
      matcher: 'alias',
      ordered: true,
      expected: q.order.map((label) => ({ key: label, label })),
    };
  }
  return { ...base, kind: 'text', answer: q.answer, aliases: q.aliases };
}

export function adaptSaspQuestions(): LawQuestion[] {
  return SASP_QUESTIONS.map(adaptOne);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/law/data/adaptSasp.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/law/data/adaptSasp.ts src/modules/law/data/adaptSasp.test.ts
git commit -m "feat(law): adapt SASP questions into union pool

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: LEA adapter

**Files:**
- Create: `src/modules/law/data/adaptLea.ts`
- Test: `src/modules/law/data/adaptLea.test.ts`

LEA `Question` → `enumeration` (`matcher:'alias'`), `items` → `expected` (key=item.id, label=quote, aliases). source `lea`, theme `paragrafy`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { LEA_QUESTIONS } from '@/modules/laws/lea/data/questions';
import { adaptLeaQuestions } from './adaptLea';

describe('adaptLea', () => {
  const adapted = adaptLeaQuestions();

  it('adapts every LEA question to enumeration', () => {
    expect(adapted).toHaveLength(LEA_QUESTIONS.length);
    for (const q of adapted) {
      expect(q.source).toBe('lea');
      expect(q.kind).toBe('enumeration');
      if (q.kind === 'enumeration') expect(q.matcher).toBe('alias');
    }
  });
  it('maps items to expected with id/quote/aliases', () => {
    const first = adapted[0];
    const src = LEA_QUESTIONS[0];
    if (first.kind === 'enumeration') {
      expect(first.expected).toHaveLength(src.items.length);
      expect(first.expected[0].key).toBe(src.items[0].id);
      expect(first.expected[0].label).toBe(src.items[0].quote);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/law/data/adaptLea.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the adapter**

```ts
import { LEA_QUESTIONS } from '@/modules/laws/lea/data/questions';
import type { Question } from '@/modules/laws/lea/data/types';
import type { LawQuestion } from './types';

function adaptOne(q: Question): LawQuestion {
  return {
    id: q.id,
    source: 'lea',
    theme: 'paragrafy',
    prompt: q.prompt,
    ref: q.ref,
    note: q.description,
    kind: 'enumeration',
    matcher: 'alias',
    expected: q.items.map((it) => ({ key: it.id, label: it.quote, aliases: it.aliases })),
  };
}

export function adaptLeaQuestions(): LawQuestion[] {
  return LEA_QUESTIONS.map(adaptOne);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/law/data/adaptLea.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/law/data/adaptLea.ts src/modules/law/data/adaptLea.test.ts
git commit -m "feat(law): adapt LEA questions into enumeration pool

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Penal scenario adapter

**Files:**
- Create: `src/modules/law/data/adaptPenal.ts`
- Test: `src/modules/law/data/adaptPenal.test.ts`

`PenalScenario` → `enumeration` (`matcher:'paragraph'`). `prompt` (scéna) → `scenario`; `prompt` pole otázky = fixní „Které paragrafy se na situaci vztahují?". `expected` key = `paragraphId + (subId ?? '')`, label = `§<paragraphId>[ subId]`, subId zachován. `educationalNote` → note. source `penal`, theme `paragrafy`. Penal **recall** se NEadaptuje.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { PENAL_SCENARIOS } from '@/modules/laws/penal/data/scenarios';
import { adaptPenalScenarios } from './adaptPenal';

describe('adaptPenal', () => {
  const adapted = adaptPenalScenarios();

  it('adapts every scenario to paragraph enumeration', () => {
    expect(adapted).toHaveLength(PENAL_SCENARIOS.length);
    for (const q of adapted) {
      expect(q.source).toBe('penal');
      expect(q.kind).toBe('enumeration');
      if (q.kind === 'enumeration') expect(q.matcher).toBe('paragraph');
    }
  });
  it('moves the scene text into scenario and uses a generic prompt', () => {
    const first = adapted[0];
    expect(first.scenario).toBe(PENAL_SCENARIOS[0].prompt);
    expect(first.prompt).toMatch(/paragrafy/i);
  });
  it('builds canonical expected keys from paragraphId + subId', () => {
    const withSub = PENAL_SCENARIOS.find((s) => s.expected.some((e) => e.subId));
    expect(withSub).toBeDefined();
    const adaptedWithSub = adapted.find((q) => q.id === withSub!.id);
    const exp = withSub!.expected.find((e) => e.subId)!;
    if (adaptedWithSub?.kind === 'enumeration') {
      expect(adaptedWithSub.expected.map((e) => e.key)).toContain(exp.paragraphId + exp.subId);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/law/data/adaptPenal.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the adapter**

```ts
import { PENAL_SCENARIOS } from '@/modules/laws/penal/data/scenarios';
import type { PenalScenario } from '@/modules/laws/penal/data/types';
import type { LawQuestion } from './types';

const SCENARIO_PROMPT = 'Které paragrafy se na situaci vztahují?';

function adaptOne(s: PenalScenario): LawQuestion {
  return {
    id: s.id,
    source: 'penal',
    theme: 'paragrafy',
    prompt: SCENARIO_PROMPT,
    ref: s.ref,
    note: s.educationalNote,
    scenario: s.prompt,
    kind: 'enumeration',
    matcher: 'paragraph',
    expected: s.expected.map((e) => ({
      key: e.paragraphId + (e.subId ?? ''),
      label: `§${e.paragraphId}${e.subId ? ` ${e.subId}` : ''}`,
      subId: e.subId,
    })),
  };
}

export function adaptPenalScenarios(): LawQuestion[] {
  return PENAL_SCENARIOS.map(adaptOne);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/law/data/adaptPenal.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/law/data/adaptPenal.ts src/modules/law/data/adaptPenal.test.ts
git commit -m "feat(law): adapt Penal scenarios into paragraph enumeration pool

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Combined pool `LAW_QUESTIONS`

**Files:**
- Create: `src/modules/law/data/index.ts`
- Test: `src/modules/law/data/index.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { LAW_QUESTIONS } from './index';
import { adaptSaspQuestions } from './adaptSasp';
import { adaptLeaQuestions } from './adaptLea';
import { adaptPenalScenarios } from './adaptPenal';
import { LAW_SOURCES, LAW_THEMES } from './types';

describe('LAW_QUESTIONS', () => {
  it('merges all three sources', () => {
    const expected =
      adaptSaspQuestions().length + adaptLeaQuestions().length + adaptPenalScenarios().length;
    expect(LAW_QUESTIONS).toHaveLength(expected);
  });
  it('has unique IDs across sources', () => {
    const ids = LAW_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('every question has a valid source and theme', () => {
    for (const q of LAW_QUESTIONS) {
      expect(LAW_SOURCES).toContain(q.source);
      expect(LAW_THEMES).toContain(q.theme);
    }
  });
  it('every choice has >=5 options is NOT yet enforced (phase 2)', () => {
    expect(LAW_QUESTIONS.some((q) => q.kind === 'choice')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/law/data/index.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the combiner**

```ts
import { adaptSaspQuestions } from './adaptSasp';
import { adaptLeaQuestions } from './adaptLea';
import { adaptPenalScenarios } from './adaptPenal';
import type { LawQuestion } from './types';

export const LAW_QUESTIONS: readonly LawQuestion[] = [
  ...adaptLeaQuestions(),
  ...adaptPenalScenarios(),
  ...adaptSaspQuestions(),
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/law/data/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/law/data/index.ts src/modules/law/data/index.test.ts
git commit -m "feat(law): combine sources into LAW_QUESTIONS pool

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: `matchChoice` logic

**Files:**
- Create: `src/modules/law/logic/matchChoice.ts`
- Test: `src/modules/law/logic/matchChoice.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { matchChoice } from './matchChoice';

describe('matchChoice (set equality)', () => {
  it('true when selected set equals correct set (order-independent)', () => {
    expect(matchChoice([2, 0], [0, 2])).toBe(true);
  });
  it('false when a correct option is missing', () => {
    expect(matchChoice([0], [0, 2])).toBe(false);
  });
  it('false when an extra wrong option is selected', () => {
    expect(matchChoice([0, 1, 2], [0, 2])).toBe(false);
  });
  it('false when nothing selected', () => {
    expect(matchChoice([], [1])).toBe(false);
  });
  it('handles single-correct', () => {
    expect(matchChoice([1], [1])).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/law/logic/matchChoice.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the logic**

```ts
export function matchChoice(selected: number[], correct: number[]): boolean {
  if (selected.length !== correct.length) return false;
  const a = new Set(selected);
  if (a.size !== correct.length) return false;
  return correct.every((c) => a.has(c));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/law/logic/matchChoice.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/law/logic/matchChoice.ts src/modules/law/logic/matchChoice.test.ts
git commit -m "feat(law): matchChoice set-equality scoring

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: `checkMatch` logic (klik-párování)

**Files:**
- Create: `src/modules/law/logic/checkMatch.ts`
- Test: `src/modules/law/logic/checkMatch.test.ts`

`assignments` mapuje `left` → zvolenou `right` hodnotu. All-or-nothing.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { checkMatch } from './checkMatch';
import type { LawMatch } from '../data/types';

const Q: LawMatch = {
  id: 'x', source: 'sasp', theme: 'hodnosti', prompt: 'p',
  kind: 'match', leftLabel: 'L', rightLabel: 'R',
  pairs: [{ left: 'SWAT', right: 'David' }, { left: 'DBI', right: 'William' }],
};

describe('checkMatch', () => {
  it('true when every left maps to its correct right', () => {
    expect(checkMatch(Q, { SWAT: 'David', DBI: 'William' })).toBe(true);
  });
  it('false on a wrong pairing', () => {
    expect(checkMatch(Q, { SWAT: 'William', DBI: 'David' })).toBe(false);
  });
  it('false when an assignment is missing', () => {
    expect(checkMatch(Q, { SWAT: 'David' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/law/logic/checkMatch.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the logic**

```ts
import type { LawQuestion } from '../data/types';

export function checkMatch(
  question: LawQuestion,
  assignments: Record<string, string>,
): boolean {
  if (question.kind !== 'match') return false;
  return question.pairs.every((p) => assignments[p.left] === p.right);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/law/logic/checkMatch.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/law/logic/checkMatch.ts src/modules/law/logic/checkMatch.test.ts
git commit -m "feat(law): checkMatch all-or-nothing pairing

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Enumeration matching (`matchEnumerationEntry` + `matchOrdered`)

**Files:**
- Create: `src/modules/law/logic/matchEnumeration.ts`
- Test: `src/modules/law/logic/matchEnumeration.test.ts`

`matchEnumerationEntry(question, raw)` vrátí klíč nalezené `expected` položky nebo null.
- matcher `'alias'`: normalize(raw) === normalize(label) nebo některý alias.
- matcher `'paragraph'`: `canonicalAnswerId(raw)` === expected.key.
`matchOrdered(question, rawLines)` kontroluje přesné pořadí labelů (pro `ordered`).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { matchEnumerationEntry, matchOrdered } from './matchEnumeration';
import type { LawEnumeration } from '../data/types';

const ALIAS_Q: LawEnumeration = {
  id: 'a', source: 'lea', theme: 'paragrafy', prompt: 'p',
  kind: 'enumeration', matcher: 'alias',
  expected: [{ key: 'i1', label: 'Maják', aliases: ['varovne svetlo'] }],
};
const PARA_Q: LawEnumeration = {
  id: 'b', source: 'penal', theme: 'paragrafy', prompt: 'p',
  kind: 'enumeration', matcher: 'paragraph',
  expected: [{ key: '25b', label: '§25 b', subId: 'b' }, { key: '27', label: '§27' }],
};
const ORDER_Q: LawEnumeration = {
  id: 'c', source: 'sasp', theme: 'hodnosti', prompt: 'p',
  kind: 'enumeration', matcher: 'alias', ordered: true,
  expected: [{ key: 'Captain', label: 'Captain' }, { key: 'Cadet', label: 'Cadet' }],
};

describe('matchEnumerationEntry', () => {
  it('alias: matches label after normalize (diacritics/case)', () => {
    expect(matchEnumerationEntry(ALIAS_Q, 'majak')).toBe('i1');
  });
  it('alias: matches an alias', () => {
    expect(matchEnumerationEntry(ALIAS_Q, 'varovne svetlo')).toBe('i1');
  });
  it('alias: returns null on miss', () => {
    expect(matchEnumerationEntry(ALIAS_Q, 'nic')).toBeNull();
  });
  it('paragraph: canonicalizes §25 b -> 25b', () => {
    expect(matchEnumerationEntry(PARA_Q, '§25 b')).toBe('25b');
  });
  it('paragraph: wrong sub returns null', () => {
    expect(matchEnumerationEntry(PARA_Q, '25a')).toBeNull();
  });
});

describe('matchOrdered', () => {
  it('true on exact order', () => {
    expect(matchOrdered(ORDER_Q, ['Captain', 'Cadet'])).toBe(true);
  });
  it('false on swapped order', () => {
    expect(matchOrdered(ORDER_Q, ['Cadet', 'Captain'])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/law/logic/matchEnumeration.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the logic**

```ts
import { normalize } from '@/shared/text/normalize';
import { canonicalAnswerId } from '@/modules/laws/penal/logic/canonicalAnswerId';
import type { LawQuestion } from '../data/types';

export function matchEnumerationEntry(question: LawQuestion, raw: string): string | null {
  if (question.kind !== 'enumeration') return null;
  if (question.matcher === 'paragraph') {
    const cid = canonicalAnswerId(raw);
    if (!cid) return null;
    const hit = question.expected.find((e) => e.key === cid);
    return hit ? hit.key : null;
  }
  const norm = normalize(raw);
  if (!norm) return null;
  for (const e of question.expected) {
    if (normalize(e.label) === norm) return e.key;
    for (const alias of e.aliases ?? []) {
      if (normalize(alias) === norm) return e.key;
    }
  }
  return null;
}

export function matchOrdered(question: LawQuestion, rawLines: string[]): boolean {
  if (question.kind !== 'enumeration' || !question.ordered) return false;
  const got = rawLines.map((s) => normalize(s)).filter((s) => s.length > 0);
  if (got.length !== question.expected.length) return false;
  return question.expected.every((e, i) => normalize(e.label) === got[i]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/law/logic/matchEnumeration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/law/logic/matchEnumeration.ts src/modules/law/logic/matchEnumeration.test.ts
git commit -m "feat(law): enumeration matching (alias + paragraph + ordered)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Storage schema v7 (aditivní `law` slice)

**Files:**
- Modify: `src/shared/storage.ts`
- Test: `src/shared/storage.test.ts`

Aditivní: přidat `law` slice, **ponechat** lea/penal/sasp/codes/geo. Migrace v6→v7 spočítá `law.progress` jako union existujících mastery, `law.turn` jako součet; default filtry vše true. Lenient v7 read dopočítá chybějící `law`.

- [ ] **Step 1: Read current storage to learn exact shapes**

Run: `sed -n '1,80p' src/shared/storage.ts`
(Najdi `PersistedState`, `initialState`, `schemaVersion`, `ProgressEntry`, migrační řetěz, lenient read. Replikuj jejich styl.)

- [ ] **Step 2: Write the failing test**

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { loadState, saveState, __resetCacheForTests, STORAGE_KEY } from './storage';

beforeEach(() => {
  localStorage.clear();
  __resetCacheForTests();
});

describe('schema v7 law slice', () => {
  it('initial state has an empty law slice with all filters true', () => {
    const s = loadState();
    expect(s.schemaVersion).toBe(7);
    expect(s.law.progress).toEqual({});
    expect(s.law.turn).toBe(0);
    expect(s.law.settings.sourceFilter).toEqual({ lea: true, penal: true, sasp: true });
    expect(Object.values(s.law.settings.themeFilter).every(Boolean)).toBe(true);
  });

  it('migrates v6 -> v7 by unioning lea + penal.scenarios + sasp.quiz progress', () => {
    const v6 = {
      schemaVersion: 6,
      codes: { progress: {}, turn: 0, settings: { importanceFilter: { mandatory: true, rare: true, unnecessary: true } } },
      lea: { progress: { 'lea.7': { score: 2, lastAskedAtTurn: 1 } }, turn: 3 },
      penal: {
        scenarios: { progress: { 'penal.A1': { score: 2, lastAskedAtTurn: 0 } }, turn: 2 },
        recall: { progress: { '25': { score: 1, lastAskedAtTurn: 0 } }, turn: 1 },
      },
      geo: { blind: { progress: {}, turn: 0 }, name: { progress: {}, turn: 0 }, settings: { categoryFilter: { street: true, highway: true, city: true, state: true } } },
      sasp: { quiz: { progress: { 'sasp.test.terms.1': { score: -2, lastAskedAtTurn: 0 } }, turn: 4 }, settings: { topicFilter: { terms: true, ranks: true, conduct: true, radio: true, equipment: true, procedures: true, criminalistics: true } } },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v6));
    __resetCacheForTests();
    const s = loadState();
    expect(s.schemaVersion).toBe(7);
    expect(s.law.progress['lea.7']).toEqual({ score: 2, lastAskedAtTurn: 1 });
    expect(s.law.progress['penal.A1']).toEqual({ score: 2, lastAskedAtTurn: 0 });
    expect(s.law.progress['sasp.test.terms.1']).toEqual({ score: -2, lastAskedAtTurn: 0 });
    expect(s.law.turn).toBe(3 + 2 + 4);
    // penal.recall preserved
    expect(s.penal.recall.progress['25']).toEqual({ score: 1, lastAskedAtTurn: 0 });
  });

  it('lenient v7 read backfills a missing law slice', () => {
    const s0 = loadState();
    const v7 = JSON.parse(JSON.stringify(s0));
    delete v7.law;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v7));
    __resetCacheForTests();
    const s = loadState();
    expect(s.law.progress).toEqual({});
    expect(s.law.settings.sourceFilter.lea).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/shared/storage.test.ts`
Expected: FAIL (schemaVersion 6, no law slice).

- [ ] **Step 4: Implement v7 in `storage.ts`**

Přidej typy (vedle existujících `SaspQuizSlice` apod.):

```ts
export type LawSourceFilter = { lea: boolean; penal: boolean; sasp: boolean };
export type LawThemeFilter = Record<LawThemeKey, boolean>;
export type LawThemeKey =
  | 'pojmy' | 'hodnosti' | 'jednani' | 'rto' | 'vybava'
  | 'zasah' | 'zadrzeni' | 'kriminalistika' | 'paragrafy';
export interface LawSlice {
  progress: Record<string, ProgressEntry>;
  turn: number;
  settings: { sourceFilter: LawSourceFilter; themeFilter: LawThemeFilter };
}
```

Konstanta default filtru:

```ts
const LAW_THEME_KEYS: LawThemeKey[] = [
  'pojmy', 'hodnosti', 'jednani', 'rto', 'vybava',
  'zasah', 'zadrzeni', 'kriminalistika', 'paragrafy',
];
function defaultLawSettings(): LawSlice['settings'] {
  return {
    sourceFilter: { lea: true, penal: true, sasp: true },
    themeFilter: Object.fromEntries(LAW_THEME_KEYS.map((k) => [k, true])) as LawThemeFilter,
  };
}
function emptyLawSlice(): LawSlice {
  return { progress: {}, turn: 0, settings: defaultLawSettings() };
}
```

Přidej `law: LawSlice` do `PersistedState`, do `initialState` (`law: emptyLawSlice()`), bumpni `SCHEMA_VERSION` na `7`.

Migrace v6→v7 (přidej do řetězu za v5→v6):

```ts
function migrateV6toV7(s: any): any {
  const law: LawSlice = emptyLawSlice();
  law.progress = {
    ...(s.lea?.progress ?? {}),
    ...(s.penal?.scenarios?.progress ?? {}),
    ...(s.sasp?.quiz?.progress ?? {}),
  };
  law.turn = (s.lea?.turn ?? 0) + (s.penal?.scenarios?.turn ?? 0) + (s.sasp?.quiz?.turn ?? 0);
  return { ...s, schemaVersion: 7, law };
}
```

V lenient readu (tam kde se dopočítává sasp/geo) přidej backfill:

```ts
if (!state.law) state.law = emptyLawSlice();
else {
  state.law.settings ??= defaultLawSettings();
  state.law.settings.sourceFilter ??= defaultLawSettings().sourceFilter;
  const tf = defaultLawSettings().themeFilter;
  state.law.settings.themeFilter = { ...tf, ...(state.law.settings.themeFilter ?? {}) };
  state.law.progress ??= {};
  state.law.turn ??= 0;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/shared/storage.test.ts`
Expected: PASS.

- [ ] **Step 6: Run full suite to confirm no regressions**

Run: `npm test`
Expected: PASS (aditivní změna; staré slices netknuté). Pokud padají test seedy s hardcoded `schemaVersion: 6`, oprav je na `7` + doplň `law: emptyLawSlice()` ekvivalent — ale jen pokud čtou přes `loadState` (migrace to dořeší) NEBO porovnávají `schemaVersion`. Mnoho seedů projde díky lenient readu.

- [ ] **Step 7: Commit**

```bash
git add src/shared/storage.ts src/shared/storage.test.ts
git commit -m "feat(storage): additive schema v7 with law slice + v6->v7 migration

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: `useLawProgress` hook

**Files:**
- Create: `src/modules/law/state/useLawProgress.ts`
- Test: `src/modules/law/state/useLawProgress.test.ts`

Kopíruj vzor `useSaspQuizProgress` (delta ±2, skip → MAX, reset), ale nad `state.law`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { __resetCacheForTests } from '@/shared/storage';
import { useLawProgress } from './useLawProgress';

beforeEach(() => {
  localStorage.clear();
  __resetCacheForTests();
});

describe('useLawProgress', () => {
  it('records a perfect submit as +2', () => {
    const { result } = renderHook(() => useLawProgress());
    act(() => result.current.recordSubmit('q1', { perfect: true }));
    expect(result.current.progress['q1'].score).toBe(2);
  });
  it('records a wrong submit as -2', () => {
    const { result } = renderHook(() => useLawProgress());
    act(() => result.current.recordSubmit('q1', { perfect: false }));
    expect(result.current.progress['q1'].score).toBe(-2);
  });
  it('skip sets score to MAX', () => {
    const { result } = renderHook(() => useLawProgress());
    act(() => result.current.recordSkip('q1'));
    expect(result.current.progress['q1'].score).toBe(2);
  });
  it('reset clears progress and turn', () => {
    const { result } = renderHook(() => useLawProgress());
    act(() => result.current.recordSubmit('q1', { perfect: true }));
    act(() => result.current.reset());
    expect(result.current.progress).toEqual({});
    expect(result.current.turn).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/law/state/useLawProgress.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the hook**

```ts
import { useCallback, useSyncExternalStore } from 'react';
import {
  getSnapshot, loadState, saveState, subscribeState,
  type PersistedState, type ProgressEntry, type LawSlice,
} from '@/shared/storage';

const MIN_SCORE = -2;
const MAX_SCORE = 2;
const clamp = (n: number) => Math.max(MIN_SCORE, Math.min(MAX_SCORE, n));

interface LawProgressApi {
  progress: Record<string, ProgressEntry>;
  turn: number;
  recordSubmit: (id: string, result: { perfect: boolean }) => void;
  recordSkip: (id: string) => void;
  reset: () => void;
}

function setLaw(state: PersistedState, patch: Partial<LawSlice>): PersistedState {
  return { ...state, law: { ...state.law, ...patch } };
}

export function useLawProgress(): LawProgressApi {
  const state = useSyncExternalStore(subscribeState, getSnapshot, getSnapshot);
  const slice = state.law;

  const recordSubmit = useCallback((id: string, result: { perfect: boolean }) => {
    const cur = loadState().law;
    const prev = cur.progress[id] ?? { score: 0, lastAskedAtTurn: cur.turn };
    const delta = result.perfect ? 2 : -2;
    saveState(setLaw(loadState(), {
      turn: cur.turn + 1,
      progress: { ...cur.progress, [id]: { score: clamp(prev.score + delta), lastAskedAtTurn: cur.turn } },
    }));
  }, []);

  const recordSkip = useCallback((id: string) => {
    const cur = loadState().law;
    saveState(setLaw(loadState(), {
      turn: cur.turn + 1,
      progress: { ...cur.progress, [id]: { score: MAX_SCORE, lastAskedAtTurn: cur.turn } },
    }));
  }, []);

  const reset = useCallback(() => {
    saveState(setLaw(loadState(), { progress: {}, turn: 0 }));
  }, []);

  return { progress: slice.progress, turn: slice.turn, recordSubmit, recordSkip, reset };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/law/state/useLawProgress.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/law/state/useLawProgress.ts src/modules/law/state/useLawProgress.test.ts
git commit -m "feat(law): useLawProgress hook over law slice

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 12: `useLawSettings` hook (zdroj + téma filtr)

**Files:**
- Create: `src/modules/law/state/useLawSettings.ts`
- Test: `src/modules/law/state/useLawSettings.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { __resetCacheForTests } from '@/shared/storage';
import { useLawSettings } from './useLawSettings';

beforeEach(() => {
  localStorage.clear();
  __resetCacheForTests();
});

describe('useLawSettings', () => {
  it('toggles a source filter', () => {
    const { result } = renderHook(() => useLawSettings());
    act(() => result.current.setSource('lea', false));
    expect(result.current.sourceFilter.lea).toBe(false);
    expect(result.current.sourceFilter.penal).toBe(true);
  });
  it('toggles a theme filter', () => {
    const { result } = renderHook(() => useLawSettings());
    act(() => result.current.setTheme('rto', false));
    expect(result.current.themeFilter.rto).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/law/state/useLawSettings.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the hook**

```ts
import { useCallback, useSyncExternalStore } from 'react';
import {
  getSnapshot, loadState, saveState, subscribeState,
  type PersistedState, type LawSourceFilter, type LawThemeFilter, type LawThemeKey,
} from '@/shared/storage';

function setSettings(state: PersistedState, settings: PersistedState['law']['settings']): PersistedState {
  return { ...state, law: { ...state.law, settings } };
}

export function useLawSettings() {
  const state = useSyncExternalStore(subscribeState, getSnapshot, getSnapshot);
  const { sourceFilter, themeFilter } = state.law.settings;

  const setSource = useCallback((key: keyof LawSourceFilter, value: boolean) => {
    const cur = loadState();
    saveState(setSettings(cur, {
      ...cur.law.settings,
      sourceFilter: { ...cur.law.settings.sourceFilter, [key]: value },
    }));
  }, []);

  const setTheme = useCallback((key: LawThemeKey, value: boolean) => {
    const cur = loadState();
    saveState(setSettings(cur, {
      ...cur.law.settings,
      themeFilter: { ...cur.law.settings.themeFilter, [key]: value } as LawThemeFilter,
    }));
  }, []);

  return { sourceFilter, themeFilter, setSource, setTheme };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/law/state/useLawSettings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/law/state/useLawSettings.ts src/modules/law/state/useLawSettings.test.ts
git commit -m "feat(law): useLawSettings source+theme filter hook

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 13: Selection (`pickNextQuestion`)

**Files:**
- Create: `src/modules/law/state/selection.ts`
- Test: `src/modules/law/state/selection.test.ts`

Eligible = `sourceFilter[source]` ∧ `themeFilter[theme]` ∧ `score < 2`. Deleguj na `pickNextFromPool`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { eligibleQuestions, isLawComplete, pickNextQuestion } from './selection';
import type { LawQuestion } from '../data/types';

const POOL: LawQuestion[] = [
  { id: 'a', source: 'lea', theme: 'paragrafy', prompt: 'p', kind: 'text', answer: 'x', aliases: [] },
  { id: 'b', source: 'sasp', theme: 'rto', prompt: 'p', kind: 'text', answer: 'y', aliases: [] },
];
const allTrueSource = { lea: true, penal: true, sasp: true };
const allTrueTheme = {
  pojmy: true, hodnosti: true, jednani: true, rto: true, vybava: true,
  zasah: true, zadrzeni: true, kriminalistika: true, paragrafy: true,
};

describe('law selection', () => {
  it('excludes questions whose source filter is off', () => {
    const e = eligibleQuestions({ progress: {}, turn: 0 }, POOL, { ...allTrueSource, sasp: false }, allTrueTheme);
    expect(e.map((q) => q.id)).toEqual(['a']);
  });
  it('excludes questions whose theme filter is off', () => {
    const e = eligibleQuestions({ progress: {}, turn: 0 }, POOL, allTrueSource, { ...allTrueTheme, rto: false });
    expect(e.map((q) => q.id)).toEqual(['a']);
  });
  it('excludes mastered (score >= 2)', () => {
    const e = eligibleQuestions({ progress: { a: { score: 2, lastAskedAtTurn: 0 } }, turn: 1 }, POOL, allTrueSource, allTrueTheme);
    expect(e.map((q) => q.id)).toEqual(['b']);
  });
  it('isLawComplete true when nothing eligible', () => {
    expect(isLawComplete({ progress: { a: { score: 2, lastAskedAtTurn: 0 }, b: { score: 2, lastAskedAtTurn: 0 } }, turn: 2 }, POOL, allTrueSource, allTrueTheme)).toBe(true);
  });
  it('pickNextQuestion returns an eligible question', () => {
    const picked = pickNextQuestion({ progress: {}, turn: 0 }, POOL, allTrueSource, allTrueTheme);
    expect(picked).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/law/state/selection.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write selection**

```ts
import { pickNextFromPool } from '@/shared/quiz/pickNextFromPool';
import type { ProgressEntry, LawSourceFilter, LawThemeFilter } from '@/shared/storage';
import type { LawQuestion } from '../data/types';

const MAX_SCORE = 2;

export type LawSliceState = { progress: Record<string, ProgressEntry>; turn: number };

export function eligibleQuestions(
  state: LawSliceState,
  all: readonly LawQuestion[],
  sourceFilter: LawSourceFilter,
  themeFilter: LawThemeFilter,
): LawQuestion[] {
  return all.filter(
    (q) =>
      sourceFilter[q.source] &&
      themeFilter[q.theme] &&
      (state.progress[q.id]?.score ?? 0) < MAX_SCORE,
  );
}

export function isLawComplete(
  state: LawSliceState,
  all: readonly LawQuestion[],
  sourceFilter: LawSourceFilter,
  themeFilter: LawThemeFilter,
): boolean {
  return eligibleQuestions(state, all, sourceFilter, themeFilter).length === 0;
}

export function pickNextQuestion(
  state: LawSliceState,
  all: readonly LawQuestion[],
  sourceFilter: LawSourceFilter,
  themeFilter: LawThemeFilter,
): LawQuestion | null {
  return pickNextFromPool(
    eligibleQuestions(state, all, sourceFilter, themeFilter),
    state.progress,
    state.turn,
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/law/state/selection.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/law/state/selection.ts src/modules/law/state/selection.test.ts
git commit -m "feat(law): selection with source+theme+score filtering

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 14: Final engine verification

- [ ] **Step 1: Run the whole suite**

Run: `npm test`
Expected: PASS (vše zelené; engine je aditivní, staré moduly netknuté).

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: žádné chyby.

- [ ] **Step 3: (žádný commit, jen ověření)**

Engine hotový. UI + routing (`LawPage`, dispatch render, dvouúrovňový filtr panel, redirecty starých rout, Penal recall standalone, nav, analytics) je samostatný navazující plán.

---

## Poznámky pro navazující plány (NE součást této fáze)

- **Fáze 1b (UI + routing):** `LawPage` s dispatchem render+match dle `kind`
  (reuse LEA `AnswerList`/`AnswerRow` pro enumeration, nová `ChoiceInput`
  multi-select, `MatchInput`, `ScenarioBox`), `LawSidePanel` (dvouúrovňový filtr),
  route `/law` + redirecty `/laws*`, `/sasp`; přesun Penal recall na
  `/penal/recall`; nav 3 dlaždice + odkaz; `law_answered` analytics; E2E.
  Na konci smazat osamocené staré komponenty + slices (schema v8).
- **Fáze 2:** multi-choice obsah (SASP choice na ≥5 možností, vícenásobně správné).
- **Fáze 3:** SASP redesign obsahu (dedup, match sety, scénáře, legal otázky,
  anti-leak) dle spec §9–10.
