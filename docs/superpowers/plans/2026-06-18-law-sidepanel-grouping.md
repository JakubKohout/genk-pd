# Seskupený LawSidePanel + krátké titulky — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Postranní panel na `/law` rozdělit do rozbalovacích skupin podle tématu a chipy zkrátit na autorovaný `title` místo dlouhého promptu.

**Architecture:** Dvě nezávislé změny. (A) `LawSidePanel` seskupí filtrované chipy podle tématu do collapsible sekcí s per-téma progressem; stav rozbalení je per-session `useState<Set<LawTheme>>`, default sbaleno, auto-expand skupiny s aktivní otázkou. (B) Nové optional pole `title` na `LawBase` (+ `PenalScenario`); chip ukazuje `title` (LEA z `description`, Penal/SASP autorované) + 1znakovou značku zdroje místo theme badge.

**Tech Stack:** React 18 + TypeScript, Vitest (jsdom) + Testing Library, Playwright. Žádné nové závislosti.

---

## Soubory

- `src/modules/law/data/types.ts` — `title?: string` na `LawBase`.
- `src/modules/laws/penal/data/types.ts` — `title?: string` na `PenalScenario`.
- `src/modules/law/data/adaptLea.ts` — `title: q.description`.
- `src/modules/law/data/adaptPenal.ts` — `title: s.title`.
- `src/modules/law/components/LawPage.tsx` — `panelItems()`: `label: q.title ?? q.prompt`.
- `src/modules/law/components/LawSidePanel.tsx` — groupování + collapse + source badge.
- `src/modules/law/components/LawSidePanel.test.tsx` — přepsané testy (skupiny, collapse, badge).
- `src/modules/law/data/index.test.ts` — globální gate „každá otázka má title".
- `src/modules/laws/penal/data/scenarios.ts` — 28 `title`.
- `src/modules/law/data/sasp/{choice,text,enumeration,match}.ts` — 94 `title`.
- `src/modules/law/data/sasp/sasp.test.ts` — assert title presence.
- `e2e/law/filter.spec.ts` — rozbalit skupinu před `toBeVisible` na chipu.
- `CLAUDE.md` — krátká poznámka o `title` + seskupení panelu.

---

## Task 1: `title` plumbing (types + adaptéry + panel label)

**Files:**
- Modify: `src/modules/law/data/types.ts`
- Modify: `src/modules/laws/penal/data/types.ts`
- Modify: `src/modules/law/data/adaptLea.ts`
- Modify: `src/modules/law/data/adaptPenal.ts`
- Modify: `src/modules/law/components/LawPage.tsx:29-31`
- Test: `src/modules/law/data/index.test.ts`

- [ ] **Step 1: Napiš failing test na adaptér title**

V `src/modules/law/data/index.test.ts` přidej do existujícího `describe` blok (na konec souboru, před závěrečnou `})` top-level describe — pokud je test plochý, přidej nový `it`):

```ts
import { adaptLeaQuestions } from './adaptLea';

it('adaptLea sets title from LEA description', () => {
  const adapted = adaptLeaQuestions();
  const q = adapted.find((x) => x.id === 'lea.7');
  expect(q?.title).toBe('Prokázání příslušnosti');
});
```

- [ ] **Step 2: Spusť test — musí selhat**

Run: `npx vitest run src/modules/law/data/index.test.ts -t "title from LEA"`
Expected: FAIL — `title` je `undefined` (pole zatím neexistuje / adaptér ho nenastavuje).

- [ ] **Step 3: Přidej `title` do typů a adaptérů**

V `src/modules/law/data/types.ts` přidej do `LawBase`:

```ts
interface LawBase {
  id: string;
  source: LawSource;
  theme: LawTheme;
  prompt: string;
  /** Krátký titulek pro chip v LawSidePanel (fallback na prompt). */
  title?: string;
  ref?: string;
  note?: string;
  scenario?: string;
}
```

V `src/modules/laws/penal/data/types.ts` přidej do `PenalScenario`:

```ts
export interface PenalScenario {
  id: string;
  ref: string;
  /** Krátký titulek scénky (2–4 slova) pro chip v LawSidePanel. */
  title?: string;
  prompt: string;
  expected: ExpectedAnswer[];
  educationalNote?: string;
}
```

V `src/modules/law/data/adaptLea.ts` doplň `title` do návratu `adaptOne`:

```ts
  return {
    id: q.id,
    source: 'lea',
    theme: 'paragrafy',
    prompt: q.prompt,
    title: q.description,
    ref: q.ref,
    note: q.description,
    kind: 'enumeration',
    matcher: 'alias',
    expected: q.items.map((it) => ({ key: it.id, label: it.quote, aliases: it.aliases })),
  };
```

V `src/modules/law/data/adaptPenal.ts` doplň `title` do návratu `adaptOne` (hned za `ref`):

```ts
    ref: s.ref,
    title: s.title,
    note: s.educationalNote,
```

- [ ] **Step 4: Panel label = title ?? prompt**

V `src/modules/law/components/LawPage.tsx` uprav `panelItems` (řádek 29–31):

```ts
function panelItems(questions: readonly LawQuestion[]): LawPanelItem[] {
  return questions.map((q) => ({
    id: q.id,
    source: q.source,
    theme: q.theme,
    label: q.title ?? q.prompt,
  }));
}
```

- [ ] **Step 5: Spusť test — musí projít**

Run: `npx vitest run src/modules/law/data/index.test.ts -t "title from LEA"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/law/data/types.ts src/modules/laws/penal/data/types.ts \
  src/modules/law/data/adaptLea.ts src/modules/law/data/adaptPenal.ts \
  src/modules/law/components/LawPage.tsx src/modules/law/data/index.test.ts
git commit -m "feat(law): title field plumbing (LawBase + PenalScenario + adapters)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: LawSidePanel — seskupení podle tématu + collapse + source badge

**Files:**
- Modify: `src/modules/law/components/LawSidePanel.tsx`
- Test: `src/modules/law/components/LawSidePanel.test.tsx`

- [ ] **Step 1: Přepiš testy panelu (failing)**

Nahraď CELÝ obsah `src/modules/law/components/LawSidePanel.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ProgressEntry } from '@/shared/storage';
import type { LawPanelItem } from './LawSidePanel';
import { LawSidePanel } from './LawSidePanel';

const ITEMS: LawPanelItem[] = [
  { id: 'q1', source: 'lea', theme: 'pojmy', label: 'Prokázání příslušnosti' },
  { id: 'q2', source: 'penal', theme: 'paragrafy', label: 'Krádež vozidla' },
  { id: 'q3', source: 'sasp', theme: 'rto', label: 'Rádiový kanál' },
];

const PROGRESS: Record<string, ProgressEntry> = {
  q1: { score: 2, lastAskedAtTurn: 0 },
  q2: { score: 0, lastAskedAtTurn: 1 },
  q3: { score: -1, lastAskedAtTurn: 2 },
};

const SOURCE_FILTER = { lea: true, penal: true, sasp: true };
const THEME_FILTER = {
  pojmy: true,
  hodnosti: true,
  jednani: true,
  rto: true,
  vybava: true,
  zasah: true,
  zadrzeni: true,
  kriminalistika: true,
  paragrafy: true,
};

function renderPanel(overrides: Partial<React.ComponentProps<typeof LawSidePanel>> = {}) {
  return render(
    <LawSidePanel
      items={ITEMS}
      progress={PROGRESS}
      sourceFilter={SOURCE_FILTER}
      themeFilter={THEME_FILTER}
      onSetSource={vi.fn()}
      onSetTheme={vi.fn()}
      {...overrides}
    />,
  );
}

describe('<LawSidePanel />', () => {
  it('renders global progress percent (33%)', () => {
    renderPanel();
    // q1 clamp 2, q2 0, q3 clamp 0 → 2/6 = 33%
    expect(screen.getByTestId('law-progress-percent').textContent).toBe('33%');
  });

  it('renders global progress bar', () => {
    renderPanel();
    expect(screen.getByTestId('law-progress-bar')).toBeInTheDocument();
  });

  it('renders one group header per non-empty filtered theme', () => {
    renderPanel();
    expect(screen.getByTestId('law-group-pojmy')).toBeInTheDocument();
    expect(screen.getByTestId('law-group-paragrafy')).toBeInTheDocument();
    expect(screen.getByTestId('law-group-rto')).toBeInTheDocument();
    // téma bez položek se nerendruje
    expect(screen.queryByTestId('law-group-hodnosti')).not.toBeInTheDocument();
  });

  it('group header shows mastered/total count', () => {
    renderPanel();
    // pojmy má 1 položku (q1, score 2 = mastered)
    expect(screen.getByTestId('law-group-pojmy')).toHaveTextContent('1/1');
  });

  it('groups are collapsed by default (chips not rendered)', () => {
    renderPanel();
    expect(screen.queryByTestId('chip-q1')).not.toBeInTheDocument();
  });

  it('clicking a group header expands it (chips appear)', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByTestId('law-group-pojmy'));
    expect(screen.getByTestId('chip-q1')).toBeInTheDocument();
  });

  it('auto-expands the group containing currentId', () => {
    renderPanel({ currentId: 'q2' });
    expect(screen.getByTestId('chip-q2')).toBeInTheDocument();
    // ostatní skupiny zůstávají sbalené
    expect(screen.queryByTestId('chip-q1')).not.toBeInTheDocument();
  });

  it('chip shows source abbreviation badge', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByTestId('law-group-pojmy'));
    expect(screen.getByTestId('chip-q1')).toHaveTextContent('L');
  });

  it('chip shows mastered data-done', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByTestId('law-group-pojmy'));
    expect(screen.getByTestId('chip-q1').getAttribute('data-done')).toBe('true');
  });

  it('fires onSelect when an expanded chip is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderPanel({ onSelect });
    await user.click(screen.getByTestId('law-group-pojmy'));
    await user.click(screen.getByTestId('chip-q1'));
    expect(onSelect).toHaveBeenCalledWith('q1');
  });

  it('fires onSetSource when source checkbox toggled', async () => {
    const user = userEvent.setup();
    const onSetSource = vi.fn();
    renderPanel({ onSetSource });
    await user.click(screen.getByTestId('law-filter-source-lea'));
    expect(onSetSource).toHaveBeenCalledWith('lea', false);
  });

  it('fires onSetTheme when theme checkbox toggled', async () => {
    const user = userEvent.setup();
    const onSetTheme = vi.fn();
    renderPanel({ onSetTheme });
    await user.click(screen.getByTestId('law-filter-theme-rto'));
    expect(onSetTheme).toHaveBeenCalledWith('rto', false);
  });

  it('hides a group whose source is fully disabled', () => {
    renderPanel({ sourceFilter: { lea: false, penal: true, sasp: true } });
    // q1 (lea/pojmy) je jediná pojmy položka → skupina zmizí
    expect(screen.queryByTestId('law-group-pojmy')).not.toBeInTheDocument();
    expect(screen.getByTestId('law-group-paragrafy')).toBeInTheDocument();
  });

  it('hides a group whose theme is disabled', () => {
    renderPanel({ themeFilter: { ...THEME_FILTER, rto: false } });
    expect(screen.queryByTestId('law-group-rto')).not.toBeInTheDocument();
    expect(screen.getByTestId('law-group-pojmy')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Spusť testy — musí selhat**

Run: `npx vitest run src/modules/law/components/LawSidePanel.test.tsx`
Expected: FAIL — `law-group-*` testidy neexistují, chipy se renderují ploše.

- [ ] **Step 3: Přepiš `LawSidePanel.tsx`**

Nahraď CELÝ obsah `src/modules/law/components/LawSidePanel.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { ProgressEntry, LawSourceFilter, LawThemeFilter, LawThemeKey } from '@/shared/storage';
import { LAW_SOURCE_KEYS, LAW_THEME_KEYS } from '@/shared/storage';
import type { LawSource, LawTheme } from '../data/types';

const SCORE_CLASS: Record<number, string> = {
  [-3]: 'bg-sasp-red text-sasp-ink border-sasp-red',
  [-2]: 'bg-sasp-red/70 text-sasp-ink border-sasp-red/70',
  [-1]: 'bg-sasp-red/40 text-sasp-ink border-sasp-red/50',
  0: 'bg-sasp-navy/40 text-sasp-ink border-sasp-tan/30',
  1: 'bg-emerald-700/40 text-sasp-ink border-emerald-600/50',
  2: 'bg-emerald-600/60 text-sasp-ink border-emerald-500/60',
  3: 'bg-emerald-500 text-sasp-bg border-emerald-400',
};

const SOURCE_LABEL: Record<LawSource, string> = {
  lea: 'LEA',
  penal: 'Penal',
  sasp: 'SASP',
};

const SOURCE_ABBR: Record<LawSource, string> = {
  lea: 'L',
  penal: 'P',
  sasp: 'S',
};

const THEME_LABEL: Record<LawTheme, string> = {
  pojmy: 'Pojmy',
  hodnosti: 'Hodnosti',
  jednani: 'Jednání',
  rto: 'Rádio',
  vybava: 'Výbava',
  zasah: 'Zásah',
  zadrzeni: 'Zadržení',
  kriminalistika: 'Kriminalistika',
  paragrafy: 'Paragrafy',
};

export interface LawPanelItem {
  id: string;
  source: LawSource;
  theme: LawTheme;
  /** Compact text shown in the chip (the question title or prompt). */
  label: string;
}

interface Props {
  items: readonly LawPanelItem[];
  progress: Record<string, ProgressEntry>;
  sourceFilter: LawSourceFilter;
  themeFilter: LawThemeFilter;
  onSetSource: (key: LawSource, enabled: boolean) => void;
  onSetTheme: (key: LawThemeKey, enabled: boolean) => void;
  currentId?: string;
  /** When provided, chips become clickable and switch to that question. */
  onSelect?: (id: string) => void;
}

function clampedScoreSum(items: readonly LawPanelItem[], progress: Record<string, ProgressEntry>) {
  return items.reduce((sum, it) => sum + Math.min(2, Math.max(0, progress[it.id]?.score ?? 0)), 0);
}

export function LawSidePanel({
  items,
  progress,
  sourceFilter,
  themeFilter,
  onSetSource,
  onSetTheme,
  currentId,
  onSelect,
}: Props) {
  const filtered = items.filter((it) => sourceFilter[it.source] && themeFilter[it.theme]);
  const total = filtered.length;
  const pct = total === 0 ? 0 : Math.round((clampedScoreSum(filtered, progress) / (2 * total)) * 100);
  const isComplete = total > 0 && pct === 100;

  const groups = LAW_THEME_KEYS.map((theme) => ({
    theme,
    items: filtered.filter((it) => it.theme === theme),
  })).filter((g) => g.items.length > 0);

  const currentTheme = currentId
    ? filtered.find((it) => it.id === currentId)?.theme
    : undefined;

  const [expanded, setExpanded] = useState<Set<LawTheme>>(() => new Set());

  useEffect(() => {
    if (!currentTheme) return;
    setExpanded((prev) => (prev.has(currentTheme) ? prev : new Set(prev).add(currentTheme)));
  }, [currentTheme]);

  const toggle = (theme: LawTheme) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(theme)) next.delete(theme);
      else next.add(theme);
      return next;
    });

  return (
    <aside
      className="card flex flex-col gap-3 p-4"
      data-testid="law-side-panel"
      aria-label="Přehled zákonů"
    >
      <ProgressHeader pct={pct} isComplete={isComplete} />

      <fieldset className="flex flex-wrap gap-2 text-xs">
        <legend className="sr-only">Zdroje</legend>
        {LAW_SOURCE_KEYS.map((source) => (
          <label
            key={source}
            className="flex items-center gap-1.5 cursor-pointer rounded border border-sasp-navy-light px-2 py-1 hover:bg-sasp-navy-light"
          >
            <input
              type="checkbox"
              checked={sourceFilter[source]}
              onChange={(e) => onSetSource(source, e.target.checked)}
              data-testid={`law-filter-source-${source}`}
              className="accent-sasp-tan"
            />
            <span>{SOURCE_LABEL[source]}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-wrap gap-2 text-xs">
        <legend className="sr-only">Témata</legend>
        {LAW_THEME_KEYS.map((theme) => (
          <label
            key={theme}
            className="flex items-center gap-1.5 cursor-pointer rounded border border-sasp-navy-light px-2 py-1 hover:bg-sasp-navy-light"
          >
            <input
              type="checkbox"
              checked={themeFilter[theme]}
              onChange={(e) => onSetTheme(theme, e.target.checked)}
              data-testid={`law-filter-theme-${theme}`}
              className="accent-sasp-tan"
            />
            <span>{THEME_LABEL[theme]}</span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-2">
        {groups.map((g) => {
          const isOpen = expanded.has(g.theme);
          const gTotal = g.items.length;
          const gMastered = g.items.filter((it) => (progress[it.id]?.score ?? 0) >= 2).length;
          const gPct = Math.round((clampedScoreSum(g.items, progress) / (2 * gTotal)) * 100);
          return (
            <div key={g.theme} className="flex flex-col gap-1.5">
              <button
                type="button"
                data-testid={`law-group-${g.theme}`}
                aria-expanded={isOpen}
                onClick={() => toggle(g.theme)}
                className="flex w-full items-center gap-2 rounded border border-sasp-navy-light px-2.5 py-1.5 text-left text-sm hover:bg-sasp-navy-light"
              >
                <span aria-hidden className="w-3 shrink-0 text-xs text-sasp-ink-dim">
                  {isOpen ? '▾' : '▸'}
                </span>
                <span className="flex-1 min-w-0 truncate font-medium">{THEME_LABEL[g.theme]}</span>
                <span className="shrink-0 text-xs text-sasp-ink-dim">
                  {gMastered}/{gTotal}
                </span>
                <span className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-sasp-navy">
                  <span
                    data-testid={`law-group-${g.theme}-bar`}
                    className="block h-full bg-sasp-tan"
                    style={{ width: `${gPct}%` }}
                  />
                </span>
              </button>

              {isOpen && (
                <ul className="flex flex-col gap-1.5 list-none p-0 m-0 pl-2" role="list">
                  {g.items.map((it) => {
                    const score = progress[it.id]?.score ?? 0;
                    const done = score >= 2;
                    const isCurrent = currentId === it.id;
                    const cls = [
                      'flex w-full items-center gap-3 rounded border px-2.5 py-1.5 text-sm transition text-left',
                      SCORE_CLASS[score] ?? SCORE_CLASS[0]!,
                      isCurrent ? 'ring-2 ring-sasp-tan ring-offset-2 ring-offset-sasp-bg' : '',
                      onSelect ? 'cursor-pointer hover:ring-1 hover:ring-sasp-tan' : '',
                    ].join(' ');
                    const inner = (
                      <>
                        <span className="font-mono text-[10px] shrink-0 w-3 uppercase text-sasp-ink-dim">
                          {SOURCE_ABBR[it.source]}
                        </span>
                        <span className="flex-1 min-w-0 truncate">{it.label}</span>
                        {done && (
                          <span aria-hidden className="text-xs">
                            ✓
                          </span>
                        )}
                      </>
                    );
                    return (
                      <li key={it.id}>
                        {onSelect ? (
                          <button
                            type="button"
                            data-testid={`chip-${it.id}`}
                            data-score={score}
                            data-done={done}
                            title={it.label}
                            aria-current={isCurrent ? 'true' : undefined}
                            onClick={() => onSelect(it.id)}
                            className={cls}
                          >
                            {inner}
                          </button>
                        ) : (
                          <div
                            data-testid={`chip-${it.id}`}
                            data-score={score}
                            data-done={done}
                            title={it.label}
                            aria-current={isCurrent ? 'true' : undefined}
                            className={cls}
                          >
                            {inner}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function ProgressHeader({ pct, isComplete }: { pct: number; isComplete: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs uppercase tracking-wider text-sasp-ink-dim">
        <span>Splněno</span>
        <span data-testid="law-progress-percent" className="text-sasp-ink">
          {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sasp-navy">
        <div
          data-testid="law-progress-bar"
          data-pct={pct}
          data-complete={isComplete}
          className={[
            'h-full transition-all duration-300',
            isComplete ? 'bg-sasp-gold animate-gold-pulse' : 'bg-sasp-tan',
          ].join(' ')}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Spusť testy panelu — musí projít**

Run: `npx vitest run src/modules/law/components/LawSidePanel.test.tsx`
Expected: PASS (všech 14 testů).

- [ ] **Step 5: Ověř LawPage.test.tsx (chip selektory uvnitř skupin)**

Run: `npx vitest run src/modules/law/components/LawPage.test.tsx`
Expected: PASS. Pokud některý test klikal na `chip-<id>` bez rozbalení skupiny,
uprav ho: nejdřív `await user.click(screen.getByTestId('law-group-<theme>'))`,
pak klikni na chip. (Pozn.: jsdom stub `matchMedia: false` renderuje mobile
`LawMobilePanel`, ale ten obaluje stejný `LawSidePanel` — chování skupin je identické.)

- [ ] **Step 6: Commit**

```bash
git add src/modules/law/components/LawSidePanel.tsx \
  src/modules/law/components/LawSidePanel.test.tsx
git commit -m "feat(law): group LawSidePanel chips by theme (collapsible) + source badge

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Autorovat SASP titulky (94)

Každý objekt v SASP data souborech dostane `title` — krátký (2–4 slova, ideálně
≤ ~28 znaků) výstižný titulek odvozený z `prompt`/`note`. **Anti-leak:** titulek
nesmí přebírat konkrétní formulace z reálného testu a nesmí prozradit odpověď.

**Files:**
- Modify: `src/modules/law/data/sasp/choice.ts` (86 objektů)
- Modify: `src/modules/law/data/sasp/text.ts` (2)
- Modify: `src/modules/law/data/sasp/enumeration.ts` (2)
- Modify: `src/modules/law/data/sasp/match.ts` (4)
- Test: `src/modules/law/data/sasp/sasp.test.ts`

- [ ] **Step 1: Napiš failing test na title presence**

Do `src/modules/law/data/sasp/sasp.test.ts` přidej před uzavírací `});` describe bloku:

```ts
  it('every question has a non-empty title (<= 40 chars)', () => {
    for (const q of SASP_LAW_QUESTIONS) {
      expect(q.title, q.id).toBeTruthy();
      expect((q.title ?? '').trim().length, q.id).toBeGreaterThan(0);
      expect((q.title ?? '').length, q.id).toBeLessThanOrEqual(40);
    }
  });
```

- [ ] **Step 2: Spusť test — musí selhat**

Run: `npx vitest run src/modules/law/data/sasp/sasp.test.ts -t "non-empty title"`
Expected: FAIL — objekty zatím `title` nemají.

- [ ] **Step 3: Doplň `title` do KAŽDÉHO objektu**

Do každého objektu přidej pole `title` (umísti hned za `theme`, před `kind`).
Pravidlo: výstižné téma otázky, ne celý prompt. Příklady (reálné, podle existujícího obsahu):

```ts
// choice.ts — sasp.choice.pojmy.1 (prompt „Co odlišuje loupež od krádeže?")
title: 'Loupež vs krádež',
// sasp.choice.pojmy.2 (prompt „Jakými způsoby … prokázat příslušnost?")
title: 'Prokázání příslušnosti',
// sasp.choice.pojmy.3 (prompt „Jak zákon definuje trestný čin?")
title: 'Definice trestného činu',
```

```ts
// text.ts — sasp.text.rto.1 (prompt „Přelož rádiové hlášení…")
title: 'Překlad RTO hlášení',
// sasp.text.zasah.felony-code (prompt „Jaký kód při felony stopu?")
title: 'Kód felony stopu',
```

Pro `enumeration.ts` a `match.ts` analogicky (např. „Hodnosti Staff SASP",
„Páry kód ↔ význam"). Projeď VŠECH 94 objektů — žádný bez `title`. Test
v dalším kroku to vynutí.

- [ ] **Step 4: Spusť test — musí projít**

Run: `npx vitest run src/modules/law/data/sasp/sasp.test.ts`
Expected: PASS (vč. „non-empty title").

- [ ] **Step 5: Commit**

```bash
git add src/modules/law/data/sasp/
git commit -m "feat(law): authored short titles for 94 SASP questions

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Autorovat Penal scénka titulky (28)

**Files:**
- Modify: `src/modules/laws/penal/data/scenarios.ts` (28 objektů)
- Test: `src/modules/law/data/index.test.ts`

- [ ] **Step 1: Napiš failing test na title všech penal otázek**

Do `src/modules/law/data/index.test.ts` přidej:

```ts
import { LAW_QUESTIONS } from './index';

it('every penal-sourced question has a non-empty title', () => {
  for (const q of LAW_QUESTIONS) {
    if (q.source !== 'penal') continue;
    expect(q.title, q.id).toBeTruthy();
    expect((q.title ?? '').trim().length, q.id).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 2: Spusť test — musí selhat**

Run: `npx vitest run src/modules/law/data/index.test.ts -t "penal-sourced question has"`
Expected: FAIL — scénky nemají `title`.

- [ ] **Step 3: Doplň `title` do každé scénky**

Do každého objektu v `PENAL_SCENARIOS` přidej `title` (za `ref`). 2–4 slova
shrnující situaci, **bez prozrazení paragrafů**. Příklady:

```ts
// A1 (loupež v obchodě s nožem)
ref: 'A1',
title: 'Loupež v obchodě',
// A2 (vloupání do domu, elektronika 40k)
ref: 'A2',
title: 'Vloupání do domu',
```

Projeď VŠECH 28 scénář (A1–E9). Žádná bez `title`.

- [ ] **Step 4: Spusť test — musí projít**

Run: `npx vitest run src/modules/law/data/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/laws/penal/data/scenarios.ts src/modules/law/data/index.test.ts
git commit -m "feat(law): authored short titles for 28 Penal scenarios

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: E2E filter spec + globální gate + plná suite + CLAUDE.md

**Files:**
- Modify: `e2e/law/filter.spec.ts`
- Test: `src/modules/law/data/index.test.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Globální gate „každá otázka má title"**

Do `src/modules/law/data/index.test.ts` přidej:

```ts
it('every LAW_QUESTION has a non-empty title', () => {
  for (const q of LAW_QUESTIONS) {
    expect(q.title, q.id).toBeTruthy();
    expect((q.title ?? '').trim().length, q.id).toBeGreaterThan(0);
  }
});
```

Run: `npx vitest run src/modules/law/data/index.test.ts -t "every LAW_QUESTION has"`
Expected: PASS (LEA z description, penal+sasp autorované v Task 3/4).

- [ ] **Step 2: Oprav E2E filter spec (rozbalit skupinu před viditelností chipu)**

V `e2e/law/filter.spec.ts` na řádku ~18 je `chip-sasp.choice.pojmy.1` čekáno
jako viditelné. Skupina je default sbalená → chip není visible. Před tu aserci
přidej rozbalení skupiny `pojmy`. Najdi blok:

```ts
    await expect(page.getByTestId('chip-sasp.choice.pojmy.1')).toBeVisible();
```

a nahraď ho:

```ts
    await page.getByTestId('law-group-pojmy').click();
    await expect(page.getByTestId('chip-sasp.choice.pojmy.1')).toBeVisible();
```

(Aserce `toHaveCount(0)` po odškrtnutí SASP zůstává — skupina/chip zmizí z DOM.)

- [ ] **Step 3: Spusť celou suite**

Run: `npm run test:all`
Expected: PASS — všechno zelené (unit/component + E2E). Pokud něco padne na
`chip-` selektoru, jde o test, který klikal na chip bez rozbalení skupiny —
přidej `await page.getByTestId('law-group-<theme>').click()` (E2E) nebo
`await user.click(screen.getByTestId('law-group-<theme>'))` (unit) před interakci.

- [ ] **Step 4: Aktualizuj CLAUDE.md**

V sekci „Law (Teorie) UI flow" → `LawSidePanel` uprav popis chipů a přidej řádek
o seskupení. Najdi:

```
- Chips — source zkratka + prompt, ✓ pro mastered, klik přepne otázku.
```

a nahraď:

```
- Chips seskupené do collapsible skupin podle tématu (`law-group-<theme>`,
  header = caret + téma + zvládnuto/celkem + mini bar). Default sbaleno,
  auto-expand skupiny s aktivní otázkou; stav rozbalení per-session.
  Chip = 1znaková značka zdroje (L/P/S) + `title` (krátký titulek místo promptu),
  ✓ pro mastered, klik přepne otázku.
```

Dále v sekci „LEA data & primitives" k `description` doplň, že se používá i jako
`title` v Teorie chipu (`adaptLea`). A do „Konvence"/datového popisu zmiň, že
`LawBase.title` (+ `PenalScenario.title`) nese krátký titulek; SASP/Penal titulky
jsou autorované (anti-leak), LEA odvozený z `description`.

- [ ] **Step 5: Commit**

```bash
git add e2e/law/filter.spec.ts src/modules/law/data/index.test.ts CLAUDE.md
git commit -m "test(law): expand-group in E2E filter + global title gate + docs

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-review (provedeno)

- **Spec coverage:** (A) seskupení → Task 2; collapse/auto-expand/per-session → Task 2;
  per-téma progress header → Task 2. (B) `title` pole → Task 1; LEA z description → Task 1;
  Penal titulky → Task 4; SASP titulky → Task 3; chip source badge místo theme badge → Task 2;
  testy → Task 2/3/4/5; E2E → Task 5; CLAUDE.md → Task 5. Vše pokryto.
- **Placeholder scan:** Title autorování (Task 3/4) je bulk content s explicitním
  pravidlem + worked examples + test-gate vynucujícím úplnost — ne vágní placeholder.
  Ostatní kroky mají kompletní kód.
- **Type consistency:** `title?: string` konzistentně na `LawBase` i `PenalScenario`;
  `SOURCE_ABBR`/`law-group-<theme>`/`law-group-<theme>-bar` testidy konzistentní mezi
  testem (Task 2 Step 1) a implementací (Step 3). `clampedScoreSum` helper použit pro
  globální i per-skupinu pct.
- **Gotcha 43 (saturation list):** titulky nemění question IDs → `LawPage.test.tsx`
  saturation list a `pinNextLawQuestion` netřeba měnit. Žádný schema bump (`title`
  není v localStorage).
```
