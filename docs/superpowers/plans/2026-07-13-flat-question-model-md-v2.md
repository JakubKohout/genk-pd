# Flat Question Model + Review Markdown v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Odstranit dimenzi `source` (lea/penal/sasp) z celé aplikace (schema v10, téma `scenky`, opaque ID) a povýšit review markdown na v2 (anglické code listy, legenda s popisem polí, přidávání otázek přes `NEW`).

**Architecture:** Fáze A (Tasky 1–4) zplošťuje model: storage v10, typy/data bez source, UI/selection/analytics, E2E. Fáze B (Tasky 5–7) mění md formát: anglické kódy + legenda, NEW otázky, import s jedním ID polem + finalizace. Round-trip test (`parse(serialize(LAW_QUESTIONS))` nad reálným datasetem) musí být zelený po každém tasku. Spec: `docs/superpowers/specs/2026-07-13-flat-question-model-md-v2-design.md`.

**Tech Stack:** TypeScript 5.6, Vitest 2, Playwright 1, tsx.

## Global Constraints

- Stávající ID otázek se NEMĚNÍ (progress hráčů v localStorage je klíčovaný ID). Nové otázky dostávají ID `q<n>`.
- `STORAGE_KEY = 'genk-pd:v1'` se nemění; verzování jen přes `schemaVersion` (9 → 10).
- Témata po změně: 10 kódů `pojmy, hodnosti, jednani, rto, vybava, zasah, zadrzeni, kriminalistika, paragrafy, scenky`. 28 penal scének (poznávací znak: `matcher: 'paragraph'`) přechází z `paragrafy` do `scenky`; LEA výčty zůstávají `paragrafy`.
- Kódy typů v md v2: `choice`, `text`, `enumeration-alias`, `enumeration-paragraph`, `match`. Meta labely: `type`, `theme`, `ref`, `ordered`. Technické pod-řádky: `aliases:`, `keywords:`, `key:`, `sub:`. České zůstávají: `**Zadání:**`, `**Scénka:**`, `**Možnosti:**`, `**Odpověď:**`, `**Aliasy:**`, `**Položky:**`, `**Páry:**`, `**Vysvětlivka:**`, `SMAZAT`.
- Zachovat: uzavřenou gramatiku parseru (nerozpoznaný řádek = chyba), CRLF toleranci, `;`/`|`/newline/backtick guardy, atomický import, idempotenci export→import, chyby česky `řádek N: …`.
- Review modul: jen relativní importy. Žádné emoji. TDD. Gotcha 11 sweep: všechny hardcoded `saveState({...})` fixtures v testech musí přejít na `schemaVersion: 10` bez `sourceFilter` a s 10 klíči `themeFilter`.
- Cíl po Tasku 7: `npm run test:all` kompletně zelené.

---

### Task 1: Storage v10

**Files:**
- Modify: `src/shared/storage.ts`
- Test: `src/shared/storage.test.ts`

**Interfaces:**
- Produces: `LAW_THEME_KEYS` s 10 klíči (přidán `'scenky'` na konec); SMAZÁNY exporty `LAW_SOURCE_KEYS`, `LawSource`, `LawSourceFilter`; `LawSlice['settings'] = { themeFilter: LawThemeFilter }`; `PersistedState['schemaVersion'] = 10`; interní `normalizeToV10(s: any): PersistedState` jako terminál všech migračních řetězů i lenient read. Vše ostatní (API save/load/subscribe) beze změny.

- [ ] **Step 1: Failing testy v10**

Do `src/shared/storage.test.ts` přidat (a šablonově upravit existující v9 očekávání — viz Step 3):

```ts
it('migrates a v9 payload: drops law.settings.sourceFilter, adds scenky theme', () => {
  localStorage.setItem(
    STORAGE_KEY_FOR_TESTS,
    JSON.stringify({
      schemaVersion: 9,
      codes: { progress: {}, turn: 0, settings: { importanceFilter: { mandatory: true, rare: true, unnecessary: true } } },
      geo: {
        blind: { progress: {}, turn: 0 },
        name: { progress: {}, turn: 0 },
        settings: { categoryFilter: { street: true, highway: true, city: true, state: true } },
      },
      law: {
        progress: { 'lea.7': { score: 2, lastAskedAtTurn: 1 } },
        turn: 5,
        settings: {
          sourceFilter: { lea: false, penal: true, sasp: true },
          themeFilter: {
            pojmy: false, hodnosti: true, jednani: true, rto: true, vybava: true,
            zasah: true, zadrzeni: true, kriminalistika: true, paragrafy: true,
          },
        },
      },
    }),
  );
  __resetCacheForTests();
  const s = loadState();
  expect(s.schemaVersion).toBe(10);
  expect((s.law.settings as Record<string, unknown>).sourceFilter).toBeUndefined();
  expect(s.law.settings.themeFilter.scenky).toBe(true);
  expect(s.law.settings.themeFilter.pojmy).toBe(false); // stávající volby přežijí
  expect(s.law.progress['lea.7']?.score).toBe(2); // progress přežije
});

it('lenient v10 read backfills missing themeFilter keys', () => {
  localStorage.setItem(
    STORAGE_KEY_FOR_TESTS,
    JSON.stringify({
      schemaVersion: 10,
      codes: { progress: {}, turn: 0, settings: { importanceFilter: { mandatory: true, rare: true, unnecessary: true } } },
      geo: {
        blind: { progress: {}, turn: 0 },
        name: { progress: {}, turn: 0 },
        settings: { categoryFilter: { street: true, highway: true, city: true, state: true } },
      },
      law: { progress: {}, turn: 0, settings: { themeFilter: { pojmy: false } } },
    }),
  );
  __resetCacheForTests();
  const s = loadState();
  expect(s.law.settings.themeFilter.pojmy).toBe(false);
  expect(s.law.settings.themeFilter.scenky).toBe(true);
});
```

- [ ] **Step 2: Ověřit fail**

Run: `npx vitest run src/shared/storage.test.ts`
Expected: FAIL (schemaVersion je 9, sourceFilter existuje, scenky neexistuje; TS chyby na `themeFilter.scenky`).

- [ ] **Step 3: Implementace v storage.ts**

1. Smazat blok `LAW_SOURCE_KEYS` / `LawSource` / `LawSourceFilter` (řádky 47–49).
2. `LAW_THEME_KEYS`: přidat `'scenky'` za `'paragrafy'`.
3. `LawSlice`:

```ts
export interface LawSlice {
  progress: Record<string, ProgressEntry>;
  turn: number;
  settings: { themeFilter: LawThemeFilter };
}
```

4. `defaultLawSettings()`:

```ts
function defaultLawSettings(): LawSlice['settings'] {
  return {
    themeFilter: Object.fromEntries(LAW_THEME_KEYS.map((k) => [k, true])) as LawThemeFilter,
  };
}
```

5. `PersistedState.schemaVersion: 10;` a `initialState.schemaVersion: 10`.
6. Přejmenovat `normalizeToV9` → `normalizeToV10`, uvnitř `schemaVersion: 10` a law settings:

```ts
    law: {
      progress: s.law?.progress ?? {},
      turn: s.law?.turn ?? 0,
      settings: {
        themeFilter: {
          ...defaultLawSettings().themeFilter,
          ...(s.law?.settings?.themeFilter ?? {}),
        },
      },
    },
```

(Klíč `sourceFilter` z payloadu se prostě nepřebírá — tím je stripnutý. Komentář nad funkcí aktualizovat: „v9/v8 → v10: drop sourceFilter, + scenky theme; terminál všech řetězů i lenient v10 read.")
7. `readFromStorage`: první větev `if ((parsed?.schemaVersion === 10 || parsed?.schemaVersion === 9 || parsed?.schemaVersion === 8) && parsed.codes) return normalizeToV10(parsed);` a všechny ostatní `normalizeToV9(` → `normalizeToV10(`.
8. V existujících testech `storage.test.ts` nahradit očekávání `schemaVersion).toBe(9)` → `toBe(10)` a fixtures se `sourceFilter` upravit (odstranit klíč; kde fixture staví v9 payload pro migrační test, NECHAT — je to vstup migrace).

- [ ] **Step 4: Ověřit pass**

Run: `npx vitest run src/shared/storage.test.ts`
Expected: PASS. (Zbytek repa teď NEkompiluje — spraví Tasky 2–3; storage test file musí být zelený.)

- [ ] **Step 5: Commit**

```bash
git add src/shared/storage.ts src/shared/storage.test.ts
git commit -m "feat(storage)!: schema v10 — bez law sourceFilter, + tema scenky"
```

---

### Task 2: Typy, data a review modul bez source

**Files:**
- Modify: `src/modules/law/data/types.ts`, `src/modules/law/data/questions.ts`, `src/modules/law/data/questions.test.ts`
- Modify: `src/modules/law/review/serializeQuestions.ts`, `src/modules/law/review/parseQuestionsMd.ts`, `src/modules/law/review/formatQuestionsTs.ts` (+ jejich testy a `roundtrip.test.ts` fixtures)

**Interfaces:**
- Consumes: Task 1 (storage bez LawSource, LAW_THEME_KEYS se `scenky`).
- Produces: `LawBase` bez `source`; `types.ts` bez `LAW_SOURCES`/`LawSource`; dataset bez `source:` řádků, 28 scének s `theme: 'scenky'`; serializace se skupinami `## <theme>` a meta bez source; parser bez `sourceFromId`; format bez `source:` emise.

- [ ] **Step 1: types.ts**

```ts
import { LAW_THEME_KEYS, type LawTheme } from '@/shared/storage';
export type { LawTheme };
export const LAW_THEMES = LAW_THEME_KEYS;

interface LawBase {
  id: string;
  theme: LawTheme;
  prompt: string;
  /** Krátký titulek pro chip v LawSidePanel (fallback na prompt). */
  title?: string;
  ref?: string;
  note?: string;
  scenario?: string;
}
```

(Zbytek souboru — LawChoice/LawText/LawExpected/LawEnumeration/LawMatch/LawQuestion — beze změny.)

- [ ] **Step 2: Datová transformace questions.ts**

Spustit (jednorázový skript, necommituje se):

```bash
node -e "
const fs = require('fs');
let ts = fs.readFileSync('src/modules/law/data/questions.ts', 'utf8');
// 1) smazat source radky
const before = (ts.match(/^\s*source: '(lea|penal|sasp)',$/gm) ?? []).length;
ts = ts.replace(/^\s*source: '(lea|penal|sasp)',\n/gm, '');
// 2) retheme scenek: kazdy top-level blok s matcher: 'paragraph' dostane theme: 'scenky'
const blocks = ts.split(/^(?=  \{)/m);
let rethemed = 0;
const out = blocks.map((b) => {
  if (b.includes(\"matcher: 'paragraph'\") && b.includes(\"theme: 'paragrafy'\")) {
    rethemed++;
    return b.replace(\"theme: 'paragrafy'\", \"theme: 'scenky'\");
  }
  return b;
}).join('');
fs.writeFileSync('src/modules/law/data/questions.ts', out);
console.log('source removed:', before, 'rethemed:', rethemed);
"
```

Expected výstup: `source removed: 137 rethemed: 28`. Pokud čísla nesedí, STOP a prozkoumat.

- [ ] **Step 3: questions.test.ts**

- Smazat helper `bySource`, test „has expected per-source counts" nahradit:

```ts
it('has expected counts', () => {
  expect(LAW_QUESTIONS).toHaveLength(137);
});
```

- Smazat celý test „IDs are prefixed by their source".
- V testu source/theme validity odstranit source část (nechat jen theme):

```ts
it('every question has a valid theme', () => {
  for (const q of LAW_QUESTIONS) {
    expect(LAW_THEMES, q.id).toContain(q.theme);
  }
});
```

(Import `LAW_SOURCES` odstranit.)

- [ ] **Step 4: Review modul — kompilační úpravy**

`serializeQuestions.ts`:
- smazat `SOURCE_LABEL` konstantu;
- skupinový nadpis: `const g = \`## ${q.theme}\`;`

`parseQuestionsMd.ts`:
- smazat funkci `sourceFromId` a její volání (blok `const source = sourceFromId(s.id); if (!source) { err(...); continue; }`);
- z `base` objektu odstranit `source,`;
- odstranit import `LawSource` z typů.

`formatQuestionsTs.ts`:
- smazat řádek `l.push(\`    source: ${S(q.source)},\`);`

Testy review modulu: v fixtures všech čtyř test souborů (`serializeQuestions.test.ts`, `parseQuestionsMd.test.ts`, `formatQuestionsTs.test.ts`, `roundtrip.test.ts`) odstranit `source: '…',` z objektů; v `parseQuestionsMd.test.ts` smazat test „hlásí neznámý prefix ID" (prefix už nic neznamená — ID je opaque); v `formatQuestionsTs.test.ts` upravit aserce, které čekají `source:` v emisi (odstranit).

- [ ] **Step 5: Testy**

Run: `npx vitest run src/modules/law/data/ src/modules/law/review/ src/shared/storage.test.ts`
Expected: PASS — round-trip nad 137 otázkami zelený, retheme scének prošel validací témat (scenky je v LAW_THEME_KEYS z Tasku 1).

- [ ] **Step 6: Commit**

```bash
git add src/modules/law/data/ src/modules/law/review/
git commit -m "feat(law)!: ploche otazky bez source, scenky jako tema, opaque ID"
```

---

### Task 3: Aplikační vrstva — UI, selection, settings, analytika + test sweep

**Files:**
- Modify: `src/modules/law/state/selection.ts`, `src/modules/law/state/useLawSettings.ts`, `src/modules/law/components/LawPage.tsx`, `src/modules/law/components/LawSidePanel.tsx`, `src/modules/law/components/LawMobilePanel.tsx`, `src/shared/analytics.ts`
- Test: `src/modules/law/state/selection.test.ts`, `src/modules/law/components/LawSidePanel.test.tsx`, `src/modules/law/components/LawPage.test.tsx`, `src/shared/analytics.test.ts` + Gotcha 11 sweep všech fixtures

**Interfaces:**
- Consumes: Task 1–2 (LawSlice bez sourceFilter, LawQuestion bez source).
- Produces: `eligibleQuestions(state, all, themeFilter)` / `isLawComplete(state, all, themeFilter)` / `pickNextQuestion(state, all, themeFilter)`; `useLawSettings(): { themeFilter, setTheme }`; `LawPanelItem` bez `source`; `LawSidePanel`/`LawMobilePanel` props bez `sourceFilter`/`onSetSource`; `trackLawAnswered({ kind, success, question_id })`.

- [ ] **Step 1: selection.ts + test**

```ts
export function eligibleQuestions(
  state: LawSliceState,
  all: readonly LawQuestion[],
  themeFilter: LawThemeFilter,
): LawQuestion[] {
  return all.filter(
    (q) => themeFilter[q.theme] && (state.progress[q.id]?.score ?? 0) < MAX_SCORE,
  );
}
```

(`isLawComplete` a `pickNextQuestion` analogicky ztrácí sourceFilter parametr; import `LawSourceFilter` pryč.) V `selection.test.ts` odstranit sourceFilter argumenty a source pole fixtures; případný test filtrování podle source smazat/nahradit theme variantou.

- [ ] **Step 2: useLawSettings.ts**

```ts
export function useLawSettings() {
  const state = useSyncExternalStore(subscribeState, getSnapshot, getSnapshot);
  const { themeFilter } = state.law.settings;

  const setTheme = useCallback((key: LawThemeKey, value: boolean) => {
    const cur = loadState();
    saveState(setSettings(cur, {
      themeFilter: { ...cur.law.settings.themeFilter, [key]: value } as LawThemeFilter,
    }));
  }, []);

  return { themeFilter, setTheme };
}
```

- [ ] **Step 3: LawSidePanel + LawMobilePanel + LawPage**

`LawSidePanel.tsx`:
- smazat `SOURCE_LABEL`, `SOURCE_ABBR`, celý `<fieldset>` se zdroji (testidy `law-filter-source-*`), props `sourceFilter`/`onSetSource`, import `LAW_SOURCE_KEYS`/`LawSourceFilter`/`LawSource`;
- `LawPanelItem` bez `source`; filtr: `items.filter((it) => themeFilter[it.theme])`;
- v chip `inner` smazat `<span …>{SOURCE_ABBR[it.source]}</span>`;
- `THEME_LABEL` doplnit `scenky: 'Scénky',`.

`LawMobilePanel.tsx`: stejné odstranění props/fieldsetu (zrcadlí SidePanel).

`LawPage.tsx`:
- `panelItems` bez `source`;
- `useLawSettings()` destrukturace bez `sourceFilter`/`setSource`; volání `pickNextQuestion(…, themeFilter)` / `isLawComplete(…, themeFilter)`;
- `sidePanel()` bez `sourceFilter`/`onSetSource`;
- `trackLawAnswered({ kind: …, success: …, question_id: … })` (bez source) na všech 4 místech.

`analytics.ts`:

```ts
export function trackLawAnswered(props: {
  kind: 'choice' | 'text' | 'enumeration' | 'match';
  success: boolean;
  question_id: string;
}): void {
  if (!initialized) return;
  mixpanel.track('law_answered', props);
}
```

(`analytics.test.ts`: upravit očekávané props.)

- [ ] **Step 4: Gotcha 11 sweep — všechna hardcoded saveState fixtures na v10**

Run: `grep -rln "schemaVersion: 9" src/ e2e/`
Pro každý nalezený soubor: `schemaVersion: 9` → `schemaVersion: 10`; v law settings odstranit `sourceFilter: {…}` a doplnit `scenky: true` do `themeFilter`. Kanonický tvar law slice ve fixtures:

```ts
law: {
  progress: {},
  turn: 0,
  settings: {
    themeFilter: {
      pojmy: true, hodnosti: true, jednani: true, rto: true, vybava: true,
      zasah: true, zadrzeni: true, kriminalistika: true, paragrafy: true, scenky: true,
    },
  },
},
```

(Migrační testy ve `storage.test.ts`, které záměrně staví v1–v9 payloady jako VSTUP, se nemění.)

`LawSidePanel.test.tsx`: odstranit source props/aserce; případné testy source checkboxů nahradit theme variantou (`law-filter-theme-scenky` existuje a je checked). `LawPage.test.tsx`: fixtures dle výše; jinak beze změny (selektory dle textu).

- [ ] **Step 5: Kompletní unit testy**

Run: `npm test`
Expected: PASS — celé repo kompiluje, žádný odkaz na source: `grep -rn "sourceFilter\|LAW_SOURCE_KEYS\|LawSource\b" src/ | grep -v test` → prázdné.

- [ ] **Step 6: Commit**

```bash
git add src/ 
git commit -m "feat(law)!: UI, selection, settings a analytika bez source dimenze"
```

---

### Task 4: E2E — seed v10, jedno ID pole, theme filtr

**Files:**
- Modify: `e2e/fixtures/seed.ts`, `e2e/law/filter.spec.ts`, `e2e/law/persistence.spec.ts` (jen pokud asertuje law settings tvar)

**Interfaces:**
- Consumes: Tasky 1–3.
- Produces: `seed()` zapisuje v10 payload (law.settings jen `themeFilter` s 10 klíči); JEDINÝ export `LAW_QUESTION_IDS` (literál 137 ID, `as const`); `LEA_QUESTION_IDS`/`PENAL_SCENARIO_IDS`/`SASP_QUESTION_IDS` SMAZÁNY; `pinNextLawQuestion` beze změny signatury.

- [ ] **Step 1: seed.ts**

- `persisted.schemaVersion: 10 as const`; v `law.settings` smazat `sourceFilter` a doplnit `scenky: true` do `themeFilter`.
- Smazat tři pole a jejich doc-komentáře; nahradit jediným literálem (vygenerovat aktuální obsah):

```bash
node -e "
require('tsx/cjs');
const { LAW_QUESTIONS } = require('./src/modules/law/data/questions.ts');
console.log('export const LAW_QUESTION_IDS = [');
for (const q of LAW_QUESTIONS) console.log(\`  '\${q.id}',\`);
console.log('] as const;');
" 
```

a vložit místo současné definice `LAW_QUESTION_IDS` (s doc-komentářem: `/** Vsech 137 law question IDs — musi sedet s questions.ts; regeneruje npm run questions:import. */`).
- Ověřit, že nic jiného tři stará pole neimportuje: `grep -rn "LEA_QUESTION_IDS\|PENAL_SCENARIO_IDS\|SASP_QUESTION_IDS" e2e/ scripts/ src/` — jediný povolený zbytek je `scripts/questions-import.ts` (spraví Task 7; do té doby import skript NEfunguje — poznamenat v commit message).

- [ ] **Step 2: filter.spec.ts — source testy → theme testy**

Nahradit první dva testy:

```ts
test('theme filter checkboxes include scenky and are checked by default', async ({ page }) => {
  await seed(page, { randomSeed: 1 });
  await page.goto('/#/law');
  await expect(page.getByTestId('law-filter-theme-scenky')).toBeChecked();
  await expect(page.getByTestId('law-filter-theme-paragrafy')).toBeChecked();
});

test('disabling scenky theme hides scenario chips from the panel', async ({ page }) => {
  await seed(page, { randomSeed: 1 });
  await page.goto('/#/law');
  await page.getByTestId('law-group-scenky').click();
  await expect(page.getByTestId('chip-penal.scenario.A1')).toBeVisible();
  await page.getByTestId('law-filter-theme-scenky').uncheck();
  await expect(page.getByTestId('chip-penal.scenario.A1')).toHaveCount(0);
});
```

Zbylé tři testy beze změny.

- [ ] **Step 3: persistence.spec.ts**

Zkontrolovat aserce na tvar law slice (test „migrating a v1 storage payload…"): pokud čte `state.law.settings.sourceFilter`, odstranit; jinak beze změny (migrační řetěz v1→v10 funguje z Tasku 1).

- [ ] **Step 4: E2E běh + commit**

Run: `npm run test:e2e`
Expected: 60 passed.

```bash
git add e2e/
git commit -m "test(e2e)!: seed v10, jedine LAW_QUESTION_IDS pole, theme filtr scenky"
```

---

### Task 5: Markdown v2 — anglické kódy + legenda s popisem polí

**Files:**
- Modify: `src/modules/law/review/serializeQuestions.ts`, `src/modules/law/review/parseQuestionsMd.ts`
- Test: `src/modules/law/review/serializeQuestions.test.ts`, `src/modules/law/review/parseQuestionsMd.test.ts` (aktualizace očekávání), `roundtrip.test.ts` (beze změny — musí zůstat zelený)

**Interfaces:**
- Produces: meta řádek `- type: <code> | theme: <t> [| ref: <r>] [| ordered: true]`; kódy `choice|text|enumeration-alias|enumeration-paragraph|match`; pod-řádky `aliases:`/`keywords:`/`key:`/`sub:`; nová LEGEND (níže). Parser zrcadlí. České obsahové labely beze změny.

- [ ] **Step 1: Upravit testy serializace (failing)**

V `serializeQuestions.test.ts` nahradit očekávání meta řádků a pod-řádků:

```ts
expect(md).toContain('- type: choice | theme: vybava');
expect(md).toContain('- type: enumeration-alias | theme: paragrafy | ref: §7 A');
expect(md).toContain('- type: enumeration-paragraph | theme: scenky | ordered: true');
expect(md).toContain('   - aliases: uniforma');
expect(md).toContain('   - keywords: stejnokroj');
expect(md).toContain('   - key: lea.7.A.1a');
expect(md).toContain('   - sub: a');
```

(Fixture penal otázky změnit `theme: 'paragrafy'` → `'scenky'` pro soulad s datasetem; test „omits aliasy/keywords sublines" přejmenovat kotvy na `- aliases:` / `- keywords:`.) Přidat test legendy:

```ts
it('legend explains fields including type codes and keywords semantics', () => {
  expect(md).toContain('enumeration-alias');
  expect(md).toContain('keywords');
  expect(md).toContain('NEW');
});
```

Run: `npx vitest run src/modules/law/review/serializeQuestions.test.ts` → FAIL.

- [ ] **Step 2: serializeQuestions.ts**

`kindLabel`:

```ts
function kindLabel(q: LawQuestion): string {
  if (q.kind === 'enumeration') {
    return q.matcher === 'paragraph' ? 'enumeration-paragraph' : 'enumeration-alias';
  }
  return q.kind; // 'choice' | 'text' | 'match'
}
```

`metaLine`:

```ts
  const parts = [`type: ${kindLabel(q)}`, `theme: ${q.theme}`];
  if (q.ref) parts.push(`ref: ${q.ref}`);
  if (q.kind === 'enumeration' && q.ordered) parts.push('ordered: true');
```

Pod-řádky výčtů: `   - aliases: …`, `   - keywords: …`, `   - key: ${e.key}`, `   - sub: ${e.subId}`.

`LEGEND` nahradit:

```ts
const LEGEND = `# Přehled otázek — Teorie (/law)

> Návod pro recenzenta — co jednotlivá pole znamenají:
>
> - Nadpis otázky: \`### Titulek \\\`id\\\`\` — id v backticks je technický klíč, NEEDITUJ ho.
> - \`type\` — druh otázky (kód, needituj): choice = výběr z možností,
>   text = volná textová odpověď, enumeration-alias = vyjmenování položek,
>   enumeration-paragraph = určení paragrafů ke scénce, match = přiřazování dvojic.
> - \`theme\` — kategorie otázky (kód): pojmy, hodnosti, jednani, rto, vybava,
>   zasah, zadrzeni, kriminalistika, paragrafy, scenky.
> - \`ref\` — odkaz na paragraf/zdroj, jen informativní.
> - \`ordered: true\` — u výčtu záleží na pořadí položek.
> - Možnosti: [x] = správná odpověď, [ ] = špatná; zaškrtnutí můžeš měnit.
> - Aliasy (u textových otázek a položek jako \`aliases:\`) — alternativní PŘESNÁ
>   znění, která se uznávají jako správná odpověď. Odděluj středníkem.
> - \`keywords:\` — kmeny slov pro tolerantní uznání parafráze (odpověď se uzná,
>   když kmen obsahuje). Měň jen s rozmyslem — moc obecný kmen uzná i špatnou odpověď.
> - \`key:\` a \`sub:\` — technické klíče vyhodnocení, NEEDITUJ.
> - Texty (Zadání, Scénka, možnosti, Vysvětlivka, položky) přepisuj volně.
> - Smazání otázky: napiš do její sekce na samostatný řádek slovo SMAZAT.
> - Nová otázka: přidej sekci \`### Titulek \\\`NEW\\\`\` s řádkem
>   \`- type: … | theme: …\` a tělem podle typu (viz existující otázky stejného
>   typu). ID se vygeneruje automaticky při importu. U výčtových položek můžeš
>   \`key:\` vynechat (vygeneruje se), u enumeration-paragraph je povinný
>   (číslo paragrafu, např. 25b).
`;
```

- [ ] **Step 3: parseQuestionsMd.ts — zrcadlo**

- `KIND_BY_LABEL` klíče: `'choice'`, `'text'`, `'enumeration-alias'` (matcher alias), `'enumeration-paragraph'` (matcher paragraph), `'match'`.
- Meta: prefix `- type: `; klíče `type`/`theme`/`ref`; ordered: `meta.get('ordered') === 'true'`. Chybová hláška `neznámý typ "…"` zůstává.
- Sub-line regex: `/^ {3}- (aliases|keywords|key|sub): (.*)$/` (+ přiřazení `key`/`sub` místo `klíč`/`sub`).
- `isRecognizedLine`: aktualizovat vzory (`- type: `, nové pod-řádky); české obsahové labely beze změny.
- V `parseQuestionsMd.test.ts` upravit mutace: `'typ: výběr'` → `'type: choice'`, `'typ: kviz'` → `'type: kviz'` (hláška `neznámý typ "kviz"` zůstává).

- [ ] **Step 4: Testy**

Run: `npx vitest run src/modules/law/review/`
Expected: PASS včetně round-tripu (137 otázek, anglické kódy tam i zpět).

- [ ] **Step 5: Commit**

```bash
git add src/modules/law/review/
git commit -m "feat(law): review markdown v2 — anglicke code listy a legenda s popisem poli"
```

---

### Task 6: Přidávání nových otázek (`NEW`)

**Files:**
- Modify: `src/modules/law/review/parseQuestionsMd.ts`
- Test: `src/modules/law/review/parseQuestionsMd.test.ts`

**Interfaces:**
- Consumes: md v2 grammar (Task 5); `normalize` z `../../../shared/text/normalize` (relativní import!) pro slug klíčů.
- Produces: heading `### <Titulek> \`NEW\`` → otázka s vygenerovaným `id: q<n>`; `n = max(/^q(\d+)$/ přes všechna ID v souboru i dříve přidělená) + 1`; u `enumeration-alias` položek bez `key:` slug z labelu (`normalize(label)` s mezerami → `-`); u `enumeration-paragraph` chybějící `key:` = chyba. Nadpis bez backticks zůstává chybou.

- [ ] **Step 1: Failing testy**

```ts
describe('parseQuestionsMd — nové otázky (NEW)', () => {
  const NEW_SECTION = [
    '### Nová otázka `NEW`',
    '- type: choice | theme: vybava',
    '**Zadání:** Testovací?',
    '**Možnosti:** (zaškrtnuté = správné)',
    '- [x] a',
    '- [ ] b',
    '- [ ] c',
    '- [ ] d',
    '- [ ] e',
  ].join('\n');

  it('NEW section gets generated id q1 when no q-ids exist', () => {
    const parsed = parseQuestionsMd(validMd() + '\n' + NEW_SECTION + '\n');
    expect(parsed.questions.map((q) => q.id)).toContain('q1');
    const nq = parsed.questions.find((q) => q.id === 'q1')!;
    expect(nq.title).toBe('Nová otázka');
    expect(nq.theme).toBe('vybava');
  });

  it('two NEW sections get sequential ids; existing q-ids raise the counter', () => {
    const base = validMd().replace(/sasp\.choice\.vybava\.1/g, 'q7');
    const second = NEW_SECTION.replace('Nová otázka', 'Druhá nová');
    const parsed = parseQuestionsMd(base + '\n' + NEW_SECTION + '\n' + second + '\n');
    const ids = parsed.questions.map((q) => q.id);
    expect(ids).toContain('q8');
    expect(ids).toContain('q9');
  });

  it('NEW enumeration-alias item without key gets a slug key', () => {
    const md = validMd() + '\n' + [
      '### Výčtová nová `NEW`',
      '- type: enumeration-alias | theme: vybava',
      '**Zadání:** Vyjmenuj.',
      '**Položky:**',
      '1. **Služební pouta**',
    ].join('\n') + '\n';
    const parsed = parseQuestionsMd(md);
    const nq = parsed.questions.find((q) => q.title === 'Výčtová nová')!;
    expect(nq.kind).toBe('enumeration');
    expect((nq as { expected: { key: string }[] }).expected[0]!.key).toBe('sluzebni-pouta');
  });

  it('NEW enumeration-paragraph item without key is an error', () => {
    const md = validMd() + '\n' + [
      '### Scénková nová `NEW`',
      '- type: enumeration-paragraph | theme: scenky',
      '**Zadání:** Které paragrafy?',
      '**Položky:**',
      '1. **§25 b**',
    ].join('\n') + '\n';
    expect(() => parseQuestionsMd(md)).toThrow(/key/);
  });

  it('SMAZAT in a NEW section just drops it (no deletedIds entry)', () => {
    const md = validMd() + '\n' + NEW_SECTION + '\nSMAZAT\n';
    const parsed = parseQuestionsMd(md);
    expect(parsed.questions).toHaveLength(1);
    expect(parsed.deletedIds).toEqual([]);
  });
});
```

Run: `npx vitest run src/modules/law/review/parseQuestionsMd.test.ts` → FAIL (NEW id neprojde stávající gramatikou — heading regex je lowercase).

- [ ] **Step 2: Implementace**

1. Heading regex rozšířit o sentinel: `/^### (.+) \`(NEW|[a-zA-Z0-9.-]+)\`\s*$/` a `isNew = m[2] === 'NEW'` na sekci.
2. SMAZAT větev: pokud `isNew`, sekci jen přeskočit (nepřidávat do `deletedIds`).
3. Duplicitní-ID check přeskočit pro `isNew` sekce.
4. Po zparsování všech sekcí (před `if (errors.length…)`) přidělit ID:

```ts
let nextQ =
  1 +
  Math.max(
    0,
    ...sections
      .filter((s) => !s.isNew)
      .map((s) => {
        const m = /^q(\d+)$/.exec(s.id);
        return m ? Number(m[1]) : 0;
      }),
  );
for (const q of questions) {
  if (q.id === NEW_ID_PLACEHOLDER) {
    (q as { id: string }).id = `q${nextQ}`;
    nextQ += 1;
  }
}
```

(Placeholder: NEW sekce se parsují s `id = NEW_ID_PLACEHOLDER` konstantou `'__NEW__'`; pořadí přidělení = pořadí v souboru.)
5. Slug klíčů: při flushi výčtové položky s prázdným `key`:
   - matcher `alias` a sekce `isNew`: `item.key = normalize(item.label).replace(/ /g, '-')`; kolize v rámci otázky → `err(no, 'duplicitní vygenerovaný key — přejmenuj položku')`;
   - matcher `paragraph` (kdykoli) nebo existující otázka: stávající chyba `chybí "key:"` (hláška obsahuje `key`).
6. Import normalize: `import { normalize } from '../../../shared/text/normalize';`

- [ ] **Step 3: Testy**

Run: `npx vitest run src/modules/law/review/`
Expected: PASS (včetně round-tripu a uzavřené gramatiky — nadpis bez backticks dál chyba).

- [ ] **Step 4: Commit**

```bash
git add src/modules/law/review/
git commit -m "feat(law): pridavani novych otazek pres NEW sentinel v review markdownu"
```

---

### Task 7: Import skript, smoke, CLAUDE.md, finální verifikace

**Files:**
- Modify: `scripts/questions-import.ts`, `CLAUDE.md`
- Regenerated by smoke: `src/modules/law/data/questions.ts`, `e2e/fixtures/seed.ts`, `src/modules/law/data/questions.test.ts`

**Interfaces:**
- Consumes: vše výše; seed.ts má jediné pole `LAW_QUESTION_IDS` (Task 4); questions.test.ts má jediný count (Task 2).

- [ ] **Step 1: questions-import.ts**

Nahradit per-source logiku:

```ts
const allIds = questions.map((q) => q.id);

let seedContent = readFileSync('e2e/fixtures/seed.ts', 'utf8');
seedContent = replaceArray(seedContent, 'LAW_QUESTION_IDS', allIds);
writeFileSync('e2e/fixtures/seed.ts', seedContent);

let testContent = readFileSync('src/modules/law/data/questions.test.ts', 'utf8');
testContent = replaceCount(testContent, /(expect\(LAW_QUESTIONS\)\.toHaveLength\()\d+(\))/, questions.length);
writeFileSync('src/modules/law/data/questions.test.ts', testContent);
```

(Smazat `idsBySource`, tři `replaceArray` volání, komentářové replacy `// LEA (n)` atd. a per-source `replaceCount` volání. Zachovat: atomicitu — všechny výstupy spočítat před zápisy; souhrn rozšířit o nová ID: `if (newIds.length) console.log(\`Nové otázky: ${newIds.join(', ')}\`)` kde `newIds = allIds.filter((i) => /^q\d+$/.test(i))` jen informativně.)

- [ ] **Step 2: Smoke + idempotence**

```bash
npm run questions:export
npm run questions:import
git diff --stat
```

Expected: import vypíše `137 otázek`; diff prázdný nebo jen jednorázová normalizace (po Task 2 datové transformaci se formát mohl mikroskopicky lišit — pokud diff není prázdný, zopakovat export→import: druhé kolo MUSÍ dát prázdný diff). Pak NEW end-to-end ručně:

```bash
npm run questions:export
printf '\n### Zkušební nová otázka `NEW`\n- type: choice | theme: vybava\n**Zadání:** Zkouška?\n**Možnosti:** (zaškrtnuté = správné)\n- [x] a\n- [ ] b\n- [ ] c\n- [ ] d\n- [ ] e\n' >> docs/questions-review.md
npm run questions:import
grep -n "'q1'" src/modules/law/data/questions.ts e2e/fixtures/seed.ts
npx vitest run src/modules/law/data/questions.test.ts
git checkout -- src/modules/law/data e2e/fixtures    # zkušební otázku zahodit
```

Expected: `q1` v obou souborech, count test zelený se 138, po checkoutu čistý stav.

- [ ] **Step 3: Kompletní testy**

Run: `npm run test:all`
Expected: vše zelené. Poznamenat finální počty.

- [ ] **Step 4: CLAUDE.md**

Aktualizovat (grep kotvy: `sourceFilter`, `lea/penal/sasp`, `schemaVersion 9`, `v9`, `139`, `LAW_SOURCES`, `dvouúrovňový filtr`):
1. Datový model: law slice bez sourceFilter, schemaVersion 10, 10 témat (+ scenky); migrace v9→v10 popsat (`normalizeToV10` terminál).
2. Teorie sekce: jeden filtr (témata), otázky bez source, ID je opaque klíč (nové `q<n>`), scénky = téma `scenky`.
3. Analytics tabulka: `law_answered` bez `source`.
4. Review workflow: md v2 (anglické kódy type/theme/ref/ordered, pod-řádky aliases/keywords/key/sub, legenda s popisem polí), přidávání otázek přes `NEW` (ID generuje import), seed má jediné `LAW_QUESTION_IDS`.
5. Gotchy: aktualizovat Gotchu 11 (v10 fixtures bez sourceFilter, 10 témat), Gotchu 29 (schema je v10), Gotchu 43 (jediné pole, regeneruje import — vč. nových otázek).
6. Počty testů dle Step 3.
7. „Nový obsah do Teorie": zmínit obě cesty — TS literál NEBO review md `NEW`.

- [ ] **Step 5: Commit**

```bash
git add scripts/questions-import.ts CLAUDE.md
git commit -m "feat(law): import s jedinym ID polem + podpora NEW; docs plochy model"
```
