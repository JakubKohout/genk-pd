# Jeden dataset pro Teorie + zrušení Penal Recall — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Všech 139 právních otázek žije nativně jako `LawQuestion[]` v jednom souboru `src/modules/law/data/questions.ts`; adaptéry a `src/modules/laws/` mizí; Penal Recall je zrušen; storage schema v9.

**Architecture:** Codegen materializuje dnešní runtime pool (výstup adaptérů) do TS literálu — dočasný identity test dokáže datovou shodu před smazáním starých zdrojů. Recall se odstraní jako feature (routy → redirect, schema v9 dropne `penal` slice). Přeživší sdílené kusy (číselník paragrafů, paragraph logika, AnswerList/AnswerRow) se stěhují pod `law/`.

**Tech Stack:** Vite 6 + React 18 + TS 5.6, Vitest 2, Playwright 1. Codegen přes `npx vite-node` (je v node_modules).

**Spec:** `docs/superpowers/specs/2026-07-12-law-single-dataset-design.md`

## Global Constraints

- Question IDs se NEMĚNÍ (jsou to progress klíče v localStorage `law` slice).
- `STORAGE_KEY = 'genk-pd:v1'` se nemění; verzuje se jen `schemaVersion` (8 → 9).
- Žádné změny chování Teorie kvízu; Codes a Geo se nedotýkat (kromě schema literálů v test seedech).
- Žádná emoji v kódu ani docs. `text-sasp-ink-dim`, ne `text-sasp-ink/60`.
- Po každém tasku `npm test` zelené + commit. `tsc -b` bez chyb tam, kde task mění typy.
- Komentáře jen kde „proč" není zřejmé z kódu.

---

### Task 1: Materializace datasetu (codegen + identity test)

**Files:**
- Create: `materialize.tmp.ts` (repo root, docasný, NEcommituje se, na konci tasku smazat)
- Create: `src/modules/law/data/questions.ts` (generovaný, commituje se)
- Create: `src/modules/law/data/materialize-identity.test.ts` (dočasný, smaže Task 4)

**Interfaces:**
- Consumes: `LAW_QUESTIONS` z `src/modules/law/data/index.ts` (adapter pool).
- Produces: `export const LAW_QUESTIONS: readonly LawQuestion[]` v `src/modules/law/data/questions.ts` — datově identický s adapter poolem, stejné pořadí (LEA 17, Penal 28, SASP 94). Task 4 na něj přepne import.

- [ ] **Step 1: Napiš codegen skript `materialize.tmp.ts` v repo rootu**

Repo root je nutný — `vite-node` si přečte `vite.config.ts` a tím alias `@/`, který adaptéry používají.

```ts
import fs from 'node:fs';
import { LAW_QUESTIONS } from './src/modules/law/data/index';

const sq = (s: string) =>
  `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

function emit(v: unknown, indent: string): string {
  if (typeof v === 'string') return sq(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    const inner = v.map((x) => `${indent}  ${emit(x, indent + '  ')},`).join('\n');
    return `[\n${inner}\n${indent}]`;
  }
  const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined);
  const inner = entries.map(([k, x]) => `${indent}  ${k}: ${emit(x, indent + '  ')},`).join('\n');
  return `{\n${inner}\n${indent}}`;
}

const body = LAW_QUESTIONS.map((q) => `  ${emit(q, '  ')},`).join('\n');
const file = `import type { LawQuestion } from './types';

// Jediný zdroj pravdy pro Teorie kvíz. Strukturu validuje questions.test.ts.
export const LAW_QUESTIONS: readonly LawQuestion[] = [
${body}
];
`;
fs.writeFileSync('src/modules/law/data/questions.ts', file);
console.log(`Wrote ${LAW_QUESTIONS.length} questions`);
```

- [ ] **Step 2: Spusť codegen**

Run: `npx vite-node materialize.tmp.ts`
Expected: `Wrote 139 questions`, vznikne `src/modules/law/data/questions.ts` (~3300 řádků).

- [ ] **Step 3: Napiš identity test `src/modules/law/data/materialize-identity.test.ts`**

`toEqual` (ne `toStrictEqual`) — adaptéry emitují `subId: undefined`, literál pole vynechává; `toEqual` to považuje za shodu.

```ts
import { describe, expect, it } from 'vitest';
import { LAW_QUESTIONS as MATERIALIZED } from './questions';
import { LAW_QUESTIONS as FROM_ADAPTERS } from './index';

describe('materialized dataset identity (docasna pojistka konverze)', () => {
  it('equals the adapter-built pool exactly, order included', () => {
    expect(MATERIALIZED).toHaveLength(FROM_ADAPTERS.length);
    MATERIALIZED.forEach((q, i) => {
      expect(q, q.id).toEqual(FROM_ADAPTERS[i]);
    });
  });
});
```

- [ ] **Step 4: Ověř testy a typy**

Run: `npx vitest run src/modules/law/data && npx tsc -b`
Expected: identity test PASS, ostatní data testy PASS, tsc bez chyb.

- [ ] **Step 5: Smaž skript a commitni**

```bash
rm materialize.tmp.ts
git add src/modules/law/data/questions.ts src/modules/law/data/materialize-identity.test.ts
git commit -m "feat(law): materialize LAW_QUESTIONS into single questions.ts dataset"
```

---

### Task 2: Zrušení Penal Recall (UI, routy, analytics, E2E)

**Files:**
- Modify: `src/app/routes.tsx`, `src/app/HomePage.tsx`, `src/app/HomePage.test.tsx`, `src/shared/analytics.ts`, `e2e/law/redirects.spec.ts`, `e2e/fixtures/seed.ts`
- Delete: `src/modules/laws/penal/components/` (celý adresář: PenalRecallPage.tsx + .test.tsx, PenalSidePanel.tsx, PenalSubmitFooter.tsx, PenalResetButton.tsx), `src/modules/laws/penal/state/` (selection.ts + .test.ts, usePenalProgress.ts), `src/modules/laws/penal/data/recallPool.ts` + `recallPool.test.ts` + `recall-audit.test.ts`, `src/modules/laws/penal/logic/matchParagraph.ts` + `.test.ts`, `e2e/penal/` (celý adresář)

**Interfaces:**
- Consumes: nic z Task 1.
- Produces: aplikace bez `/penal/recall`; `analytics.ts` bez penal/sasp track funkcí; module enum = `'codes' | 'law' | 'geo-blind' | 'geo-name'`. Storage `penal` slice zatím ZŮSTÁVÁ (řeší Task 3).

- [ ] **Step 1: Smaž recall soubory**

```bash
git rm -r src/modules/laws/penal/components src/modules/laws/penal/state e2e/penal
git rm src/modules/laws/penal/data/recallPool.ts src/modules/laws/penal/data/recallPool.test.ts \
       src/modules/laws/penal/data/recall-audit.test.ts \
       src/modules/laws/penal/logic/matchParagraph.ts src/modules/laws/penal/logic/matchParagraph.test.ts
```

- [ ] **Step 2: Uprav `src/app/routes.tsx`**

Smaž import `PenalRecallPage` (řádek 8). Route blok nahraď:

```tsx
      { path: 'law', element: <LawPage /> },
      { path: 'penal/recall', element: <Navigate to="/law" replace /> },
      { path: 'laws', element: <Navigate to="/law" replace /> },
      { path: 'laws/lea', element: <Navigate to="/law" replace /> },
      { path: 'laws/penal/recall', element: <Navigate to="/law" replace /> },
      { path: 'laws/penal', element: <Navigate to="/law" replace /> },
      { path: 'laws/penal/scenarios', element: <Navigate to="/law" replace /> },
      { path: 'sasp', element: <Navigate to="/law" replace /> },
```

- [ ] **Step 3: Uprav `src/app/HomePage.tsx` a `HomePage.test.tsx`**

V `HomePage.tsx` smaž celý blok footer linku (`<div className="text-center">` … `</div>` obsahující `data-testid="home-penal-recall-link"`). V `HomePage.test.tsx` smaž `it('renders the home-penal-recall-link pointing to /penal/recall', …)` blok.

- [ ] **Step 4: Uprav `src/shared/analytics.ts`**

Smaž funkce `trackPenalAnswered`, `trackPenalCompleted`, `trackSaspAnswered`, `trackSaspCompleted` (celé). V `trackProgressReset` a `trackQuestionSkipped` zúž module union na:

```ts
  module: 'codes' | 'law' | 'geo-blind' | 'geo-name';
```

- [ ] **Step 5: Uprav `e2e/law/redirects.spec.ts`**

Poslední dva testy (`/#/penal/recall shows penal recall page directly` a `/#/laws/penal/recall redirects to /#/penal/recall …`) nahraď:

```ts
  test('/#/penal/recall redirects to /#/law and shows law quiz', async ({ page }) => {
    await seed(page, { randomSeed: 1 });
    await page.goto('/#/penal/recall');
    await expect(page).toHaveURL(/#\/law$/);
    await expect(page.getByTestId('law-progress-percent')).toBeVisible();
  });

  test('/#/laws/penal/recall redirects to /#/law and shows law quiz', async ({ page }) => {
    await seed(page, { randomSeed: 1 });
    await page.goto('/#/laws/penal/recall');
    await expect(page).toHaveURL(/#\/law$/);
    await expect(page.getByTestId('law-progress-percent')).toBeVisible();
  });
```

- [ ] **Step 6: Uprav `e2e/fixtures/seed.ts` — mrtvé helpery**

Smaž `PENAL_PARAGRAPH_IDS` a `pinNextPenalParagraph` (recall E2E zmizel) a nepoužívané helpery `pinNextLeaQuestion`, `pinNextPenalScenario`, `pinNextSaspQuestion` (žádný spec je neimportuje — ověř `grep -rn "pinNextLea\|pinNextPenalScenario\|pinNextSasp" e2e`). ID pole `LEA_QUESTION_IDS`, `PENAL_SCENARIO_IDS`, `SASP_QUESTION_IDS` ZŮSTÁVAJÍ — skládají `LAW_QUESTION_IDS` pro `pinNextLawQuestion`. `SeedInput.penal` a penal blok v `persisted` zatím nech (Task 3).

- [ ] **Step 7: Ověř**

Run: `grep -rn "PenalRecall\|penal-recall\|penal-scenario\|trackPenalAnswered\|trackPenalCompleted\|trackSaspAnswered\|trackSaspCompleted\|matchParagraph\|recallPool\|usePenalProgress" src e2e --include="*.ts" --include="*.tsx"`
Expected: žádné výskyty (kromě případných komentářů v CLAUDE.md — ten řeší Task 6).

Run: `npm test && npx tsc -b`
Expected: PASS (počet testů klesne o smazané recall testy).

Run: `npx playwright test e2e/law/redirects.spec.ts`
Expected: 6 testů PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(law)!: remove Penal Recall feature (routes redirect to /law)"
```

---

### Task 3: Storage schema v9 — drop `penal` slice

**Files:**
- Modify: `src/shared/storage.ts`, `src/shared/storage.test.ts`, `e2e/fixtures/seed.ts`, `e2e/law/persistence.spec.ts`
- Modify (seed literály): `src/modules/codes/components/ModeChoose.test.tsx`, `ModeWrite.test.tsx`, `ResetButton.test.tsx`, `SidePanel.test.tsx`, `src/modules/geo/components/GeoBlindPage.test.tsx`, `GeoNamePage.test.tsx`, `GeoResetButton.test.tsx`, `src/modules/law/components/LawPage.test.tsx`

**Interfaces:**
- Consumes: Task 2 (žádný kód už nečte/nepíše `penal` slice).
- Produces: `PersistedState = { schemaVersion: 9; codes; geo; law }` — bez `penal`. Typy `PenalSlice`/`PenalQuizSlice` zanikají. Nová funkce `normalizeToV9(s: any): PersistedState` (interní) je zároveň lenient read v9/v8 i finální krok migračního řetězu.

- [ ] **Step 1: Napiš failing migrační test do `src/shared/storage.test.ts`**

```ts
  it('migrates v8 payload to v9: drops penal slice, preserves law progress', () => {
    localStorage.setItem(
      STORAGE_KEY_FOR_TESTS,
      JSON.stringify({
        schemaVersion: 8,
        codes: {
          progress: { '10-0': { score: 1, lastAskedAtTurn: 2 } },
          turn: 3,
          settings: { importanceFilter: { mandatory: true, rare: false, unnecessary: false } },
        },
        penal: { recall: { progress: { 'penal.25': { score: 2, lastAskedAtTurn: 1 } }, turn: 5 } },
        geo: {
          blind: { progress: {}, turn: 0 },
          name: { progress: {}, turn: 0 },
          settings: { categoryFilter: { street: true, highway: true, city: true, state: true } },
        },
        law: {
          progress: { 'lea.7': { score: 2, lastAskedAtTurn: 1 } },
          turn: 4,
          settings: {
            sourceFilter: { lea: true, penal: true, sasp: true },
            themeFilter: {
              pojmy: true, hodnosti: true, jednani: true, rto: true, vybava: true,
              zasah: true, zadrzeni: true, kriminalistika: true, paragrafy: true,
            },
          },
        },
      }),
    );
    __resetCacheForTests();
    const s = loadState();
    expect(s.schemaVersion).toBe(9);
    expect((s as Record<string, unknown>).penal).toBeUndefined();
    expect(s.law.progress['lea.7']).toEqual({ score: 2, lastAskedAtTurn: 1 });
    expect(s.law.turn).toBe(4);
    expect(s.codes.progress['10-0']).toEqual({ score: 1, lastAskedAtTurn: 2 });
  });
```

Run: `npx vitest run src/shared/storage.test.ts`
Expected: FAIL (schemaVersion je 8).

- [ ] **Step 2: Uprav `src/shared/storage.ts`**

1. Smaž exporty `PenalQuizSlice` a `PenalSlice` (řádky 27–34).
2. `PersistedState`: `schemaVersion: 9`, odstraň pole `penal`.
3. `initialState`: `schemaVersion: 9`, odstraň `penal` blok.
4. Smaž celou funkci `migrateV7toV8` a nahraď ji:

```ts
// v8 → v9: drop penal slice (Penal Recall zrušen). Zároveň slouží jako lenient
// v9/v8 read — dopočítá chybějící sub-slices z defaults. Starší migrace (v1–v7)
// ústí sem, takže lea/sasp/penal.scenarios/penal.recall data zahazuje tady.
function normalizeToV9(s: any): PersistedState {
  return {
    schemaVersion: 9,
    codes: {
      progress: s.codes?.progress ?? {},
      turn: s.codes?.turn ?? 0,
      settings: {
        importanceFilter: {
          ...initialState.codes.settings.importanceFilter,
          ...(s.codes?.settings?.importanceFilter ?? {}),
        },
      },
    },
    geo: {
      blind: {
        progress: s.geo?.blind?.progress ?? {},
        turn: s.geo?.blind?.turn ?? 0,
      },
      name: {
        progress: s.geo?.name?.progress ?? {},
        turn: s.geo?.name?.turn ?? 0,
      },
      settings: {
        categoryFilter: {
          ...initialState.geo.settings.categoryFilter,
          ...(s.geo?.settings?.categoryFilter ?? {}),
        },
      },
    },
    law: {
      progress: s.law?.progress ?? {},
      turn: s.law?.turn ?? 0,
      settings: {
        sourceFilter: {
          ...defaultLawSettings().sourceFilter,
          ...(s.law?.settings?.sourceFilter ?? {}),
        },
        themeFilter: {
          ...defaultLawSettings().themeFilter,
          ...(s.law?.settings?.themeFilter ?? {}),
        },
      },
    },
  };
}
```

5. `readFromStorage`: smaž celý inline „Lenient v8 read" blok (řádky 536–592) a všechny větve přepiš na:

```ts
    if ((parsed?.schemaVersion === 9 || parsed?.schemaVersion === 8) && parsed.codes) {
      return normalizeToV9(parsed);
    }
    if (parsed?.schemaVersion === 7 && parsed.codes) {
      return normalizeToV9(parsed);
    }
    if (parsed?.schemaVersion === 6 && parsed.codes) {
      return normalizeToV9(migrateV6toV7(parsed as StoredV6));
    }
    if (parsed?.schemaVersion === 5 && parsed.codes) {
      return normalizeToV9(migrateV6toV7(migrateV5ToV6(parsed as StoredV5)));
    }
    if (parsed?.schemaVersion === 4 && parsed.codes) {
      return normalizeToV9(migrateV6toV7(migrateV5ToV6(migrateV4ToV5(parsed as StoredV4))));
    }
    if (parsed?.schemaVersion === 3 && parsed.codes) {
      return normalizeToV9(
        migrateV6toV7(migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(parsed as StoredV3)))),
      );
    }
    if (parsed?.schemaVersion === 2 && parsed.codes) {
      return normalizeToV9(
        migrateV6toV7(
          migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(parsed as StoredV2)))),
        ),
      );
    }
    if (parsed?.schemaVersion === 1 && parsed.codes) {
      return normalizeToV9(
        migrateV6toV7(
          migrateV5ToV6(
            migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(parsed as StoredV1)))),
          ),
        ),
      );
    }
```

Pozn.: v7 payload jde přímo do `normalizeToV9` — `migrateV7toV8` jen přeskládával stejná pole a penal, který v9 zahazuje. `StoredV7` typ smaž, pokud po úpravě nemá použití (tsc napoví).

- [ ] **Step 3: Uprav zbytek `src/shared/storage.test.ts`**

Pravidla (projdi celý soubor, 432 řádků):
- Očekávání `schemaVersion` po `loadState()`/`saveState()`: 8 → 9.
- Všechny aserce tvaru `expect(s.penal…)` — smaž, nebo pokud test cíleně ověřoval přežití `penal.recall` přes migraci, změň na `expect((s as Record<string, unknown>).penal).toBeUndefined()`.
- `saveState({ … })` literály typované `PersistedState`: `schemaVersion: 9` a odstraň `penal` blok (tsc jinak spadne).
- Testy „lenient v8 read backfills missing sub-slices" přejmenuj/uprav na v9 (chybějící `geo`/`law` dopočet zůstává, `penal` už neexistuje).

- [ ] **Step 4: Uprav unit test seed literály (8 souborů)**

V každém z: `ModeChoose.test.tsx`, `ModeWrite.test.tsx`, `ResetButton.test.tsx`, `SidePanel.test.tsx` (codes), `GeoBlindPage.test.tsx`, `GeoNamePage.test.tsx`, `GeoResetButton.test.tsx` (geo), `LawPage.test.tsx` (law) najdi `saveState({ … })` / stavové literály a proveď stejnou dvojici úprav:

```
schemaVersion: 8,   →   schemaVersion: 9,
```

a smaž celý blok:

```
    penal: {
      recall: { progress: {}, turn: 0 },
    },
```

(přesná podoba bloku se může lišit ve formátování — vodítkem je tsc: po úpravě `PersistedState` každý zapomenutý literál spadne při `npx tsc -b` / `npm test`).

- [ ] **Step 5: Uprav `e2e/fixtures/seed.ts`**

- `SeedInput`: smaž pole `penal`.
- `persisted`: `schemaVersion: 9 as const`, smaž `penal` blok.

- [ ] **Step 6: Uprav `e2e/law/persistence.spec.ts`**

Řádky 47–49 nahraď:

```ts
  expect(parsed.penal).toBeUndefined();
```

Pokud spec asserted `parsed.schemaVersion`, změň na 9.

- [ ] **Step 7: Ověř**

Run: `npm test && npx tsc -b`
Expected: PASS včetně nového migračního testu.

Run: `npx playwright test e2e/law/persistence.spec.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(storage)!: schema v9 — drop penal slice, unify lenient read as normalizeToV9"
```

---

### Task 4: Přepnutí poolu na literál + sjednocený datový test + smazání adaptérů a starých zdrojů

**Files:**
- Modify: `src/modules/law/components/LawPage.tsx:4`, `src/modules/law/components/LawPage.test.tsx:6`
- Create: `src/modules/law/data/questions.test.ts`
- Delete: `src/modules/law/data/index.ts`, `index.test.ts`, `adaptLea.ts`, `adaptLea.test.ts`, `adaptPenal.ts`, `adaptPenal.test.ts`, `sasp/` (celý adresář), `materialize-identity.test.ts`
- Delete: `src/modules/laws/lea/data/questions.ts`, `questions.test.ts`, `types.ts`, `src/modules/laws/penal/data/scenarios.ts`, `scenarios.test.ts`
- Modify: `src/modules/laws/penal/data/types.ts` (smaž `PenalScenario` + `ExpectedAnswer`)

**Interfaces:**
- Consumes: `src/modules/law/data/questions.ts` z Task 1 (identity test do této chvíle garantoval shodu s adaptéry).
- Produces: `LAW_QUESTIONS` se importuje výhradně z `@/modules/law/data/questions` (relativně `../data/questions`). `laws/penal/data/types.ts` exportuje už jen `PenalCategory`, `PenalSubParagraph`, `PenalParagraph` (Task 5 je přestěhuje).

- [ ] **Step 1: Napiš `src/modules/law/data/questions.test.ts`**

Nahrazuje `index.test.ts` + `sasp/sasp.test.ts` + datové invarianty ze smazaných `laws/*` testů:

```ts
import { describe, expect, it } from 'vitest';
import { LAW_QUESTIONS } from './questions';
import { LAW_SOURCES, LAW_THEMES } from './types';
import { normalize } from '@/shared/text/normalize';
import { canonicalAnswerId } from '@/modules/laws/penal/logic/canonicalAnswerId';
import { PENAL_PARAGRAPHS } from '@/modules/laws/penal/data/paragraphs';

const bySource = (s: string) => LAW_QUESTIONS.filter((q) => q.source === s);

describe('LAW_QUESTIONS dataset', () => {
  it('has expected per-source counts', () => {
    expect(bySource('lea')).toHaveLength(17);
    expect(bySource('penal')).toHaveLength(28);
    expect(bySource('sasp')).toHaveLength(94);
    expect(LAW_QUESTIONS).toHaveLength(139);
  });

  it('has unique IDs', () => {
    const ids = LAW_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every question has a valid source and theme', () => {
    for (const q of LAW_QUESTIONS) {
      expect(LAW_SOURCES, q.id).toContain(q.source);
      expect(LAW_THEMES, q.id).toContain(q.theme);
    }
  });

  it('IDs are prefixed by their source', () => {
    for (const q of LAW_QUESTIONS) {
      if (q.source === 'lea') expect(q.id, q.id).toMatch(/^lea\./);
      if (q.source === 'penal') expect(q.id, q.id).toMatch(/^penal\.scenario\./);
      if (q.source === 'sasp') expect(q.id, q.id).toMatch(/^sasp\./);
    }
  });

  it('every question has a non-empty title of at most 40 chars', () => {
    for (const q of LAW_QUESTIONS) {
      expect(q.title, q.id).toBeTruthy();
      expect((q.title ?? '').trim().length, q.id).toBeGreaterThan(0);
      expect((q.title ?? '').length, q.id).toBeLessThanOrEqual(40);
    }
  });

  describe('choice', () => {
    it('has at least 5 options and valid, unique correct indices', () => {
      for (const q of LAW_QUESTIONS) {
        if (q.kind !== 'choice') continue;
        expect(q.options.length, q.id).toBeGreaterThanOrEqual(5);
        expect(q.correctIndices.length, q.id).toBeGreaterThanOrEqual(1);
        expect(new Set(q.correctIndices).size, q.id).toBe(q.correctIndices.length);
        for (const i of q.correctIndices) {
          expect(i, q.id).toBeGreaterThanOrEqual(0);
          expect(i, q.id).toBeLessThan(q.options.length);
        }
      }
    });
  });

  describe('text', () => {
    it('aliases are unique and do not collide with the answer after normalize', () => {
      for (const q of LAW_QUESTIONS) {
        if (q.kind !== 'text') continue;
        const canonical = normalize(q.answer);
        const normalized = q.aliases.map((a) => normalize(a));
        for (const a of normalized) expect(a, q.id).not.toBe(canonical);
        expect(new Set(normalized).size, q.id).toBe(q.aliases.length);
      }
    });
  });

  describe('enumeration', () => {
    it('has at least one expected item and a valid matcher', () => {
      for (const q of LAW_QUESTIONS) {
        if (q.kind !== 'enumeration') continue;
        expect(q.expected.length, q.id).toBeGreaterThan(0);
        expect(['alias', 'paragraph'], q.id).toContain(q.matcher);
      }
    });

    it('paragraph-matcher keys are canonical and resolve to existing paragraphs/subs', () => {
      const byId = new Map(PENAL_PARAGRAPHS.map((p) => [p.id, p]));
      for (const q of LAW_QUESTIONS) {
        if (q.kind !== 'enumeration' || q.matcher !== 'paragraph') continue;
        for (const e of q.expected) {
          const cid = canonicalAnswerId(e.key);
          expect(cid, `${q.id}: ${e.key}`).toBe(e.key);
          const m = /^(\d+)([a-e]?)$/.exec(e.key)!;
          const para = byId.get(`penal.${m[1]}`);
          expect(para, `${q.id}: penal.${m[1]}`).toBeTruthy();
          if (m[2]) {
            expect(
              para!.subs.some((s) => s.id === m[2]),
              `${q.id}: §${m[1]} sub ${m[2]}`,
            ).toBe(true);
          }
        }
      }
    });
  });

  describe('match', () => {
    it('has at least 3 pairs with non-empty sides and unique lefts', () => {
      for (const q of LAW_QUESTIONS) {
        if (q.kind !== 'match') continue;
        expect(q.pairs.length, q.id).toBeGreaterThanOrEqual(3);
        for (const p of q.pairs) {
          expect(p.left.trim(), q.id).not.toBe('');
          expect(p.right.trim(), q.id).not.toBe('');
        }
        expect(new Set(q.pairs.map((p) => p.left)).size, q.id).toBe(q.pairs.length);
      }
    });
  });
});
```

Run: `npx vitest run src/modules/law/data/questions.test.ts`
Expected: PASS (data jsou už na místě z Task 1). Pokud FAIL, je to nález — porovnej s adapter výstupem, neuhýbej oslabením testu.

- [ ] **Step 2: Přepni importy poolu**

`src/modules/law/components/LawPage.tsx:4` a `src/modules/law/components/LawPage.test.tsx:6`:

```ts
import { LAW_QUESTIONS } from '../data/questions';
```

- [ ] **Step 3: Smaž adaptéry a staré zdroje**

```bash
git rm src/modules/law/data/index.ts src/modules/law/data/index.test.ts \
       src/modules/law/data/adaptLea.ts src/modules/law/data/adaptLea.test.ts \
       src/modules/law/data/adaptPenal.ts src/modules/law/data/adaptPenal.test.ts \
       src/modules/law/data/materialize-identity.test.ts
git rm -r src/modules/law/data/sasp
git rm src/modules/laws/lea/data/questions.ts src/modules/laws/lea/data/questions.test.ts \
       src/modules/laws/lea/data/types.ts \
       src/modules/laws/penal/data/scenarios.ts src/modules/laws/penal/data/scenarios.test.ts
```

V `src/modules/laws/penal/data/types.ts` smaž interfacy `ExpectedAnswer` a `PenalScenario` (zůstane `PenalCategory`, `PenalSubParagraph`, `PenalParagraph`).

- [ ] **Step 4: Ověř, že nikdo neimportuje smazané**

Run: `grep -rn "adaptLea\|adaptPenal\|SASP_LAW_QUESTIONS\|law/data/index\|law/data'\|lea/data/questions\|penal/data/scenarios\|PenalScenario\|ExpectedAnswer" src e2e --include="*.ts" --include="*.tsx"`
Expected: žádné výskyty.

- [ ] **Step 5: Testy + typy**

Run: `npm test && npx tsc -b`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(law)!: single-source questions.ts dataset, drop adapters and legacy source formats"
```

---

### Task 5: Přesun přeživších pod `law/` + smazání `src/modules/laws/`

**Files:**
- Move: `src/modules/laws/penal/data/paragraphs.ts` → `src/modules/law/data/paragraphs.ts` (+ `paragraphs.test.ts`; typy z `laws/penal/data/types.ts` inline na začátek `paragraphs.ts`)
- Move: `src/modules/laws/penal/logic/canonicalAnswerId.ts` + `.test.ts`, `suggestParagraph.ts` + `.test.ts` → `src/modules/law/logic/`
- Move: `src/modules/laws/lea/components/AnswerList.tsx` + `.test.tsx`, `AnswerRow.tsx` + `.test.tsx` → `src/modules/law/components/`
- Modify: `src/modules/law/components/EnumerationInput.tsx:5-7`, `src/modules/law/logic/matchEnumeration.ts:2`, `src/modules/law/data/questions.test.ts` (importy)
- Delete: zbytek `src/modules/laws/`

**Interfaces:**
- Consumes: trimnutý `laws/penal/data/types.ts` z Task 4.
- Produces: `@/modules/law/data/paragraphs` exportuje `PENAL_PARAGRAPHS`, `PenalParagraph`, `PenalSubParagraph`, `PenalCategory`; `@/modules/law/logic/canonicalAnswerId` a `@/modules/law/logic/suggestParagraph` beze změny signatur; `AnswerList`/`AnswerRow` (a typ `AnswerEntry`) na `@/modules/law/components/AnswerList`. `src/modules/laws/` neexistuje.

- [ ] **Step 1: Přesuň soubory přes `git mv`**

```bash
git mv src/modules/laws/penal/data/paragraphs.ts src/modules/law/data/paragraphs.ts
git mv src/modules/laws/penal/data/paragraphs.test.ts src/modules/law/data/paragraphs.test.ts
git mv src/modules/laws/penal/logic/canonicalAnswerId.ts src/modules/law/logic/canonicalAnswerId.ts
git mv src/modules/laws/penal/logic/canonicalAnswerId.test.ts src/modules/law/logic/canonicalAnswerId.test.ts
git mv src/modules/laws/penal/logic/suggestParagraph.ts src/modules/law/logic/suggestParagraph.ts
git mv src/modules/laws/penal/logic/suggestParagraph.test.ts src/modules/law/logic/suggestParagraph.test.ts
git mv src/modules/laws/lea/components/AnswerList.tsx src/modules/law/components/AnswerList.tsx
git mv src/modules/laws/lea/components/AnswerList.test.tsx src/modules/law/components/AnswerList.test.tsx
git mv src/modules/laws/lea/components/AnswerRow.tsx src/modules/law/components/AnswerRow.tsx
git mv src/modules/laws/lea/components/AnswerRow.test.tsx src/modules/law/components/AnswerRow.test.tsx
```

- [ ] **Step 2: Inline typy paragrafů**

Obsah trimnutého `src/modules/laws/penal/data/types.ts` (tj. `PenalCategory`, `PenalSubParagraph`, `PenalParagraph`) přesuň s `export` na začátek `src/modules/law/data/paragraphs.ts` a smaž tamní `import type { PenalParagraph } from './types';`. Pak:

```bash
git rm src/modules/laws/penal/data/types.ts
```

- [ ] **Step 3: Uprav importy**

- `src/modules/law/components/EnumerationInput.tsx`:

```ts
import { AnswerList, type AnswerEntry } from './AnswerList';
import { PENAL_PARAGRAPHS } from '../data/paragraphs';
import { suggestParagraphs } from '../logic/suggestParagraph';
```

- `src/modules/law/logic/matchEnumeration.ts:2`:

```ts
import { canonicalAnswerId } from './canonicalAnswerId';
```

- `src/modules/law/data/questions.test.ts`:

```ts
import { canonicalAnswerId } from '../logic/canonicalAnswerId';
import { PENAL_PARAGRAPHS } from './paragraphs';
```

- V přesunutých souborech oprav relativní importy, které se přesunem rozbily (`suggestParagraph.ts` importuje typy z `../data/types` → `../data/paragraphs`; testy importují testované moduly relativně — tsc/vitest ukáže přesně).

- [ ] **Step 4: Smaž zbytek `laws/`**

```bash
git rm -r src/modules/laws
```

(V tuto chvíli by tam měly zbývat jen prázdné adresáře; pokud `git rm` hlásí zbylý soubor, je to zapomenutá závislost — vyřeš, nesmaž slepě.)

- [ ] **Step 5: Ověř**

Run: `grep -rn "modules/laws" src e2e docs/superpowers/plans/2026-07-12-law-single-dataset.md --include="*.ts" --include="*.tsx"`
Expected: žádný výskyt v `src`/`e2e` (tento plán se nepočítá).

Run: `npm test && npx tsc -b`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(law): fold paragraphs, paragraph logic and answer primitives into law module; delete modules/laws"
```

---

### Task 6: CLAUDE.md + finální verifikace

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: finální strom z Tasks 1–5.
- Produces: dokumentace odpovídající realitě + zelené `npm run test:all`.

- [ ] **Step 1: Spusť plnou verifikaci a zaznamenej počty**

Run: `npm run test:all`
Expected: vše PASS. Poznamenej si přesné počty unit/component a E2E testů z výstupu.

- [ ] **Step 2: Přepiš CLAUDE.md**

Konkrétní úpravy:
- Úvodní blok „Stav po refaktoru": popiš finální stav — jeden dataset `law/data/questions.ts`, žádné adaptéry, `src/modules/laws/` neexistuje, Penal Recall zrušen (route redirectuje na `/law`), schema v9.
- Seznam modulů: smaž bod 2 (RETIRED LEA), bod 3 (Penal Code Recall) a bod 5 (RETIRED SASP); Teorie popisuj jako modul s jedním datasetem. Nav má 3 položky (Codes / Teorie / Geo), HomePage 3 karty.
- Adresářová struktura: odstraň `laws/` strom; do `law/` doplň `data/questions.ts` (139 otázek), `data/paragraphs.ts` (číselník 75 paragrafů + typy), `logic/canonicalAnswerId.ts`, `logic/suggestParagraph.ts`, `components/AnswerList.tsx`, `components/AnswerRow.tsx`.
- Datový model: v9 bez `penal` slice; migrační poznámku rozšiř o „v9: odstraněn penal slice; lenient v9/v8 read = `normalizeToV9`".
- Sekce „Penal Recall UI flow" smaž; sekci „LEA data & primitives" nahraď poznámkou o `AnswerList`/`AnswerRow` v `law/components/`; v sekci Penal Code smaž Recall odstavce.
- Analytics tabulka: odstraň řádky `trackPenalAnswered`, `trackPenalCompleted` a poznámku o `trackSaspAnswered`/`trackSaspCompleted`; module enumy = `codes | law | geo-blind | geo-name`.
- Gotchas: 11 a 29 přepiš na v9 (bez `penal` slice v seedech); 24 a 25 smaž (recall pool a PENAL_PARAGRAPH_IDS zanikly — čísla nech a označ `_(zaniklo — recall zrušen)_`, ať se nečíslují ostatní); 43 uprav (nový obsah jde do `law/data/questions.ts`, sasp.test.ts neexistuje — validace v `questions.test.ts`).
- Příkazy: aktualizuj řádek s počty testů podle Step 1.
- „Nový obsah do Teorie" pokyn: přidávej otázky přímo do `law/data/questions.ts` (LawQuestion literál), validace `questions.test.ts`, E2E seed `LAW_QUESTION_IDS` + `LawPage.test.tsx` saturation list.
- Firearm Act poznámky: nový zdroj = přidat hodnotu do `LAW_SOURCE_KEYS`, bump schema v9 → v10, otázky přímo do `questions.ts` (žádný adapter).

- [ ] **Step 3: Finální grep hygiena**

Run: `grep -rn "modules/laws\|adaptLea\|adaptPenal\|penal/recall\|PenalRecall\|recallPool\|schemaVersion: 8" src e2e CLAUDE.md --include="*.ts" --include="*.tsx" --include="*.md" | grep -v "docs/superpowers"`
Expected: žádné výskyty (kromě popisu redirectu `penal/recall` v routes/CLAUDE.md, což je záměr — redirect existuje).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: CLAUDE.md for single-dataset law module, schema v9, no Penal Recall"
```
