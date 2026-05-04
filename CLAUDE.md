# CLAUDE.md

Pracovní paměť pro budoucí seance. Stručně a věcně.

## Co to je

Edukativní webová aplikace pro PD (Police Department) na serveru `genk.cz`. Aktuálně
funkční moduly:

1. **Desítkové kódy** (`/codes`) — dva režimy: psaní kódu (`/codes/write`),
   výběr významu (`/codes/choose`).
2. **Law Enforcement Act quiz** (`/laws/lea`) — free-text recall paragrafů.
   Stackovaný seznam odpovědí (correct / wrong / duplicate / missed) s
   barevným okrajem + autocomplete s šipkovou navigací + sjednocený reveal,
   kde se po Vyhodnotit otázku přebarví existující řádky a doplní zapomenuté
   pod divider "Zapomněl jsi:".

Rozcestník `/laws` (komponenta `LawsIndex`) má LEA aktivní, **Penal Code** a
**Firearm Act** jsou disabled (`aria-disabled`, čekají na implementaci).
**SASP příručka** (`/sasp`) je ještě jako `<ComingSoonPage>`.

Pure-frontend, žádný backend. Veškerý stav v `localStorage` (klíč `genk-pd:v1`,
schemaVersion 2).

## Stack

- Vite 6 + React 18 + TypeScript 5.6
- Tailwind CSS 3.4 (SASP paleta v `tailwind.config.js`: `sasp-bg`, `sasp-navy`,
  `sasp-navy-light`, `sasp-tan`, `sasp-gold`, `sasp-red`, `sasp-ink`, `sasp-ink-dim`)
- React Router 6 (`createHashRouter` — pozor, ne Browser router; URL používá
  `#/laws/lea` formát)
- Vitest 2 (unit + component, jsdom)
- Playwright 1 (E2E, chromium-desktop + chromium-mobile)

## Příkazy

```
npm run dev        # vite dev server
npm run build      # tsc -b && vite build
npm run preview    # serve built dist on :4173
npm test           # vitest run (unit + component)
npm run test:e2e   # playwright (spustí si dev server sám)
npm run test:all   # vše
```

`npm run test:all` musí být zelené: **148 unit/component + 35 E2E = 183 testů**.
Žádná manuální verifikace — pokud něco rozbiju, opravím a prohnám testy.

## Adresářová struktura

```
src/
  app/                              # Shell: AppLayout, HomePage, ComingSoonPage, routes.tsx
  modules/
    codes/                          # Modul desítkových kódů
      data/codes.ts                 # Statická data 10-X kódů (z docs/codes.md)
      state/
        useCodeProgress.ts          # Skóre/turn (useSyncExternalStore nad storage.ts)
        useSettings.ts              # Filtr důležitosti
        selection.ts                # pickNextCode (deleguje na shared/quiz/pickNextFromPool)
        distractors.ts              # buildOptions pro mód 2
      components/                   # CodesPage, ModeWrite, ModeChoose, SidePanel,
                                    # ImportanceFilter, ResetButton, CongratsBanner
    laws/                           # Modul zákonů
      components/LawsIndex.tsx      # /laws rozcestník (LEA aktivní, ostatní disabled)
      lea/                          # LEA quiz sub-modul
        data/
          types.ts                  # AnswerItem, Question rozhraní
                                    # (Question má description: krátký popis pro SidePanel)
          questions.ts              # LEA_QUESTIONS — 17 otázek, 94 položek, ~490 aliasů
        logic/
          match.ts                  # matchAnswer — exact equality po normalize
          suggest.ts                # suggestItems — autocomplete, min 4 znaky, max 5 návrhů
        state/
          selection.ts              # pickNextQuestion + isLeaComplete
          useLeaProgress.ts         # Skóre/turn pro lea slice (delta ±2)
        components/                 # LeaQuizPage, AnswerInput, AnswerList, AnswerRow,
                                    # SubmitFooter, SidePanel, LeaResetButton
  shared/
    storage.ts                      # Versionovaný localStorage wrapper, schemaVersion 2,
                                    # migrate v1→v2 při readu, lenient v2 read
    rng.ts                          # Pluggable RNG (mulberry32, seed přes localStorage)
    useMediaQuery.ts                # SSR-safe matchMedia hook
    text/normalize.ts               # NFD strip diakritiky + lowercase + whitespace collapse
    quiz/pickNextFromPool.ts        # Generic weighted-random + cooldown picker
    ui/BadgeIcon.tsx                # SVG hvězda s "PD"
    analytics.ts                    # Mixpanel wrapper (init + typed track* fns,
                                    # no-op před initAnalytics, mockovaný v testech)
  styles/index.css                  # Tailwind directives + .card / .btn-* / .chip
                                    # (codes only) / .answer-input* / .answer-list*
                                    # /.answer-row* (4 stavy: correct/duplicate/wrong/
                                    # missed) / .reveal-perfect / .submit-footer*
                                    # /.autocomplete-* / .lea-page
  test/setup.ts                     # Vitest setup: jsdom, jest-dom, storage cache reset,
                                    # window.matchMedia stub (jsdom nemá)

e2e/
  fixtures/seed.ts                  # `seed(page, { codes-flat-fields, lea?: {...}, randomSeed? })`
                                    # Píše schemaVersion 2, exportuje LEA_QUESTION_IDS,
                                    # pinNextQuestion (codes), pinNextLeaQuestion (lea)
  codes/*.spec.ts                   # 7 spec souborů, 20 testů
  laws/lea/*.spec.ts                # 6 spec souborů (quiz-flow, matching, autocomplete,
                                    # submit-reveal, persistence, responsive), 15 testů
```

Nový modul (Penal Code, Firearm Act) → kopíruj strukturu `modules/laws/lea/`,
přidej route v `src/app/routes.tsx`, přidej do `LawsIndex.tsx`. Sdílené utility
(`normalize`, `pickNextFromPool`) jsou už generické.

## Datový model

```ts
// localStorage["genk-pd:v1"]
{
  schemaVersion: 2,
  codes: {
    progress: { [codeId]: { score: -3..+3, lastAskedAtTurn: number } },
    turn: number,
    settings: {
      importanceFilter: { mandatory: bool, rare: bool, unnecessary: bool }
    }
  },
  lea: {
    progress: { [questionId]: { score: -3..+3, lastAskedAtTurn: number } },
    turn: number
  }
}
```

**Migrace v1 → v2** (`src/shared/storage.ts:migrateV1ToV2`): při readu se v1
payload migruje v paměti — `codes` zachováno beze změny, `lea: { progress: {}, turn: 0 }`
přidáno. `saveState` vždy zapisuje v2.

**Lenient v2 read**: pokud v2 payload má `codes` ale chybí `lea`, dopočítáme defaultní
prázdnou lea slice — žádná data ztrát. (Test `storage.test.ts`.)

`STORAGE_KEY = 'genk-pd:v1'` se NEMĚNÍ při schema bumpu — jen JSON value uvnitř.
"v1" v key je legacy; verzování je v `schemaVersion` field.

### Codes scoring

Skóre `-3..+3`, sdílené mezi oběma módy. Delta ±1 per answer. Kód na `+3` vypadne
z poolu. Pool prázdný → `<CongratsBanner />`. Reset maže `progress` a `turn`,
**zachovává** settings.

### LEA scoring

Skóre `-3..+3` per otázka. Delta **±2** (NE ±1 jako u codes). Mastered na `+3`
(= 2 perfect submits z 0). `recordSubmit({ perfect: bool })` mění skóre. **Skip
funkcionalita byla odstraněna** — uživatel musí každou otázku vyhodnotit.
Reset maže jen `lea` slice, codes zůstávají. Reset je vystaven přes
`LeaResetButton` (pod kvízem vpravo, confirm dialog) a přes „Začít znovu"
na completion screen.

Default `importanceFilter` v `initialState` je **všechno true**. E2E `seed()` má
fallback `mandatory:true, rest:false` — záměrně, ať jsou spec soubory deterministické.

### Codes data

Kódy s A/B variantami z `docs/codes.md` (`10-14 A/B`, `10-99 A/B`) jsou v `CODES`
**sjednocené** do jednoho záznamu. Vyšší důležitost vyhrává (`mandatory > rare > unnecessary`).
Zdroj pravdy = `docs/codes.md`, parsováno **ručně** do TS literálu, ne za běhu.

### LEA data

`LEA_QUESTIONS` (17 otázek, 94 položek) v `src/modules/laws/lea/data/questions.ts`.
Každá otázka má `{ id, prompt, description, ref, items[] }`, každá položka má
`{ id, quote, aliases[], ref }`. `description` je krátký popis (~20–35 znaků,
nominalizace) zobrazený v SidePanelu vedle §ref.

Pokrytá paragrafy LEA: §7, §9 A/B, §10, §11, §12 A/C, §15, §16 B, §17 A, §18 A,
§19 A, §21 A, §23 B, §37. Question IDs jsou `lea.<paragraph>[.<section>]`,
item IDs `lea.<paragraph>.<section>.<sub>` (např. `lea.16.B.3b`).

**Křížové otázky z jiných zákonů** (sedí v LEA modulu z UX důvodů, i když paragrafy
nejsou LEA): `lea.zbrojni-prukaz` (Firearm Act §4) a `lea.ridicsky-prukaz`
(Penal Code §34/§36/§37/§58). Question ID je slug místo paragrafu, skutečná
reference je v poli `ref` (např. `§4 FA`, `§34 c) PC`). Při přidávání další
takové otázky držet stejný pattern — pokud bys chtěl/a paragrafový ID, narazíš
na test `unique question IDs` který by sice prošel, ale rozbil by se sémantický
předpoklad „ID prefix `lea.<n>` mapuje na §n LEA".

Zdroj surovin: `docs/lea-quiz-questions-draft.md` (kompletní seznam s aliasy,
udržovat sync s TS literálem).

`questions.test.ts` ověřuje: počet 15+89, unikátnost question/item IDs, neprázdné
quote+ref, neprázdné description per question, unikátnost aliasů uvnitř položky
(po normalize), **non-collision aliasů napříč položkami uvnitř jedné otázky**
(cross-question collision je OK — `výjimečný stav` se vyskytuje v několika
otázkách bez problému).

Pokrytí aliasů je nerovnoměrné — některé položky mají 18 aliasů (`lea.16.B.3b` =
maják), jiné jen 4–5 (např. `lea.15.A.5a` "evidentiary purpose"). Když se objeví
false-negative, lze rozšířit alias seznam ručně. **Strict legal correctness:** některé
parafráze, které se zdají správné, neodpovídají právnímu významu (např. "spáchal trestný
čin" ≠ "zbraň jako důkaz" v §15 5a) — nepřidávat aliasy, které posunou význam.

## Algoritmy

### Codes

**`pickNextCode(state, allCodes)`** (`src/modules/codes/state/selection.ts`)
deleguje na `pickNextFromPool` ze `@/shared/quiz/pickNextFromPool`. Před tím
filtruje codes přes `eligibleCodes` (importance filter + score < 3).

**`buildOptions(correct, allCodes)`** (`src/modules/codes/state/distractors.ts`):
1 správná + 2 ze stejné dekády (`10-40..10-49` pro `10-44`) + 2 náhodné. Distraktory
**ignorují filtr důležitosti** (taháno z celé množiny `CODES`). Když je dekáda chudá
(<2 jiných kódů), padne se na nejbližší podle `|Δnumber|`.

**Klávesy v ModeChoose**: `1`–`5` vybírá odpověď. Listener visí na `window` jen po dobu
aktivní otázky (efekt s deps `[current, choice, options, recordAnswer]`), ignoruje
modifikátory a `INPUT/TEXTAREA/contenteditable` cíle.

### Shared (codes + LEA)

**`pickNextFromPool<T extends { id: string }>(pool, progress, turn): T | null`**
(`src/shared/quiz/pickNextFromPool.ts`):
1. Eligibilní = `pool` (volající už profiltroval). Když prázdný → null.
2. Cooldown: `turn - lastAskedAtTurn >= 2`. Když by cooldown vyprázdnil pool, ruší ho.
3. Vážený výběr: `weight = 4 - score` (od `-3` váha 7, od `+2` váha 2). Používá
   `weightedRandom` z `@/shared/rng`.

**`normalize(s: string)`** (`src/shared/text/normalize.ts`): `lowercase` + `NFD` decompose
+ strip combining marks `[̀-ͯ]` + `\s+ → ' '` + trim. Pure function, používaná
LEA matching i suggest.

### LEA

**`matchAnswer(input, items): AnswerItem | null`** (`src/modules/laws/lea/logic/match.ts`):
strict full-string equality po `normalize` proti `quote` NEBO kterémukoliv `alias`.
**Žádný substring, žádná Levenshtein, žádná morfologie** — uživatel musí napsat něco,
co je v alias seznamu. Když chip turne červeně, alias chyběl.

**`suggestItems(input, items, excludeIds): AnswerItem[]`** (`src/modules/laws/lea/logic/suggest.ts`):
substring match (`indexOf` po normalize) přes quote + aliasy. Min length 4 (`AUTOCOMPLETE_MIN_LENGTH`),
max 5 výsledků (`AUTOCOMPLETE_MAX_RESULTS`), filter `excludeIds` (skryje už found items),
sort by earliest match position then quote length.

**Enter v `AnswerInput`** používá obojí: nejdřív zkusí `matchAnswer(value, items)`.
Pokud najde přesnou shodu (typed text je sám platný quote nebo alias) → commit.
Jinak když je nabídka otevřená a nějaká je → naplní input vybranou suggestion z
`highlight` (uživatel pak druhým Enterem commitne). Bez nabídky → commit jako
"wrong". Šipky ↑↓ jen mění `highlight`, Tab vždy fillne, Esc zavře nabídku.

**`pickNextQuestion(state, all)`** = `pickNextFromPool(eligibleQuestions(state, all), ...)`,
kde `eligibleQuestions` filtruje `score < 3`. (LEA nemá importance filter.)

### Progress bar (oba moduly)

`pct = Σ max(0, score(c)) / (3·N)` přes filtrované položky. Mínusové skóre se klampuje
na 0 jen pro UI (storage uchovává `-3..+3`, selection na něj spoléhá).

- **Codes desktop SidePanel**: testid `progress-percent` ("X%" v `<span>`,
  "Splněno" v sourozenci nad)
- **Codes mobile summary**: testid `mobile-progress-percent` ("Přehled kódů — X% splněno")
- **LEA desktop SidePanel**: testid `lea-progress-percent` ("X%" v `<span>`,
  "Splněno" v sourozenci nad — sjednoceno s codes panelem)
- **LEA mobile summary**: testid `lea-mobile-progress-percent` ("Přehled otázek — X% splněno")

`isComplete` ⟺ všechny filtrované items na +3.

### SidePanel layout (codes i LEA sjednoceno)

Oba boční panely sdílí vizuální jazyk: `card flex flex-col gap-3 p-4` wrapper +
`ProgressHeader` (uppercase tracking-wider "Splněno" vlevo, percent vpravo, bar
pod) + score-based barva pozadí podle stejné `SCORE_CLASS` mapy (`-3..+3`).
Mapa je duplikovaná v obou souborech (codes `SidePanel.tsx` + LEA `SidePanel.tsx`),
záměrně neabstraktováno — YAGNI dokud nebudou 3+ panely (Penal Code, Firearm Act).

Codes panel: dense grid `grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4`
chips s ID kódu. LEA panel: vertikální `<ul>` s jedním řádkem na otázku — mono
`§ref` v pevné šířce `w-14` vlevo, `description` flex-grow uprostřed, ✓ badge
vpravo když mastered (score=3). Každý řádek má `data-testid="chip-<id>"`,
`data-score`, `data-done` pro budoucí E2E.

## LEA UI flow

`LeaQuizPage` (`src/modules/laws/lea/components/LeaQuizPage.tsx`):

1. `useLeaProgress` poskytuje `{ progress, turn, recordSubmit, reset }`.
2. `current: Question | null` v `useState`. Picker běží v `useEffect` jen když
   `current === null && phase === 'answering'` (NE v `useMemo` — to byl bug, viz Gotchas).
3. Phase = `'answering'` | `'revealed'`. Submit změní phase, NEvyresetuje `current`.
4. `handleNext` clears chips + setCurrent(null) → useEffect pickne novou.
5. Interní state stále `chips: AnsweredChip[]` ({ key, raw, itemId, duplicate }) —
   název přežil, ale UI je teď stackovaný `AnswerList` (vertikální `<ul>`),
   nikoliv chips. `itemId === null` = wrong, `duplicate=true` = duplicate, jinak
   correct.
6. **Sjednocený reveal:** v `phase === 'revealed'` se `chips` přemapují na
   `AnswerEntry[]` (correct/duplicate/wrong) a navíc se přidají `missed` entries
   pro itemy které nebyly nalezeny. `AnswerList` má prop `showMissedHeading`,
   která vykreslí divider "Zapomněl jsi:" před první missed entry. Žádné
   oddělené sekce Nalezeno/Chybělo/Špatně. "Perfekt!" banner (testid
   `reveal-perfect`) se ukáže jen když nejsou ani wrong ani missed ani duplicate.
7. `AnswerInput` má input + tlačítko "Přidat" (vpravo, `data-testid="answer-add"`,
   disabled při prázdném inputu) + jednořádkový hint pod inputem. SubmitFooter
   používá `submit-footer--end` v obou fázích (jen jedno tlačítko vpravo —
   "Vyhodnotit otázku" v answering, "Další otázka" v revealed).
8. `LeaResetButton` (`flex justify-end` wrapper pod `<main>` v levém sloupci
   gridu) je dostupný v obou fázích. Confirm dialog s `role="alertdialog"`,
   testidy `lea-reset-button`/`lea-reset-confirm`/`lea-reset-cancel`/
   `lea-reset-confirm-yes`. Maže jen `lea` slice, codes zůstávají.
9. `useMediaQuery('(min-width: 1024px)')` switch mezi desktop SidePanel inline
   vs `LeaMobilePanel` (`<details>` se summary).

## Gotchas (na co si dát pozor)

1. **`useSyncExternalStore` snapshot stability** — `storage.ts` má `cachedSnapshot`,
   který se invaliduje **jen** při `saveState`/`clearState`/cross-tab `storage` eventu.
   Bez cache by `loadState` vracel novou referenci → infinite loop. Při ručním zásahu
   do `localStorage` v testech volat `__resetCacheForTests()` (děje se automaticky v
   `src/test/setup.ts`).

2. **Vitest má vlastní vendoring `vite`** → konflikt typů `@vitejs/plugin-react`. Proto
   `vitest.config.ts` je samostatný a **bez** plugin-react. Vitest si ohne JSX přes
   esbuild díky `tsconfig.app.json`'s `"jsx": "react-jsx"`.

3. **Playwright seed přes `localStorage`, ne přes window hook**: `page.addInitScript`
   běží před app skripty, takže window hooky ještě nejsou připojené. Místo toho
   `e2e/fixtures/seed.ts` zapisuje rovnou `localStorage["genk-pd:v1"]` (ve formátu
   `schemaVersion: 2`) a `localStorage["genk-pd:rng-seed"]`. Init script používá
   `sessionStorage` flag `genk-pd:seeded`, aby se **nepřeseedoval po reloadu**
   (jinak by persistence testy byly k ničemu).

4. **SidePanel se renderuje jen jednou**, ne dvakrát. `CodesPage` i `LeaQuizPage`
   přepínají mezi inline desktop a collapsible mobile podle `useMediaQuery('(min-width: 1024px)')`.
   Bez toho by `data-testid` byly duplicitní → strict mode collision.

5. **`progress` a `turn` MUSÍ být v deps `useEffect`** v `ModeWrite`/`ModeChoose`,
   které pickují další otázku — bez nich se po `reset()` (z congrats banneru) nevyzvedne
   nová otázka.

6. **Auto-focus inputu v ModeWrite je SAMOSTATNÝ efekt** s deps `[current, feedback]`,
   ne `queueMicrotask` ve výběrovém efektu. Důvod: když efekt nastaví `current`, input
   ještě není v DOMu (renderuje se `<QuestionSkeleton />`), takže microtask focusne `null`.

7. **LeaQuizPage: `current` v `useState`, NE `useMemo`.** Critical bug fix:
   `useMemo(() => pickNextQuestion({progress, turn}, …), [progress, turn])` po submitu
   (který bumpne `progress` + `turn`) okamžitě re-pickl JINOU otázku, a `useEffect`
   na `[current?.id]` resetnul phase z `revealed` zpátky na `answering` →
   reveal zmizel dřív, než ho user viděl. Fix: `current` v `useState`,
   `useEffect` pickne jen když `current === null && phase === 'answering'`.
   `handleSubmit` necheche `current` netknuté, jen mění phase. Test masking: existující
   E2E používaly `pinNextLeaQuestion` (saturoval 16/17 otázek na +3), takže pool po
   cooldownu měl jen 1 kandidáta a re-pick vrátil tu samou otázku → bug se zamaskoval.
   **Při přidání nové otázky do `LEA_QUESTIONS` MUSÍŠ rozšířit i seznam ID v
   `e2e/fixtures/seed.ts` (`LEA_QUESTION_IDS`) a v `LeaQuizPage.test.tsx`
   `beforeEach` saturation listu**, jinak `pinNextLeaQuestion` přestane být
   deterministický a testy padnou.

8. **`AnswerRow` neuvádí prop `ref`** — `ref` je React reserved prop name
   (forwardRef). Pole pro vedlejší text vpravo (typicky §ref nebo "duplikát" /
   "žádná shoda" / "zapomenuto") je v interface `AnswerEntry` jako `meta` a v
   `AnswerRow` propu taky `meta`. Nepřidávat prop `ref` ani jinde v `lea/`
   komponentách.

9. **`data-testid="chiplist"` (no hyphen)** na `<ul>` `AnswerList`u. Test regex
   `/chip-/` (matchuje řádky `chip-correct/duplicate/wrong/missed`) by jinak
   double-matchla wrapper. Záměrný rename. Stejný testid používá i E2E
   `responsive.spec.ts`.

10. **`useMediaQuery` v jsdom** — jsdom nemá `window.matchMedia`. `src/test/setup.ts`
    má stub `matches: false`, takže unit testy renderují mobile variantu (collapsed
    `<details>`). RTL `getByTestId` najde i hidden elementy uvnitř collapsed details,
    takže existující testy fungují.

11. **`schemaVersion` v test seedech musí být `2` + `lea` slice**. Hardcoded literály
    v `src/modules/codes/components/*.test.tsx` byly bumped při Task 4. Pokud přidáš
    nový test co píše `PersistedState` literál, přidej `lea: { progress: {}, turn: 0 }`
    a `schemaVersion: 2`.

12. **Vite dev server je default lockdown na `localhost`.** Pro ngrok/cloudflared
    tunel je v `vite.config.ts` `server.allowedHosts: ['.ngrok-free.app', '.ngrok.app',
    '.trycloudflare.com']`. Bez toho Vite vrací "Blocked request" pro neznámé hosty.

13. **`text-sasp-ink-dim` použít NE `text-sasp-ink/60`**. CLAUDE.md / Tailwind paleta
    má pojmenovaný odstín pro tlumený text — preferuj ho.

14. **Žádná emoji v kódu / dokumentaci**, pokud uživatel výslovně nepožádá.

15. **`.card` třída NEMÁ padding.** Padding (`p-6 sm:p-8` typicky) se přidává
    per použití. Codes panely, HomePage karty, LawsIndex i `<main>` v LEA
    quizu si ho přidávají samy. Bez něj vypadá karta nalepená na okrajích —
    typický symptom "designově horší" reportu. Při kopírování layoutu nového
    modulu nezapomenout.

16. **Backspace na prázdném inputu v `AnswerInput` nedělá nic.** Dříve mazal
    poslední odpověď přes `onBackspaceEmpty` callback, ale to bylo pro
    uživatele matoucí — text fields se nemažou jako tag inputy. Prop
    `onBackspaceEmpty` byl smazán; chip se odebírá jen × tlačítkem na řádku.

17. **`AnswerInput` Enter algoritmus**: `matchAnswer` first → commit přímý hit,
    jinak fill z highlight pokud je nabídka, jinak commit raw. Důsledek:
    napsání aliasu nebo přesného quote (např. "maják") commitne jedním Enterem;
    napsání zkratky ("varo") naplní vybranou suggestion (druhý Enter commitne).
    Šipky ↑↓ jen mění highlight (žádný `hasNavigated` state už neexistuje).

## Konvence

- Cesta s aliasem `@/...` mapuje na `src/...` (TS path + Vite/Vitest resolve.alias).
- Komentáře píšeme jen tam, kde **proč** není zřejmé z kódu. Nikdy JSDoc na trivial
  pure functions.
- Stylované primitivy v `src/styles/index.css` (`.btn-primary`, `.btn-secondary`,
  `.btn-danger`, `.card`, `.chip` (codes only), `.answer-input*`, `.answer-list*`,
  `.answer-row*`, `.reveal-perfect`, `.submit-footer*`, `.autocomplete-*`,
  `.lea-page` atd.) — preferovat před opakováním tříd.
- `data-testid` na všem, co testuje E2E. Přidávat při psaní komponenty, ne dodatečně.
- Žádný hidden state mimo `localStorage` — všechno persistující jde přes `storage.ts`.
- TDD: failing test → minimal impl → verify pass. Existující testy nikdy nelhostit
  bez důvodu.
- LEA otázky jsou v češtině, prompt formát: "Vyjmenuj…" / "Kdy má příslušník…".

## Mimo MVP / nápady do budoucna

- **Penal Code** + **Firearm Act** moduly: kopíruj `modules/laws/lea/` strukturu,
  přidej do `LawsIndex` (změň `aria-disabled` na aktivní `<Link>`), přidej route.
- **Sdílený "law quiz engine"**: až budou 2+ zákony, vytáhnout shared layer pro
  matching/suggest/UI komponenty (zatím YAGNI — `pickNextFromPool` a `normalize`
  už jsou shared).
- **SASP příručka** (`/sasp`) — zatím `<ComingSoonPage>`, `docs/sasp-manual.md`
  je v `.gitignore` (důvěrný zdroj).
- **False-negative aliasy** v LEA — pokud user narazí na často chybějící parafráze,
  rozšířit alias seznam v `questions.ts` ručně. Pozor na strict legal correctness
  (některé parafráze posunou právní význam, viz Gotcha o §15 5a).
