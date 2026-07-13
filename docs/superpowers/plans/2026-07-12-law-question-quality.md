# Law Question Quality & Input UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Opravit primitivnost choice otázek (shuffle + revize distraktorů), zmatečnost enumerací (keyword matching, lepší instrukce) a UX vstupů (Enter algoritmus, ordered přes chipy) v modulu Teorie (`/law`).

**Architecture:** Engine změny nejdřív (matcher, ChoiceInput/EnumerationInput/LawPage), datová revize `questions.ts` potom v tematických dávkách. Storage schéma zůstává v9, scoring beze změny. Spec: `docs/superpowers/specs/2026-07-12-law-question-quality-design.md`.

**Tech Stack:** Vite 6 + React 18 + TS 5.6, Vitest 2 (jsdom), Playwright 1, Tailwind 3.4.

## Global Constraints

- Storage schéma zůstává **v9** — žádný bump, `keywords` je čistě datové pole otázek.
- Scoring beze změny: delta ±2, žádný partial credit, mastered na +2 (Gotcha 23).
- Počet očekávaných položek enumerace se uživateli NIKDY neprozrazuje (rozhodnutí uživatele).
- Žádné emoji v kódu/dokumentaci (Gotcha 14). Tlumený text = `text-sasp-ink-dim` (Gotcha 13).
- Anti-leak: SASP otázky nesmí přebírat doslovné formulace z reálného testu. Zdroj obsahu: `docs/sasp-manual.md` (lokální, gitignored — NEPŘIDÁVAT do gitu).
- Při každé změně ID otázek (delete/rename/add) sync `e2e/fixtures/seed.ts` (Gotcha 43) a per-source counts v `questions.test.ts`.
- Komentáře jen tam, kde „proč" není zřejmé. `data-testid` na všem, co testuje E2E.
- Konečný stav: `npm run test:all` zelené.
- Cílové počty po datové revizi: **137 otázek = 17 LEA + 28 Penal + 92 SASP** (SASP: 85 choice + 1 text + 2 enumeration + 4 match).

---

### Task 1: Keyword matcher v `matchEnumerationEntry`

**Files:**
- Modify: `src/modules/law/data/types.ts` (LawExpected)
- Modify: `src/modules/law/logic/matchEnumeration.ts`
- Test: `src/modules/law/logic/matchEnumeration.test.ts`
- Test: `src/modules/law/data/questions.test.ts` (kolizní validace)

**Interfaces:**
- Consumes: `normalize` z `@/shared/text/normalize`.
- Produces: `LawExpected.keywords?: string[]`; `keywordMatches(normInput: string, keyword: string): boolean` (export pro validační test); `matchEnumerationEntry(question, raw): string | null` — chování rozšířeno o keyword pass, signatura beze změny.

Sémantika keyword matche: keyword se rozdělí na tokeny po `normalize`; vstup matchuje, když obsahuje souvislý běh tokenů, kde každý keyword token je **prefixem** odpovídajícího vstupního tokenu. Prefix match řeší českou flexi („stejnokroj" matchne „stejnokrojem", „nutna obrana" matchne „nutnou obranou"), token hranice brání shodám uvnitř slov („lest" nematchne „bolest"). Exact label/alias match má prioritu přes VŠECHNY položky (dva průchody) — keyword jedné položky nesmí spolknout přesný alias jiné.

- [ ] **Step 1: Napsat failing testy matcheru**

Do `src/modules/law/logic/matchEnumeration.test.ts` přidat (ponechat existující testy `matchEnumerationEntry`; testy `matchOrdered` se přepisují až v Tasku 3):

```ts
const KW: LawEnumeration = {
  id: 'kw', source: 'lea', theme: 'paragrafy', prompt: 'p',
  kind: 'enumeration', matcher: 'alias',
  expected: [
    { key: 'a', label: 'činu upřímně litoval', aliases: ['lítost'], keywords: ['litoval', 'litost'] },
    { key: 'b', label: 'překročená nutná obrana', aliases: [], keywords: ['nutna obrana'] },
  ],
};

describe('matchEnumerationEntry — keywords', () => {
  it('matches a paraphrase containing a keyword token', () => {
    expect(matchEnumerationEntry(KW, 'pachatel toho upřímně litoval')).toBe('a');
  });
  it('keyword token is a prefix — Czech inflection matches', () => {
    expect(matchEnumerationEntry(KW, 'projevil lítost nad činem')).toBe('a');
  });
  it('multi-word keyword matches inflected phrase', () => {
    expect(matchEnumerationEntry(KW, 'bránil se nutnou obranou')).toBe('b');
  });
  it('does not match inside a word (no substring match)', () => {
    const q: LawEnumeration = { ...KW, expected: [{ key: 'x', label: 'lest', keywords: ['lest'] }] };
    expect(matchEnumerationEntry(q, 'cítil bolest')).toBeNull();
  });
  it('exact alias of another item wins over keyword containment', () => {
    const q: LawEnumeration = {
      ...KW,
      expected: [
        { key: 'a', label: 'aaa', keywords: ['litost'] },
        { key: 'b', label: 'lítost', aliases: [] },
      ],
    };
    expect(matchEnumerationEntry(q, 'lítost')).toBe('b');
  });
});

describe('keywordMatches', () => {
  it('prefix-run match', () => {
    expect(keywordMatches('branil se nutnou obranou', 'nutna obrana')).toBe(true);
  });
  it('non-consecutive tokens do not match', () => {
    expect(keywordMatches('nutna byla jeho obrana', 'nutna obrana')).toBe(false);
  });
});
```

Importy doplnit: `import { keywordMatches, matchEnumerationEntry, matchOrdered } from './matchEnumeration';`

- [ ] **Step 2: Ověřit fail**

Run: `npx vitest run src/modules/law/logic/matchEnumeration.test.ts`
Expected: FAIL — `keywordMatches` neexistuje, keyword testy padají.

- [ ] **Step 3: Implementace**

`src/modules/law/data/types.ts` — rozšířit `LawExpected`:

```ts
export interface LawExpected {
  key: string;
  label: string;
  aliases?: string[];
  /** Kmenová klíčová slova pro tolerantní match parafrází (prefix-run po normalize). */
  keywords?: string[];
  subId?: string;
}
```

`src/modules/law/logic/matchEnumeration.ts` — přidat `keywordMatches` a keyword pass:

```ts
export function keywordMatches(normInput: string, keyword: string): boolean {
  const kwTokens = normalize(keyword).split(' ').filter(Boolean);
  if (kwTokens.length === 0) return false;
  const inTokens = normInput.split(' ').filter(Boolean);
  outer: for (let i = 0; i + kwTokens.length <= inTokens.length; i++) {
    for (let j = 0; j < kwTokens.length; j++) {
      if (!inTokens[i + j]!.startsWith(kwTokens[j]!)) continue outer;
    }
    return true;
  }
  return false;
}

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
  for (const e of question.expected) {
    for (const kw of e.keywords ?? []) {
      if (keywordMatches(norm, kw)) return e.key;
    }
  }
  return null;
}
```

- [ ] **Step 4: Ověřit pass**

Run: `npx vitest run src/modules/law/logic/matchEnumeration.test.ts`
Expected: PASS.

- [ ] **Step 5: Kolizní validace v questions.test.ts**

Do `src/modules/law/data/questions.test.ts`, describe `enumeration`, přidat (import `keywordMatches` z `../logic/matchEnumeration`):

```ts
it('keywords have tokens of at least 3 chars after normalize', () => {
  for (const q of LAW_QUESTIONS) {
    if (q.kind !== 'enumeration') continue;
    for (const e of q.expected) {
      for (const kw of e.keywords ?? []) {
        for (const token of normalize(kw).split(' ').filter(Boolean)) {
          expect(token.length, `${q.id}/${e.key}: keyword "${kw}"`).toBeGreaterThanOrEqual(3);
        }
      }
    }
  }
});

it('keywords do not collide with other items in the same question', () => {
  for (const q of LAW_QUESTIONS) {
    if (q.kind !== 'enumeration' || q.matcher !== 'alias') continue;
    for (const a of q.expected) {
      for (const kw of a.keywords ?? []) {
        for (const b of q.expected) {
          if (b.key === a.key) continue;
          const targets = [b.label, ...(b.aliases ?? []), ...(b.keywords ?? [])];
          for (const t of targets) {
            expect(
              keywordMatches(normalize(t), kw),
              `${q.id}: keyword "${kw}" (${a.key}) matchuje "${t}" (${b.key})`,
            ).toBe(false);
          }
        }
      }
    }
  }
});
```

Run: `npx vitest run src/modules/law/data/questions.test.ts`
Expected: PASS (dataset zatím žádné keywords nemá — validace projde naprázdno).

- [ ] **Step 6: Commit**

```bash
git add src/modules/law/data/types.ts src/modules/law/logic/matchEnumeration.ts src/modules/law/logic/matchEnumeration.test.ts src/modules/law/data/questions.test.ts
git commit -m "feat(law): keyword matching pro alias enumerace (prefix-run tokeny)"
```

---

### Task 2: Oprava Enter algoritmu v EnumerationInput (Gotcha 17)

**Files:**
- Modify: `src/modules/law/components/EnumerationInput.tsx` (StackedInput.handleKeyDown)
- Test: `src/modules/law/components/EnumerationInput.test.tsx`

**Interfaces:**
- Consumes: `matchEnumerationEntry` (Task 1 — beze změny signatury).
- Produces: chování — Enter s přímou shodou commitne jedním stiskem; bez shody vyplní highlight suggestion; bez nabídky commitne raw.

- [ ] **Step 1: Failing test**

Do `EnumerationInput.test.tsx` přidat:

```ts
it('alias: Enter commits a directly matching value in one press (no suggestion fill)', () => {
  const onSubmit = vi.fn();
  render(<EnumerationInput question={ALIAS} onSubmit={onSubmit} />);
  const input = screen.getByTestId('law-enum-input');
  fireEvent.change(input, { target: { value: 'Maják' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  // hodnota se commitla jako chip, input je prázdný
  expect(screen.getByTestId('chip-correct')).toBeInTheDocument();
  expect((input as HTMLInputElement).value).toBe('');
});
```

- [ ] **Step 2: Ověřit fail**

Run: `npx vitest run src/modules/law/components/EnumerationInput.test.tsx`
Expected: FAIL — Enter vyplní suggestion „Maják" místo commitu (input není prázdný, chip nevznikl).

- [ ] **Step 3: Implementace**

V `StackedInput.handleKeyDown` nahradit Enter větev:

```ts
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
```

- [ ] **Step 4: Ověřit pass**

Run: `npx vitest run src/modules/law/components/EnumerationInput.test.tsx`
Expected: PASS (včetně existujících testů).

- [ ] **Step 5: Commit**

```bash
git add src/modules/law/components/EnumerationInput.tsx src/modules/law/components/EnumerationInput.test.tsx
git commit -m "fix(law): Enter commitne primou shodu jednim stiskem (Gotcha 17 pattern)"
```

---

### Task 3: Ordered enumerace přes chip input

**Files:**
- Modify: `src/modules/law/logic/matchEnumeration.ts` (matchOrdered — nová signatura)
- Modify: `src/modules/law/components/EnumerationInput.tsx` (smazat OrderedInput, ordered mód ve StackedInput)
- Modify: `src/modules/law/components/AnswerRow.tsx` (status `pending`)
- Modify: `src/styles/index.css` (`.answer-row--pending`)
- Test: `src/modules/law/logic/matchEnumeration.test.ts`, `src/modules/law/components/EnumerationInput.test.tsx`, `src/modules/law/components/AnswerRow.test.tsx`

**Interfaces:**
- Consumes: `CommittedEntry.matchedKey` ze StackedInput; `AnswerEntry` z `AnswerList.tsx` (beze změny).
- Produces: `matchOrdered(question: LawQuestion, matchedKeys: readonly (string | null)[]): boolean`; `AnswerStatus` rozšířen o `'pending'` (ikona `·`, testid `chip-pending`); testidy `law-enum-order-input`/`law-enum-order-submit` ZANIKAJÍ — ordered otázky používají `law-enum-input`/`law-enum-add`/`law-enum-submit`.

Chování ordered módu: položky se commitují postupně chip inputem (autocomplete a keyword matching fungují stejně jako u unordered). Během `answering` jsou chipy **neutrální** (`pending` — bez correct/wrong), protože živý feedback by prozradil obsah. Po Vyhodnotit: chip na pozici i je `correct`, když `entries[i].matchedKey === expected[i].key`, jinak `wrong` s meta `správně: <expected[i].label>`; entry navíc (za koncem expected) je `wrong` s meta `navíc`; chybějící pozice jsou `missed`.

- [ ] **Step 1: Failing testy matchOrdered (nová signatura)**

V `matchEnumeration.test.ts` NAHRADIT stávající `matchOrdered` testy:

```ts
const ORDERED: LawEnumeration = {
  id: 'o', source: 'sasp', theme: 'hodnosti', prompt: 'p',
  kind: 'enumeration', matcher: 'alias', ordered: true,
  expected: [{ key: 'cap', label: 'Captain' }, { key: 'cad', label: 'Cadet' }],
};

describe('matchOrdered', () => {
  it('true when matched keys align with expected order', () => {
    expect(matchOrdered(ORDERED, ['cap', 'cad'])).toBe(true);
  });
  it('false on wrong order', () => {
    expect(matchOrdered(ORDERED, ['cad', 'cap'])).toBe(false);
  });
  it('false on missing or extra entries', () => {
    expect(matchOrdered(ORDERED, ['cap'])).toBe(false);
    expect(matchOrdered(ORDERED, ['cap', 'cad', 'cap'])).toBe(false);
  });
  it('false on unmatched entry', () => {
    expect(matchOrdered(ORDERED, ['cap', null])).toBe(false);
  });
});
```

- [ ] **Step 2: Ověřit fail**

Run: `npx vitest run src/modules/law/logic/matchEnumeration.test.ts`
Expected: FAIL (stará signatura bere rawLines).

- [ ] **Step 3: Implementovat matchOrdered**

```ts
export function matchOrdered(
  question: LawQuestion,
  matchedKeys: readonly (string | null)[],
): boolean {
  if (question.kind !== 'enumeration' || !question.ordered) return false;
  if (matchedKeys.length !== question.expected.length) return false;
  return question.expected.every((e, i) => matchedKeys[i] === e.key);
}
```

Run: `npx vitest run src/modules/law/logic/matchEnumeration.test.ts` → PASS.

- [ ] **Step 4: AnswerRow `pending` status**

`AnswerRow.tsx`:

```ts
export type AnswerStatus = 'correct' | 'duplicate' | 'wrong' | 'missed' | 'pending';

const ICON: Record<AnswerStatus, string> = {
  correct: '✓',
  duplicate: '⊘',
  wrong: '✗',
  missed: '○',
  pending: '·',
};

const ROW_CLASS: Record<AnswerStatus, string> = {
  correct: 'answer-row--correct',
  duplicate: 'answer-row--duplicate',
  wrong: 'answer-row--wrong',
  missed: 'answer-row--missed',
  pending: 'answer-row--pending',
};
```

`src/styles/index.css` — vedle ostatních `.answer-row--*` variant přidat neutrální styl (převzít vizuální jazyk existujících variant, tlumené provedení bez sémantické barvy):

```css
.answer-row--pending {
  @apply border-sasp-navy-light bg-sasp-bg/40 text-sasp-ink;
}
```

Do `AnswerRow.test.tsx` přidat test:

```ts
it('renders pending status with neutral icon', () => {
  render(<ul><AnswerRow status="pending" text="Captain" /></ul>);
  expect(screen.getByTestId('chip-pending')).toHaveTextContent('Captain');
});
```

Run: `npx vitest run src/modules/law/components/AnswerRow.test.tsx` → PASS.

- [ ] **Step 5: Failing testy ordered chip flow**

V `EnumerationInput.test.tsx` NAHRADIT oba `ordered:` testy (textarea flow) tímto:

```ts
it('ordered: committing items in correct order then submit is perfect', () => {
  const onSubmit = vi.fn();
  render(<EnumerationInput question={ORDER} onSubmit={onSubmit} />);
  const input = screen.getByTestId('law-enum-input');
  for (const v of ['Captain', 'Cadet']) {
    fireEvent.change(input, { target: { value: v } });
    fireEvent.click(screen.getByTestId('law-enum-add'));
  }
  // behem answering jsou chipy neutralni
  expect(screen.getAllByTestId('chip-pending')).toHaveLength(2);
  expect(screen.queryByTestId('chip-correct')).toBeNull();
  fireEvent.click(screen.getByTestId('law-enum-submit'));
  expect(onSubmit).toHaveBeenCalledWith({ perfect: true });
  expect(screen.getAllByTestId('chip-correct')).toHaveLength(2);
});

it('ordered: wrong order is not perfect and reveals expected labels', () => {
  const onSubmit = vi.fn();
  render(<EnumerationInput question={ORDER} onSubmit={onSubmit} />);
  const input = screen.getByTestId('law-enum-input');
  for (const v of ['Cadet', 'Captain']) {
    fireEvent.change(input, { target: { value: v } });
    fireEvent.click(screen.getByTestId('law-enum-add'));
  }
  fireEvent.click(screen.getByTestId('law-enum-submit'));
  expect(onSubmit).toHaveBeenCalledWith({ perfect: false });
  expect(screen.getAllByTestId('chip-wrong')).toHaveLength(2);
});

it('ordered: missing tail positions are revealed as missed', () => {
  const onSubmit = vi.fn();
  render(<EnumerationInput question={ORDER} onSubmit={onSubmit} />);
  const input = screen.getByTestId('law-enum-input');
  fireEvent.change(input, { target: { value: 'Captain' } });
  fireEvent.click(screen.getByTestId('law-enum-add'));
  fireEvent.click(screen.getByTestId('law-enum-submit'));
  expect(onSubmit).toHaveBeenCalledWith({ perfect: false });
  expect(screen.getByTestId('chip-missed')).toHaveTextContent('Cadet');
});
```

Run: `npx vitest run src/modules/law/components/EnumerationInput.test.tsx`
Expected: FAIL — ordered renderuje textarea, `law-enum-input` neexistuje.

- [ ] **Step 6: Implementace ve StackedInput + smazání OrderedInput**

V `EnumerationInput.tsx`:

1. Smazat celou funkci `OrderedInput` a zjednodušit public komponentu:

```tsx
export function EnumerationInput({ question, onSubmit }: Props) {
  return <StackedInput question={question} onSubmit={onSubmit} />;
}
```

2. Ve `StackedInput` zavést `const isOrdered = question.ordered === true;` a upravit `handleSubmit`:

```ts
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
```

(import `matchOrdered` z `../logic/matchEnumeration`.)

3. Build `answerEntries` větvený dle `isOrdered`:

```ts
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
        answerEntries.push({ key: `missed-${ex.key}`, status: 'missed', text: ex.label });
      }
    }
  }
}
```

- [ ] **Step 7: Ověřit pass + žádné mrtvé testidy**

Run: `npx vitest run src/modules/law/components/ src/modules/law/logic/`
Expected: PASS.

Run: `grep -rn "law-enum-order" src/ e2e/`
Expected: žádný výskyt (pokud něco najde, opravit na chip flow).

- [ ] **Step 8: Commit**

```bash
git add src/modules/law/components/EnumerationInput.tsx src/modules/law/components/EnumerationInput.test.tsx src/modules/law/components/AnswerRow.tsx src/modules/law/components/AnswerRow.test.tsx src/modules/law/logic/matchEnumeration.ts src/modules/law/logic/matchEnumeration.test.ts src/styles/index.css
git commit -m "feat(law): ordered enumerace pres chip input, matchOrdered nad matched keys"
```

---

### Task 4: Statická instrukce dle matcheru

**Files:**
- Modify: `src/modules/law/components/EnumerationInput.tsx` (hint paragraph ve StackedInput)
- Test: `src/modules/law/components/EnumerationInput.test.tsx`

**Interfaces:**
- Consumes: `question.matcher`, `question.ordered`.
- Produces: hint text pod inputem (stávající element `answer-input__hint`), testid `law-enum-hint`.

- [ ] **Step 1: Failing test**

```ts
it('shows paragraph-format hint for paragraph matcher questions', () => {
  const PARA: LawEnumeration = {
    id: 'pq', source: 'penal', theme: 'paragrafy', prompt: 'p',
    kind: 'enumeration', matcher: 'paragraph',
    expected: [{ key: '33', label: '§33' }],
  };
  render(<EnumerationInput question={PARA} onSubmit={vi.fn()} />);
  expect(screen.getByTestId('law-enum-hint').textContent).toContain('§25b');
});

it('shows order hint for ordered questions', () => {
  render(<EnumerationInput question={ORDER} onSubmit={vi.fn()} />);
  expect(screen.getByTestId('law-enum-hint').textContent).toContain('pořadí');
});
```

Run: `npx vitest run src/modules/law/components/EnumerationInput.test.tsx` → FAIL (testid neexistuje).

- [ ] **Step 2: Implementace**

Ve `StackedInput` nahradit stávající `<p className="answer-input__hint">…</p>`:

```tsx
const hint =
  question.matcher === 'paragraph'
    ? 'Zadávej paragrafy ve formátu §25b — na písmenu subu záleží. Uveď všechny, které se na situaci vztahují. Enter potvrdí položku, Vyhodnotit otázku uzavře odpověď.'
    : isOrdered
      ? 'Zadávej položky postupně ve správném pořadí — každou potvrď Enterem. Po dokončení klikni Vyhodnotit otázku.'
      : 'Piš vlastními slovy — každou položku potvrď Enterem. Po vyjmenování všeho klikni Vyhodnotit otázku.';
```

```tsx
<p className="answer-input__hint" data-testid="law-enum-hint">{hint}</p>
```

- [ ] **Step 3: Ověřit pass**

Run: `npx vitest run src/modules/law/components/EnumerationInput.test.tsx` → PASS.

- [ ] **Step 4: Commit**

```bash
git add src/modules/law/components/EnumerationInput.tsx src/modules/law/components/EnumerationInput.test.tsx
git commit -m "feat(law): staticka instrukce pod enum inputem dle matcheru"
```

---

### Task 5: Shuffle choice možností

**Files:**
- Modify: `src/modules/law/components/ChoiceInput.tsx` (prop `order`)
- Modify: `src/modules/law/components/LawPage.tsx` (permutace + reveal)
- Modify: `src/modules/law/components/ChoiceInput.test.tsx`
- Modify: `src/modules/law/components/LawPage.test.tsx` (výběr dle textu)
- Modify: `e2e/law/quiz-flow.spec.ts` (výběr dle textu, import LAW_QUESTIONS)

**Interfaces:**
- Consumes: `shuffle<T>(items: readonly T[]): T[]` z `@/shared/rng` (existuje, seedovaný).
- Produces: `ChoiceInput` props `{ question: LawChoice; order: number[]; onSubmit: (selected: number[], correct: boolean) => void }` — `order[pozice] = původní index`, `onSubmit` dostává PŮVODNÍ indexy (matchChoice beze změny). Testid `law-choice-option-<pozice>` = zobrazená pozice. `LawPage` počítá `choiceOrder` v `useMemo` klíčovaném `current` a používá ho v answering i reveal.

- [ ] **Step 1: Failing test remapu v ChoiceInput**

V `ChoiceInput.test.tsx` upravit všechny rendery na explicitní `order` a přidat remap test:

```tsx
const IDENTITY = [0, 1, 2, 3, 4];

// stávající testy: doplnit order={IDENTITY} do <ChoiceInput question={Q} ... />

it('renders options in the given order and maps clicks back to original indices', () => {
  const onSubmit = vi.fn();
  render(<ChoiceInput question={Q} order={[4, 3, 2, 1, 0]} onSubmit={onSubmit} />);
  // pozice 0 zobrazuje původní option 4 ("E")
  expect(screen.getByTestId('law-choice-option-0')).toHaveTextContent('E');
  // klik na pozice 4 a 2 → původní indexy 0 a 2 (correctIndices)
  fireEvent.click(screen.getByTestId('law-choice-option-4'));
  fireEvent.click(screen.getByTestId('law-choice-option-2'));
  fireEvent.click(screen.getByTestId('law-choice-submit'));
  expect(onSubmit).toHaveBeenCalledWith([0, 2], true);
});

it('digit keys toggle by displayed position', () => {
  const onSubmit = vi.fn();
  render(<ChoiceInput question={Q} order={[4, 3, 2, 1, 0]} onSubmit={onSubmit} />);
  fireEvent.keyDown(window, { key: '5' }); // pozice 5 → původní index 0
  fireEvent.keyDown(window, { key: '3' }); // pozice 3 → původní index 2
  fireEvent.click(screen.getByTestId('law-choice-submit'));
  expect(onSubmit).toHaveBeenCalledWith([0, 2], true);
});
```

Run: `npx vitest run src/modules/law/components/ChoiceInput.test.tsx` → FAIL (prop `order` neexistuje).

- [ ] **Step 2: Implementace ChoiceInput**

```tsx
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
```

Run: `npx vitest run src/modules/law/components/ChoiceInput.test.tsx` → PASS.

- [ ] **Step 3: LawPage — permutace + reveal**

V `LawPage.tsx` nad early-returny (hned za `const items = useMemo(...)`):

```tsx
const choiceOrder = useMemo(() => {
  if (!current || current.kind !== 'choice') return null;
  return shuffle(current.options.map((_, i) => i));
}, [current]);
```

(import `shuffle` z `@/shared/rng`.)

Answering:

```tsx
{current.kind === 'choice' && !revealed && (
  <ChoiceInput
    key={current.id}
    question={current as LawChoice}
    order={choiceOrder!}
    onSubmit={handleChoiceSubmit}
  />
)}
```

Reveal blok — iterovat permutaci místo `options.map`:

```tsx
{(choiceOrder ?? []).map((origIdx, pos) => {
  const opt = (current as LawChoice).options[origIdx]!;
  const isCorrectOpt = (current as LawChoice).correctIndices.includes(origIdx);
  const isChosen = choiceResult.selected.includes(origIdx);
  return (
    <li key={origIdx}>
      {/* stávající markup beze změny, jen kbd zobrazuje pos + 1 a text opt */}
    </li>
  );
})}
```

(V kbd nahradit `{idx + 1}` za `{pos + 1}`; tělo jinak identické se stávajícím reveal markupem.)

- [ ] **Step 4: LawPage.test.tsx — výběr dle textu**

Nahradit index-based kliky v choice testech:

```tsx
import type { LawChoice } from '../data/types';

function choiceQuestion(id: string): LawChoice {
  return LAW_QUESTIONS.find((q) => q.id === id) as LawChoice;
}

function optionButtonByText(text: string): HTMLElement {
  const buttons = screen.getAllByTestId(/law-choice-option-/);
  const hit = buttons.find((b) => (b.textContent ?? '').includes(text));
  if (!hit) throw new Error(`option not found: ${text}`);
  return hit;
}
```

Test „reveals success": kliknout na VŠECHNY správné texty (multi-correct safe):

```tsx
const q = choiceQuestion(CHOICE_ID);
for (const i of q.correctIndices) {
  await user.click(optionButtonByText(q.options[i]!));
}
await user.click(screen.getByTestId('law-choice-submit'));
```

Test „reveals wrong": kliknout na první NEsprávný text:

```tsx
const q = choiceQuestion(CHOICE_ID);
const wrongText = q.options.find((_, i) => !q.correctIndices.includes(i))!;
await user.click(optionButtonByText(wrongText));
await user.click(screen.getByTestId('law-choice-submit'));
```

Run: `npx vitest run src/modules/law/components/LawPage.test.tsx` → PASS.

- [ ] **Step 5: E2E quiz-flow — výběr dle textu**

V `e2e/law/quiz-flow.spec.ts` importovat dataset (stejný pattern jako `CODES` v seed.ts):

```ts
import { LAW_QUESTIONS } from '../../src/modules/law/data/questions';
import type { LawChoice } from '../../src/modules/law/data/types';

const choiceQ = LAW_QUESTIONS.find((q) => q.id === CHOICE_ID) as LawChoice;
```

Test „correct choice…":

```ts
const options = page.getByTestId('law-choice-options').locator('button');
for (const i of choiceQ.correctIndices) {
  await options.filter({ hasText: choiceQ.options[i]! }).click();
}
await page.getByTestId('law-choice-submit').click();
```

Test „wrong choice…":

```ts
const options = page.getByTestId('law-choice-options').locator('button');
const wrongText = choiceQ.options.find((_, i) => !choiceQ.correctIndices.includes(i))!;
await options.filter({ hasText: wrongText }).click();
await page.getByTestId('law-choice-submit').click();
```

(`options` lokátor definovat v každém testu zvlášť.)

Test „next button…": stejná změna jako „correct choice". Test „index route…" beze změny (option-0 existuje vždy).

Zkontrolovat, že žádný jiný spec nekliká choice možnosti podle indexu:

Run: `grep -rn "law-choice-option" e2e/`
Expected: výskyty jen v `quiz-flow.spec.ts` (pokud jinde, upravit stejným výběrem dle textu).

Run: `npm run test:e2e -- e2e/law/`
Expected: PASS (25 testů).

- [ ] **Step 6: Celé unit testy + commit**

Run: `npm test`
Expected: PASS.

```bash
git add src/modules/law/components/ChoiceInput.tsx src/modules/law/components/ChoiceInput.test.tsx src/modules/law/components/LawPage.tsx src/modules/law/components/LawPage.test.tsx e2e/law/quiz-flow.spec.ts
git commit -m "feat(law): shuffle poradi choice moznosti pri zobrazeni"
```

---

### Task 6: Data — převod „Přelož rádiové hlášení" na choice

**Files:**
- Modify: `src/modules/law/data/questions.ts` (`sasp.text.rto.1` → `sasp.choice.rto.4`)
- Modify: `e2e/fixtures/seed.ts` (rename v `SASP_QUESTION_IDS`)

**Interfaces:**
- Produces: otázka `sasp.choice.rto.4` (kind `choice`). ID `sasp.text.rto.1` zaniká. Counts beze změny (94 SASP).

- [ ] **Step 1: Nahradit otázku v questions.ts**

Smazat literál `sasp.text.rto.1` a na jeho místo vložit:

```ts
{
  id: 'sasp.choice.rto.4',
  source: 'sasp',
  theme: 'rto',
  title: 'Překlad rádiového hlášení',
  kind: 'choice',
  prompt: 'Co hlášení znamená?',
  scenario: 'Na kanálu 1 zazní: „Tom-1, William-44, 10-11 Route 68, 10-32 pozitivní."',
  options: [
    'Detektiv č. 44 hlásí dispečinku dopravní kontrolu na Route 68, osoba je ozbrojena',
    'Detektiv č. 44 hlásí dispečinku pronásledování na Route 68, osoba je ozbrojena',
    'Uniformovaná dvojice č. 44 hlásí dopravní kontrolu na Route 68, osoba je ozbrojena',
    'Detektiv č. 44 hlásí dispečinku dopravní kontrolu na Route 68 a žádá posily',
    'Detektiv č. 44 hlásí dispečinku dopravní kontrolu na Route 68, osoba je pod vlivem',
  ],
  correctIndices: [0],
  note: 'William je volací znak DBI (detektiv). 10-11 = dopravní kontrola, 10-32 pozitivní = osoba je ozbrojená. Pronásledování je 10-80, posily se žádají jinak.',
},
```

(Distraktory záměrně mění vždy jeden prvek dekódování: špatný kód, špatný volací znak, špatný význam 10-32 — přesně typ záměny, kterou modul učí.)

- [ ] **Step 2: Sync seed.ts**

V `SASP_QUESTION_IDS` nahradit `'sasp.text.rto.1'` za `'sasp.choice.rto.4'`.

- [ ] **Step 3: Testy**

Run: `npx vitest run src/modules/law/data/questions.test.ts && npm test`
Expected: PASS (counts nezměněny — 94 SASP, 139 total).

- [ ] **Step 4: Commit**

```bash
git add src/modules/law/data/questions.ts e2e/fixtures/seed.ts
git commit -m "feat(law)!: radiovy preklad z netrefitelneho textu na choice"
```

---

### Task 7: Data — pročištění triviálních jednani otázek

**Files:**
- Modify: `src/modules/law/data/questions.ts`
- Modify: `src/modules/law/data/questions.test.ts` (counts 94→92, 139→137)
- Modify: `e2e/fixtures/seed.ts`

**Interfaces:**
- Produces: ZANIKAJÍ `sasp.choice.jednani.2`, `sasp.choice.jednani.4`, `sasp.choice.jednani.5`. VZNIKÁ `sasp.scenario.jednani.2`. SASP = 92, total = 137.

Zdůvodnění: `jednani.2` (k čemu badge number) je duplicitní s `jednani.1` + `scenario.jednani.1` a odpověď je uhodnutelná. `jednani.4` (zaklepat) a `jednani.5` (zdravit nejvyšší hodnost) jsou dvě triviální etiketové otázky — sloučeny do jedné scénkové otázky testující celý postup pořadové přípravy najednou.

- [ ] **Step 1: Smazat 3 otázky, přidat scénku**

Smazat literály `sasp.choice.jednani.2`, `sasp.choice.jednani.4`, `sasp.choice.jednani.5`. Na místo `jednani.4` vložit:

```ts
{
  id: 'sasp.scenario.jednani.2',
  source: 'sasp',
  theme: 'jednani',
  title: 'Pořadová příprava — vstup a pozdrav',
  kind: 'choice',
  prompt: 'Jak Trooper správně postupuje?',
  scenario: 'Trooper nese hlášení do kanceláře velitele. Dveře jsou zavřené; uvnitř spolu hovoří Lieutenant, Sergeant a další Trooper.',
  options: [
    'Zaklepe, počká na vyzvání, vstoupí a pozdraví Lieutenanta',
    'Zaklepe, počká na vyzvání, vstoupí a pozdraví Sergeanta, který ho předvolal',
    'Zaklepe, vstoupí a pozdraví všechny přítomné postupně podle hodnosti',
    'Počká přede dveřmi, dokud někdo nevyjde, a hlášení předá venku',
    'Zaklepe, počká na vyzvání, vstoupí a pozdraví přítomného Troopera jako prvního',
  ],
  correctIndices: [0],
  note: 'Pořadová příprava: před vstupem zaklepat a počkat na vyzvání; v místnosti s více hodnostmi se zdraví nejvyšší přítomná hodnost (zde Lieutenant), bez ohledu na to, kdo předvolal.',
},
```

- [ ] **Step 2: Counts v questions.test.ts**

```ts
expect(bySource('sasp')).toHaveLength(92);
expect(LAW_QUESTIONS).toHaveLength(137);
```

- [ ] **Step 3: Sync seed.ts**

V `SASP_QUESTION_IDS`: odstranit `'sasp.choice.jednani.2'`, `'sasp.choice.jednani.4'`, `'sasp.choice.jednani.5'`; přidat `'sasp.scenario.jednani.2'` (za `'sasp.scenario.jednani.1'`). Komentář `// SASP (94)` v `LAW_QUESTION_IDS` opravit na `// SASP (92)`.

- [ ] **Step 4: Testy + commit**

Run: `npm test && npm run test:e2e -- e2e/law/`
Expected: PASS.

```bash
git add src/modules/law/data/questions.ts src/modules/law/data/questions.test.ts e2e/fixtures/seed.ts
git commit -m "feat(law)!: slouceni trivialnich jednani otazek do scenky poradove pripravy"
```

---

### Task 8: Data — pročištění samoprozrazujících match párů

**Files:**
- Modify: `src/modules/law/data/questions.ts` (`sasp.match.hodnosti.callsigns`)

- [ ] **Step 1: Odstranit 3 páry**

Z `sasp.match.hodnosti.callsigns.pairs` smazat páry `Air Unit → Air`, `Marine Division → Ocean`, `Park Rangers → Ranger` (pravá strana je obsažena v levé — pár je zadarmo). Zůstává 6 párů: SWAT/David, DBI/William, Canine/Charlie, GIU/George, TEU/Sierra, Motorbike/Marry.

- [ ] **Step 2: Testy + commit**

Run: `npx vitest run src/modules/law/data/questions.test.ts && npx vitest run src/modules/law/components/MatchInput.test.tsx`
Expected: PASS (match validace vyžaduje ≥3 páry, máme 6).

```bash
git add src/modules/law/data/questions.ts
git commit -m "fix(law): odstraneni samoprozrazujicich paru z match volacich znaku"
```

---

### Task 9: Data — keywords pro alias enumerace

**Files:**
- Modify: `src/modules/law/data/questions.ts` (17 LEA enumerací + `sasp.enum.zasah.felony-order`)

**Interfaces:**
- Consumes: `keywords` sémantiku z Tasku 1 (prefix-run tokeny, min 3 znaky, kolizní validace).

Pravidla autorování keywords (platí pro každou položku):

1. Keyword je KMEN charakteristického slova položky — tak, aby prefix match pokryl české pády/rody: `'stejnokroj'` (stejnokrojem, stejnokroje), `'uniform'` (uniforma, uniformou), `'odznak'`, `'litoval'` + `'litost'`.
2. Víceslovné keywords pro položky rozlišené spojením — každý token musí být SKUTEČNÝ společný kmen všech pádů: `'nutn obran'` (matchne „nutná obrana" i „nutnou obranou" — POZOR, `'nutna obrana'` by „nutnou obranou" NEmatchlo, `'nutnou'.startsWith('nutna')` je false), `'krajni nouz'`.
3. Keyword musí být jednoznačný V RÁMCI OTÁZKY — nesmí matchovat label/alias/keyword jiné položky (hlídá test z Tasku 1). Kde se položky liší jen doplňkem (např. lea.10 „závislost/podřízenost" vs. lea.11 „využití závislosti" — jiná otázka, kolize nehrozí), volit delší kmen.
4. Žádné keyword pro položky, kde je vyžadována přesnost (řadové názvy hodností v `sasp.enum.hodnosti.ladder` keywords NEDOSTANOU — přesný název je smyslem otázky).
5. 1–4 keywords na položku; pokrýt hlavní podstatné jméno a sloveso parafráze.

Kompletní vzor pro `lea.7` (aplikovat stejný postup na zbylých 16 LEA otázek a felony-order):

```ts
expected: [
  {
    key: 'lea.7.A.1a',
    label: 'stejnokrojem',
    aliases: ['stejnokroj', 'stejnokroje', 'stejnokrojem', 'uniforma', 'uniformou', 'uniformy'],
    keywords: ['stejnokroj', 'uniform'],
  },
  {
    key: 'lea.7.A.2a',
    label: 'odznakem',
    aliases: ['odznak', 'odznakem', 'odznaky', 'badge', 'badgem'],
    keywords: ['odznak', 'badge'],
  },
  {
    key: 'lea.7.A.3a',
    label: 'ústním zvoláním',
    aliases: ['ústní zvolání', 'ústním zvoláním', 'zvolání', 'zvoláním', 'ústně', 'slovně', 'slovem', 'verbálně'],
    keywords: ['zvolan', 'ustn', 'slovn', 'verbaln'],
  },
],
```

Pozn.: `'ustn'`/`'slovn'` mají 4 znaky po normalize — validace vyžaduje ≥3.

Pro `sasp.enum.zasah.felony-order`: keywords `['ridic']` (položka 1), `['predni']` (položka 2), `['zadni lev', 'levy zadni']` (položka 3), `['zadni prav', 'pravy zadni']` (položka 4). POZOR na dvě pasti: (a) `'spolujezd'` pro položku 2 NEPOUŽÍT — matchoval by i alias „za spolujezdcem" položky 4 (kolizní test to zachytí); (b) víceslovné keywords s předložkou typu `'za ridic'` NEPOUŽÍT — token `'za'` má 2 znaky a padne na min-length validaci (≥3). Položky 2–4 se jinak spoléhají na existující aliasy.

- [ ] **Step 1: Doplnit keywords do lea.7 dle vzoru výše**

- [ ] **Step 2: Doplnit keywords do zbylých 16 LEA otázek**

Postupovat otázku po otázce (`lea.9.A`, `lea.9.B`, `lea.10`, `lea.11`, `lea.12.A`, `lea.12.C`, `lea.15`, `lea.16.B`, `lea.17.A`, `lea.18.A`, `lea.19.A`, `lea.21.A`, `lea.23.B`, `lea.37`, `lea.zbrojni-prukaz`, `lea.ridicsky-prukaz`). Pro každou položku vybrat kmeny z labelu a existujících aliasů dle pravidel 1–5. Po každé otázce spustit kolizní validaci.

- [ ] **Step 3: Doplnit keywords do felony-order (viz pozn. výše), hodnosti.ladder přeskočit**

- [ ] **Step 4: Testy**

Run: `npx vitest run src/modules/law/data/questions.test.ts src/modules/law/logic/`
Expected: PASS — kolizní i min-length validace zelené.

- [ ] **Step 5: Commit**

```bash
git add src/modules/law/data/questions.ts
git commit -m "feat(law): keywords pro tolerantni match parafrazi v alias enumeracich"
```

---

### Task 10: Data — revize choice distraktorů, dávka A (pojmy, hodnosti, jednani, rto)

**Files:**
- Modify: `src/modules/law/data/questions.ts`

**Interfaces:**
- Consumes: `docs/sasp-manual.md` (zdroj pravdy pro fakta; číst příslušné sekce PŘED úpravou otázek).
- Produces: revidované otázky, ID/theme/kind beze změny.

Pravidla revize distraktorů (platí pro všechny dávky A–D):

1. Každý distraktor musí být věrohodná záměna: sousední pravidlo z příručky, častá chyba, špatná hodnota ze STEJNÉHO systému (jiný reálný volací znak, jiná reálná vzdálenost/lhůta, sousední hodnost).
2. ŽÁDNÉ vtipy, absurdity ani očividně neprofesionální jednání jako možnost („aby nevyzradil svou polohu", „aby nikdo nebyl opomenut").
3. Distraktor musí být dle příručky JEDNOZNAČNĚ špatně — žádná diskutabilní šeď.
4. Stejná gramatická forma a délka jako správná odpověď (délkový leak: nejdelší možnost nesmí být systematicky správná).
5. Kde příručka dává vícedílné pravidlo, udělat 2–3 `correctIndices` — cíl aspoň 15 multi-correct otázek napříč dávkami A–D.
6. `note` aktualizovat, pokud vysvětluje distraktory.
7. Anti-leak: parafráze, nikdy doslovné znění z reálného testu.
8. Pořadí správné odpovědi v datech NEřešit (shuffle z Tasku 5 to řeší při zobrazení) — ale nový text psát přirozeně, ne „správná první".

Kompletní vzor — `sasp.choice.jednani.1` (aplikovat stejný přístup na ostatní):

```ts
{
  id: 'sasp.choice.jednani.1',
  source: 'sasp',
  theme: 'jednani',
  title: 'Sdělení badge number civilistovi',
  kind: 'choice',
  prompt: 'Co musí příslušník s.o.s. sdělit civilistovi, pokud si to vyžádá?',
  options: [
    'Číslo svého odznaku (badge number)',
    'Své jméno a příjmení',
    'Své jméno, příjmení i badge number',
    'Svou hodnost a domovskou divizi',
    'Badge number svůj a všech příslušníků na místě',
  ],
  correctIndices: [0],
  note: 'Povinné je sdělit pouze vlastní badge number. Jméno ani příjmení povinné není; badge number kolegů je zakázáno sdělovat.',
},
```

(Každý distraktor = reálná záměna: jméno místo čísla, nadmnožina, jiná identifikace, kolegové.)

- [ ] **Step 1: Načíst příslušné sekce docs/sasp-manual.md** (pojmy, hodnosti, chování příslušníka, RTO/volací znaky)

- [ ] **Step 2: Revidovat otázky dávky A**

Otázky: `sasp.choice.pojmy.1–6`, `sasp.choice.hodnosti.1`, `sasp.scenario.hodnosti.1`, `sasp.choice.jednani.1`, `sasp.scenario.jednani.1`, `sasp.choice.jednani.3`, `sasp.scenario.jednani.2` (z Tasku 7 — zkontrolovat proti pravidlům), `sasp.choice.rto.1–4`, `sasp.scenario.rto.1`. U každé projít všech 5+ možností proti pravidlům 1–8; přepsat distraktory, které jimi neprojdou.

- [ ] **Step 3: Testy + commit**

Run: `npm test`
Expected: PASS.

```bash
git add src/modules/law/data/questions.ts
git commit -m "feat(law): revize distraktoru davka A (pojmy, hodnosti, jednani, rto)"
```

---

### Task 11: Data — revize choice distraktorů, dávka B (vybava)

**Files:**
- Modify: `src/modules/law/data/questions.ts`

Otázky: `sasp.choice.vybava.1–14`. Typické záměny v této dávce: jiné reálné hodnoty (dosahy, tloušťky, počty), záměna taser/obušek/zbraň pravidel, záměna bodycam/dashcam vlastností.

Pravidla revize distraktorů (identická s Taskem 10 — opakována, protože executor vidí jen svůj task):

1. Každý distraktor = věrohodná záměna: sousední pravidlo z příručky, častá chyba, špatná hodnota ze STEJNÉHO systému.
2. ŽÁDNÉ vtipy, absurdity ani očividně neprofesionální jednání jako možnost.
3. Distraktor musí být dle příručky JEDNOZNAČNĚ špatně — žádná diskutabilní šeď.
4. Stejná gramatická forma a délka jako správná odpověď (nejdelší možnost nesmí být systematicky správná).
5. Kde příručka dává vícedílné pravidlo, udělat 2–3 `correctIndices`.
6. `note` aktualizovat, pokud vysvětluje distraktory.
7. Anti-leak: parafráze, nikdy doslovné znění z reálného testu.
8. Pořadí správné odpovědi v datech neřešit (shuffle to řeší při zobrazení).

- [ ] **Step 1: Načíst sekci výbavy v manuálu (`docs/sasp-manual.md`)**
- [ ] **Step 2: Revidovat vybava.1–14 dle pravidel výše** (u každé otázky projít všech 5+ možností; přepsat distraktory, které pravidly neprojdou)
- [ ] **Step 3: Testy + commit**

Run: `npm test` → PASS.

```bash
git add src/modules/law/data/questions.ts
git commit -m "feat(law): revize distraktoru davka B (vybava)"
```

---

### Task 12: Data — revize choice distraktorů, dávka C (zasah)

**Files:**
- Modify: `src/modules/law/data/questions.ts`

Otázky: `sasp.scenario.zasah.1–6`, `sasp.choice.zasah.1–26`. Typické záměny: postupy 10-11 vs 10-80 vs Code 5, prahové hodnosti (PIT povolení), počty jednotek, pořadí kroků při felony stopu/breachi, pravidla vyjednávání.

Pravidla revize distraktorů (identická s Taskem 10 — opakována, protože executor vidí jen svůj task):

1. Každý distraktor = věrohodná záměna: sousední pravidlo z příručky, častá chyba, špatná hodnota ze STEJNÉHO systému.
2. ŽÁDNÉ vtipy, absurdity ani očividně neprofesionální jednání jako možnost.
3. Distraktor musí být dle příručky JEDNOZNAČNĚ špatně — žádná diskutabilní šeď.
4. Stejná gramatická forma a délka jako správná odpověď (nejdelší možnost nesmí být systematicky správná).
5. Kde příručka dává vícedílné pravidlo, udělat 2–3 `correctIndices`.
6. `note` aktualizovat, pokud vysvětluje distraktory.
7. Anti-leak: parafráze, nikdy doslovné znění z reálného testu.
8. Pořadí správné odpovědi v datech neřešit (shuffle to řeší při zobrazení).

- [ ] **Step 1: Načíst sekce zásahů/pronásledování/felony stop v manuálu (`docs/sasp-manual.md`)**
- [ ] **Step 2: Revidovat zasah otázky dle pravidel výše** (u každé otázky projít všech 5+ možností; přepsat distraktory, které pravidly neprojdou)
- [ ] **Step 3: Testy + commit**

Run: `npm test` → PASS.

```bash
git add src/modules/law/data/questions.ts
git commit -m "feat(law): revize distraktoru davka C (zasah)"
```

---

### Task 13: Data — revize choice distraktorů, dávka D (zadrzeni, kriminalistika)

**Files:**
- Modify: `src/modules/law/data/questions.ts`

Otázky: `sasp.choice.zadrzeni.1–12`, `sasp.choice.kriminalistika.1–10`. Typické záměny: lhůty (3h zadržení, vazba, pokuty), instanční posloupnosti, práva zadrženého, GSR/balistika/stopy fakta.

Pravidla revize distraktorů (identická s Taskem 10 — opakována, protože executor vidí jen svůj task):

1. Každý distraktor = věrohodná záměna: sousední pravidlo z příručky, častá chyba, špatná hodnota ze STEJNÉHO systému.
2. ŽÁDNÉ vtipy, absurdity ani očividně neprofesionální jednání jako možnost.
3. Distraktor musí být dle příručky JEDNOZNAČNĚ špatně — žádná diskutabilní šeď.
4. Stejná gramatická forma a délka jako správná odpověď (nejdelší možnost nesmí být systematicky správná).
5. Kde příručka dává vícedílné pravidlo, udělat 2–3 `correctIndices`.
6. `note` aktualizovat, pokud vysvětluje distraktory.
7. Anti-leak: parafráze, nikdy doslovné znění z reálného testu.
8. Pořadí správné odpovědi v datech neřešit (shuffle to řeší při zobrazení).

- [ ] **Step 1: Načíst sekce zadržení/kriminalistiky v manuálu (`docs/sasp-manual.md`)**
- [ ] **Step 2: Revidovat zadrzeni + kriminalistika otázky dle pravidel výše** (u každé otázky projít všech 5+ možností; přepsat distraktory, které pravidly neprojdou)
- [ ] **Step 3: Testy + commit**

Run: `npm test` → PASS.

```bash
git add src/modules/law/data/questions.ts
git commit -m "feat(law): revize distraktoru davka D (zadrzeni, kriminalistika)"
```

---

### Task 14: Finální verifikace + dokumentace

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Multi-correct audit**

Run: `grep -B1 -A6 "correctIndices" src/modules/law/data/questions.ts | grep -c "^\s\+[0-9]\+,"` a spočítat otázky s 2+ správnými:

```bash
node -e "
const ts = require('fs').readFileSync('src/modules/law/data/questions.ts','utf8');
const m = ts.match(/correctIndices:\s*\[[^\]]*\]/g);
const multi = m.filter(s => (s.match(/\d+/g) ?? []).length >= 2).length;
console.log('multi-correct:', multi, '/', m.length);
"
```

Expected: multi-correct ≥ 15. Pokud méně, doplnit v příslušné dávce.

- [ ] **Step 2: Kompletní testy**

Run: `npm run test:all`
Expected: vše zelené. Poznamenat finální počty unit + E2E testů.

- [ ] **Step 3: Aktualizovat CLAUDE.md**

Změny (najít příslušné pasáže a přepsat):

1. Počty otázek: 139 → **137** (17 LEA + 28 Penal + **92 SASP**) — všude, kde se uvádí (hlavička refaktoru, sekce Teorie, SASP data, adresářová struktura).
2. SASP breakdown: „86 choice, 2 text, 2 enumeration, 4 match" → **„85 choice (včetně převedeného rádiového překladu), 1 text, 2 enumeration, 4 match"**.
3. Sekce „Law (Teorie) logika": doplnit keyword matching — `LawExpected.keywords` (kmeny, prefix-run tokeny po normalize, min 3 znaky, kolizní validace v questions.test.ts), priorita exact label/alias > keyword.
4. Sekce „Law (Teorie) UI flow": choice možnosti se míchají (`choiceOrder` v LawPage, `order` prop ChoiceInput, testid = zobrazená pozice, submit vrací původní indexy); ordered enumerace používají chip input (textarea zanikla, `law-enum-order-*` testidy neexistují); `AnswerStatus` má 5. stav `pending` (neutrální chip během ordered answering); statická instrukce `law-enum-hint` dle matcheru.
5. Gotcha 17 doplnit: platí i pro `EnumerationInput` (Enter: přímá shoda → commit, jinak fill).
6. Nová Gotcha: **E2E a unit testy choice otázek vybírají možnost podle TEXTU, ne podle indexu** (shuffle) — `LAW_QUESTIONS` se importuje přímo do specu; při změně textu options se testy přizpůsobí samy.
7. Řádek „342 unit/component + 60 E2E = 402 testů" přepsat na skutečné hodnoty z kroku 2.
8. Zmínit revizi distraktorů (pravidla: věrohodné záměny, žádné absurdity, multi-correct kde dává smysl) v sekci SASP data.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md po revizi kvality law otazek (shuffle, keywords, ordered chipy)"
```
