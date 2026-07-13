# CLAUDE.md

Pracovní paměť pro budoucí seance. Stručně a věcně.

## Co to je

Edukativní webová aplikace pro PD (Police Department) na serveru `genk.cz`. Aktuálně
funkční moduly:

> **Stav po refaktoru (branch `quiz-refactor`):** Moduly LEA, Penal scénky a stará SASP
> příručka jsou sloučeny do sjednoceného modulu **Teorie** (`src/modules/law/`, route `/law`,
> nav odkaz "Teorie"). Staré routy `/laws/*` a `/sasp` redirectují na `/law`.
> **Penal Recall** zůstává standalone na `/penal/recall`. Staré UI/state kódy byly smazány;
> zůstaly jen sdílené primitivy (`laws/lea/` data + AnswerList/AnswerRow) a Penal
> data/logic/recall (`laws/penal/`). Schema je v8.

1. **Desítkové kódy** (`/codes`) — dva režimy: psaní kódu (`/codes/write`),
   výběr významu (`/codes/choose`).
2. **[RETIRED → Teorie] Law Enforcement Act quiz** (`/laws/lea`) — routuje na `/law`.
   Data (`LEA_QUESTIONS`) + sdílené UI primitivy (AnswerList/AnswerRow) zůstávají
   v `src/modules/laws/lea/`; vlastní kvízové komponenty smazány.
3. **Penal Code Recall** (`/penal/recall`) — standalone stránka, aplikace se ptá
   „Co je §X?", uživatel doplní název paragrafu (alias matching). Pool = paragrafy
   z `RECALL_PARAGRAPHS` (27 položek). Side panel jen čísla paragrafů.
   Penal scénky (mode A) jsou nyní v Teorie jako `enumeration/paragraph` formát.
   Scénková UI (`PenalScenarioPage`, `PenalLayout`) smazána; data a logic zůstávají
   v `src/modules/laws/penal/`.
4. **Teorie** (`/law`) — sjednocený kvíz: LEA (enumerace paragrafů) + Penal scénky
   (paragraph matcher) + nativní SASP obsah (viz níže). Jeden pool `LAW_QUESTIONS`,
   dvouúrovňový filtr (source: lea/penal/sasp + 9 témat). 4 formáty dle `kind`:
   - `choice` — multi-select MC (≥5 možností, ≥1 správná), klávesy 1–N.
   - `text` — free-text recall s autocomplete + Hard mode.
   - `enumeration` — výčet (LEA paragrafy nebo Penal paragraph matcher), ordered volitelně.
   - `match` — click-pairing (levý sloupec ↔ pravý sloupec).
   Nativní SASP obsah v `src/modules/law/data/sasp/` je anti-leak exam-prep
   (nesmí přebírat konkrétní formulace z reálného testu). 94 SASP otázek ve 4 formátech.
5. **Geografie** (`/geo`) — interaktivní mapa Los Santos a Blaine County
   (Leaflet + CRS.Simple + tile pyramid 0..3 nad `clean-map.jpg` 8192×12288),
   2 herní režimy + interní editor pozic:
   - **Slepá mapa** (`/geo/blind`, default index) — uživatel dostane prompt
     „Klikni na X — popis" a kliká na mapu. Hit-test binární s **prahem dle
     velikosti POI** (pole `size`, 5 tierů tiny/small/medium/large/huge →
     0.01/0.0167/0.0233/0.0367/0.06 normalizovaných jednotek; default medium
     když `size` chybí). Velké oblasti (letiště, doky, města) = huge, pinpoint
     budovy = small. Bodové POI: euklidovská distance. Polyline POI (ulice):
     minimum perpendikulární distance segmentu (fixní 0.015).
   - **Co je tady** (`/geo/name`) — pulzující marker na mapě bez popisku,
     uživatel napíše název. Free-text + autocomplete (LEA pattern) +
     Hard mode toggle (Penal pattern).
   - **Editor pozic** (`/geo/calibrate`) — interní Drag&drop editor:
     markery a polyline nody tažitelné, export TS literálu pro paste zpět
     do `pois.ts` / `streets.generated.ts`.
   Mastered POI zůstávají faded markery / polyline s názvem na mapě → mapa
   se postupně „odemyká". Společný `categoryFilter` (4 kategorie:
   street=Ulice / highway=Dálnice / city=Body ve městě / state=Body ve státě)
   v `geo.settings`. Per-režim progress (jako Penal). **68 POI dataset**
   (`pois.ts` + `streets.generated.ts`): 37 city + 11 state + 11 street +
   9 highway. ID prefix == kategorie (`city.lsia`, `state.paleto-bay`,
   `street.vespucci-blvd`, `highway.del-perro-fwy`). Pozice vizuálně ověřené
   proti artu (Gotcha 40), ulice hand-traced.

5. **[RETIRED → Teorie] SASP příručka** (`/sasp`) — routuje na `/law`. Starý
   `src/modules/sasp/` smazán. Nativní SASP obsah je v `src/modules/law/data/sasp/`
   jako součást sjednoceného Teorie modulu. Zdroj `docs/sasp-manual.md` je
   gitignored/důvěrný; parsovaná data a kód jsou veřejné.

Geografie je standalone top-level modul. Nav má 4 položky: Codes / Teorie / Geo / Penal Recall.

Pure-frontend, žádný backend. Veškerý stav v `localStorage` (klíč `genk-pd:v1`,
schemaVersion 8).

## Stack

- Vite 6 + React 18 + TypeScript 5.6
- Tailwind CSS 3.4 (SASP paleta v `tailwind.config.js`: `sasp-bg`, `sasp-navy`,
  `sasp-navy-light`, `sasp-tan`, `sasp-gold`, `sasp-red`, `sasp-ink`, `sasp-ink-dim`)
- React Router 6 (`createHashRouter` — pozor, ne Browser router; URL používá
  `#/law`, `#/penal/recall`, `#/geo/blind` formát)
- Vitest 2 (unit + component, jsdom)
- Playwright 1 (E2E, chromium-desktop + chromium-mobile)
- Mixpanel browser 2.78 (analytics, frontend-only, EU-resident)
- Leaflet 1.9 + react-leaflet 4.2 (geo modul, CRS.Simple custom-tiled mapa)
- Sharp 0.34 (devDep, tile generation pipeline pro geo modul)

## Příkazy

```
npm run dev        # vite dev server
npm run build      # tsc -b && vite build
npm run preview    # serve built dist on :4173
npm test           # vitest run (unit + component)
npm run test:e2e   # playwright (spustí si dev server sám)
npm run test:all   # vše
```

`npm run test:all` musí být zelené: **413 unit/component + 64 E2E = 477 testů** (+ 1 todo).
Žádná manuální verifikace — pokud něco rozbiju, opravím a prohnám testy.

Tile pipeline (geo modul) se NEspouští v `npm run build` — je to one-time skript
`node scripts/generate-tiles.mjs` po výměně source mapy. Výstup `public/tiles/`
je commitnutý.

Pokud bys znovu regeneroval `docs/clean-map.jpg` z Rockstar minimapů:
`pip install pillow texture2ddecoder && python3 scripts/extract-minimap.py`,
pak `node scripts/generate-tiles.mjs`. `docs/map-original/` (zdrojové `.ytd`)
je v `.gitignore` — uživatel je extrahuje z `scaleform_generic.rpf` přes OpenIV.

Street centerlines (geo modul) jsou hand-traced z artu přímo v
`src/modules/geo/data/streets.generated.ts` — žádný generátor neexistuje
(historické YND/Foxxite pipelines byly smazány; viz git historie, pokud by
byly potřeba jako reference). Retuning přes `/geo/calibrate` Drag&Drop nebo
debug overlay (`D` v `/geo/blind`).

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
    laws/                           # Sdílené primitivy (data + UI) používané Teorie a Penal Recall
      lea/                          # Pouze data + sdílené UI primitivy (vlastní quiz UI smazán)
        data/
          types.ts                  # AnswerItem, Question rozhraní
          questions.ts              # LEA_QUESTIONS — 17 otázek, 95 položek, ~505 aliasů
                                    # (používá adaptLea.ts v law/data/)
        components/
          AnswerList.tsx            # Sdílený vizuální primitiv — vertikální <ul> s answer rows
          AnswerRow.tsx             # Sdílený vizuální primitiv — jeden řádek (correct/wrong/missed/dup)
      penal/                        # Penal data + logic (scénková UI smazána, Recall UI zůstává)
        data/
          types.ts                  # PenalParagraph, PenalScenario, ExpectedAnswer
          paragraphs.ts             # PENAL_PARAGRAPHS — 75 paragrafů (§1–§77, §100–§102)
          scenarios.ts              # PENAL_SCENARIOS — 28 scénář A1–E9 (používá adaptPenal.ts)
          recallPool.ts             # RECALL_PARAGRAPHS — derivované, jen ty co jsou
                                    # v některé scénce (27 paragrafů, vyloučeno §1–§6 atd.)
        logic/
          canonicalAnswerId.ts      # '§25 b' / '25B' / '25b' → '25b' (null pokud neparseable)
          matchParagraph.ts         # Recall alias matching (používá PenalRecallPage)
          suggestParagraph.ts       # Autocomplete (ID prefix nebo name substring),
                                    # expanduje paragraph na všechny sub-varianty (používá EnumerationInput)
        state/
          selection.ts              # pickNextRecallParagraph, isRecallComplete
          usePenalProgress.ts       # usePenalSliceProgress('recall') → usePenalRecallProgress
        components/                 # PenalRecallPage (standalone /penal/recall),
                                    # PenalSidePanel, PenalSubmitFooter, PenalResetButton
    geo/                            # Modul geografie (interaktivní mapa + 2 sub-režimy + editor pozic)
      data/
        types.ts                    # POIBase, POIPoint, POIPolyline, POI union,
                                    # POICategory: 4 hodnoty (street/highway/city/state),
                                    # POISize: 5 tierů (tiny..huge) — volitelné pole `size`
        pois.ts                     # POIS — 68 POI: 37 city + 11 state (point) + 20 street/highway
                                    # (z streets.generated.ts). Point: pozice vizuálně ověřené
                                    # proti artu (Gotcha 40), každý má `size` tier pro
                                    # klikací toleranci (Gotcha 42).
                                    # Streets: koncat z streets.generated.ts.
        streets.generated.ts        # HAND-TRACED z artu (navzdory názvu negenerovaný) —
                                    # 20 street polyline centerlines dle popisků v artu
                                    # (Gotcha 41)
        tileMeta.ts                 # TILE_META — auto-generovaný skriptem generate-tiles.mjs
        pois.test.ts                # Validace (count, unique IDs, alias non-collision,
                                    # canonical id prefix per category, geometry consistency)
      logic/
        coords.ts                   # toLatLng / fromLatLng helpery (CRS.Simple [y,x])
        hitTest.ts                  # evaluateClick: point (euklid threshold dle
                                    # POI size, SIZE_THRESHOLDS 5 tierů, default
                                    # medium 0.0233), polyline
                                    # (perpendikulární distance ≤ 0.015).
                                    # hitTest.streets.test.ts: 12 real-coordinate fixtures
                                    # ověřených proti satelitnímu artu
        match.ts                    # matchPoi — strict equality po normalize, name + aliases
        suggest.ts                  # suggestPois — substring autocomplete, min 2, max 5
        calibrate.ts                # polylineCentroid (arc-length midpoint) + formatPoisTs
                                    # (TS literál pro paste do pois.ts) + toleranceRing
                                    # (prsten tolerance vybraného POI, elipsa v px) — jen DragDropTab
      state/
        selection.ts                # pickNextPoi(state, pois, filter) přes pickNextFromPool,
                                    # eligiblePois, isGeoComplete
        useGeoProgress.ts           # Generický hook useGeoSliceProgress('blind'|'name') →
                                    # 2 veřejné: useGeoBlindProgress, useGeoNameProgress
        useGeoSettings.ts           # Category filter (4 kategorie), persistuje
      components/                   # GeoLayout (tabs + Outlet), GeoBlindPage (mode 1),
                                    # GeoNamePage (mode 2), GeoMap (Leaflet wrapper +
                                    # MapClickCapture), GeoMarker, GeoPolyline, GeoSidePanel,
                                    # GeoMobilePanel (<details>), GeoAnswerInput, GeoResetButton,
                                    # GeoCalibratePage (renderuje DragDropTab), GeoDebugOverlay
        calibrate/                  # · DragDropTab — POI markery tažitelné, polyline nody
                                    #   draggable, export TS přes formatPoisTs. Vybraný point
                                    #   POI dostane prsten tolerance (toleranceRing → Polygon,
                                    #   non-interactive, elipsa kvůli portrait mapě)
    law/                            # Sjednocený Teorie modul (route /law, nav "Teorie")
      data/
        types.ts                    # LawQuestion = discriminated union (LawChoice/LawText/
                                    # LawEnumeration/LawMatch přes `kind`); LawExpected;
                                    # LAW_SOURCES=['lea','penal','sasp'],
                                    # LAW_THEMES (9 témat: pojmy/hodnosti/jednani/rto/vybava/
                                    # zasah/zadrzeni/kriminalistika/paragrafy)
        index.ts                    # LAW_QUESTIONS — sjednocený pool:
                                    # adaptLeaQuestions() + adaptPenalScenarios() + SASP_LAW_QUESTIONS
        adaptLea.ts                 # Konvertuje LEA_QUESTIONS → kind:'enumeration' (matcher:'alias')
        adaptPenal.ts               # Konvertuje PENAL_SCENARIOS → kind:'enumeration' (matcher:'paragraph')
        index.test.ts               # Validace merge (unikátní IDs, valid source/theme)
        sasp/
          choice.ts                 # SASP_CHOICE — 86 choice otázek, ≥5 možností, ≥1 správná
          text.ts                   # SASP_TEXT — 2 text otázky
          enumeration.ts            # SASP_ENUM — 2 enumeration otázky
          match.ts                  # SASP_MATCH — 4 match otázky
          index.ts                  # SASP_LAW_QUESTIONS — concat všech SASP kinds (94 otázek)
          sasp.test.ts              # Validace: source='sasp', valid theme, ID prefix, choice≥5
                                    # options, text alias non-collision, match pairs, enum fields.
                                    # Nativní SASP obsah je anti-leak exam-prep —
                                    # NESMÍ přebírat konkrétní formulace z reálného testu.
      logic/
        matchChoice.ts              # matchChoice — porovnání zvolených indexů vs correctIndices
        matchText.ts                # matchText — strict equality po normalize
        matchEnumeration.ts         # matchEnumeration — alias nebo paragraph matching
        checkMatch.ts               # checkMatch — evaluace match pairs kliknutím
        suggest.ts                  # suggestText — substring autocomplete (kind text)
        *.test.ts                   # Testy pro každou logiku
      state/
        useLawProgress.ts           # useLawQuizProgress nad `law` slice (delta ±2)
        useLawSettings.ts           # sourceFilter + themeFilter, persistuje
        selection.ts                # pickNextQuestion / isLawComplete (filtrování +
                                    # score<2 přes pickNextFromPool) nad LAW_QUESTIONS
        selection.test.ts           # Testy selekce
      components/                   # LawPage (jediná stránka, větví render dle current.kind),
                                    # LawSidePanel (source+theme filtry, chips → onSelect),
                                    # LawMobilePanel (<details>), LawResetButton,
                                    # ChoiceInput, TextInput, EnumerationInput, MatchInput,
                                    # ScenarioBox (pro enumeration s scenario polem)
                                    # LawPage.test.tsx, LawSidePanel.test.tsx, *Input.test.tsx
  shared/
    storage.ts                      # Versionovaný localStorage wrapper, schemaVersion 8,
                                    # chained migrate v1→…→v8 při readu, lenient v8 read
                                    # (dopočítá chybějící geo/penal/law sub-slices)
    rng.ts                          # Pluggable RNG (mulberry32, seed přes localStorage)
    useMediaQuery.ts                # SSR-safe matchMedia hook
    text/normalize.ts               # NFD strip diakritiky + lowercase + whitespace collapse
    quiz/pickNextFromPool.ts        # Generic weighted-random + cooldown picker
    ui/BadgeIcon.tsx                # SVG hvězda s "PD"
    analytics.ts                    # Mixpanel wrapper (init + typed track* fns,
                                    # no-op před initAnalytics, mockovaný v testech,
                                    # vypnutý v E2E přes window.__GENK_E2E__ flag)
  styles/index.css                  # Tailwind directives + .card / .btn-* / .chip
                                    # (codes only) / .answer-input* / .answer-list*
                                    # /.answer-row* (4 stavy: correct/duplicate/wrong/
                                    # missed) / .reveal-perfect / .submit-footer*
                                    # /.autocomplete-* / .lea-page
                                    # /.geo-page / .geo-map-shell / .geo-prompt*
                                    # /.geo-feedback* / .geo-marker* (DivIcon styly)
  test/setup.ts                     # Vitest setup: jsdom, jest-dom, storage cache reset,
                                    # window.matchMedia stub (jsdom nemá)

scripts/
  generate-tiles.mjs                # Tile generator: docs/clean-map.jpg → public/tiles/{z}/{x}/{y}.jpg
                                    # + tileMeta.ts. Spouští se ručně (`node scripts/...`)
  extract-minimap.py                # Stitch Rockstar minimap .ytd textur (docs/map-original/,
                                    # gitignored) → docs/clean-map.jpg (8192×12288)

public/
  tiles/                            # Vygenerované Leaflet CRS.Simple tiles, z=0..3,
                                    # 802 JPEG souborů, ~5.7 MB

docs/poi-mapping.md                 # Mapování uživatelova POI seznamu → CZ jména
                                    # + aliasy. Cheat sheet, aplikace ho NEČTE. Slouží jako
                                    # human reference pro generování pois.ts.

e2e/
  fixtures/seed.ts                  # `seed(page, { codes-flat-fields, penal?, geo?, law?, randomSeed? })`
                                    # Píše schemaVersion 8, exportuje GEO_POI_IDS,
                                    # pinNext{PenalParagraph, GeoPoi, LawQuestion}
  codes/*.spec.ts                   # 7 spec souborů, 20 testů
  law/*.spec.ts                     # 4 spec soubory (quiz-flow 12, filter 5, redirects 6,
                                    # persistence 2), 25 testů
  penal/*.spec.ts                   # 1 spec soubor (recall-flow), 4 testů
  geo/*.spec.ts                     # 3 spec soubory (blind-flow, name-flow, persistence),
                                    # 12 testů
```

Nový obsah do Teorie → přidej otázky do `src/modules/law/data/sasp/` (nebo nový
adapter pro nový zdroj), zaregistruj v `LAW_QUESTIONS`. Sdílené utility (`normalize`,
`pickNextFromPool`) jsou generické. Pro nový zdroj přidej hodnotu do `LAW_SOURCE_KEYS`
v `storage.ts`, bump schema (v7 → v8) a doplň migraci.

Firearm Act (budoucnost): přidat jako nový zdroj `'firearm'` do `LAW_SOURCE_KEYS` +
adapter z `modules/laws/firearm/data/` + otázky v `law/data/firearm/`. Starý pattern
"nový `modules/laws/firearm/` s vlastním routou" je obsolete — vše jde do sjednoceného
`/law` poolu.

## Datový model

```ts
// localStorage["genk-pd:v1"]
{
  schemaVersion: 8,
  codes: {
    progress: { [codeId]: { score: -2..+2, lastAskedAtTurn: number } },
    turn: number,
    settings: {
      importanceFilter: { mandatory: bool, rare: bool, unnecessary: bool }
    }
  },
  penal: {
    recall: { progress: { [paragraphId]: ProgressEntry }, turn: number }
  },
  geo: {
    blind: { progress: { [poiId]: ProgressEntry }, turn: number },
    name:  { progress: { [poiId]: ProgressEntry }, turn: number },
    settings: {
      categoryFilter: {
        street: bool, highway: bool, city: bool, state: bool
      }
    }
  },
  law: {                             // sjednocený Teorie kvíz (LEA + Penal scénky + SASP)
    progress: { [questionId]: ProgressEntry },
    turn: number,
    settings: {
      sourceFilter: { lea: bool, penal: bool, sasp: bool },
      themeFilter: {
        pojmy: bool, hodnosti: bool, jednani: bool, rto: bool,
        vybava: bool, zasah: bool, zadrzeni: bool, kriminalistika: bool, paragrafy: bool
      }
    }
  }
}
```

**Migrace v1 → … → v8** (`src/shared/storage.ts`): při readu se starší payload
chained-migruje v paměti. v1: jen codes. v2: +lea. v3: +penal. v4: +geo. v5: +sasp.
v6: sasp quiz sloučen. v7: +law slice (additivní). v8: odstraněny `lea`, `sasp`,
`penal.scenarios` slices; `saveState` je vždy zapisuje bez. `saveState` vždy zapisuje v8.

**Lenient v8 read**: pokud payload chybí `geo`/`law`/`penal.recall` nebo sub-slice,
dopočítáme prázdné defaults. sourceFilter/themeFilter/categoryFilter doplní missing
klíče z initialState (každý true). (Test `storage.test.ts`.)

`STORAGE_KEY = 'genk-pd:v1'` se NEMĚNÍ při schema bumpu — jen JSON value uvnitř.
"v1" v key je legacy; verzování je v `schemaVersion` field.

### Codes scoring

Skóre `-2..+2`, sdílené mezi oběma módy. Delta ±1 per answer. Kód na `+2` vypadne
z poolu. Pool prázdný → `<CongratsBanner />`. Reset maže `progress` a `turn`,
**zachovává** settings.

**Skip** (`recordSkip(codeId)`): nastaví score = MAX (`+2`) absolutně, bumpne
turn, kód okamžitě vypadne z poolu. Tlačítko `data-testid="codes-skip"`,
text „Přeskočit otázku", styl `btn-secondary`. Dostupné v ModeWrite i ModeChoose,
v obou fázích (před odpovědí i v feedback bloku — v druhém případě override-uje
skóre nastavené `recordAnswer`).

### Law (Teorie) scoring

Skóre `-2..+2` per otázka v jedné `law` slice. Delta **±2** (NE ±1 jako u codes).
Mastered na `+2` (= 1 správná odpověď z 0). `recordSubmit({ perfect: bool })` mění skóre.
Reset maže jen `law` slice, codes zůstávají. Reset je vystaven přes `LawResetButton`
(confirm dialog, testid `law-reset-*`).

**Skip** (`recordSkip(questionId)`): score=MAX (+2) absolutně, override. Testid `law-skip`.

### Codes data

Kódy s A/B variantami z `docs/codes.md` (`10-14 A/B`, `10-99 A/B`) jsou v `CODES`
**sjednocené** do jednoho záznamu. Vyšší důležitost vyhrává (`mandatory > rare > unnecessary`).
Zdroj pravdy = `docs/codes.md`, parsováno **ručně** do TS literálu, ne za běhu.

### Geo scoring

Skóre `-2..+2` per POI, **per režim** (blind / name jsou nezávislé sliceí, jako
Penal scenarios / recall). Delta ±2. Mastered na `+2`. Reset maže jen daný režim,
druhý zůstává. `categoryFilter` v `geo.settings` (sdílený mezi režimy) ovlivňuje
co je v poolu — disabled kategorie se nikdy nezeptá. POI mastered v daném režimu
zůstává jako faded marker (point) / polyline (street) na mapě s názvem v Tooltipu
→ „mapa se postupně odemyká".

**Skip** stejná sémantika jako Codes / LEA — score=MAX (+2) absolutně, override.
Tlačítka `data-testid="geo-blind-skip"` / `data-testid="geo-name-skip"`.

### SASP data (v Teorie modulu)

Nativní SASP obsah v `src/modules/law/data/sasp/`:
- `choice.ts` — 86 choice otázek (≥5 options, ≥1 correctIndex)
- `text.ts` — 2 text otázky (s aliasy)
- `enumeration.ts` — 2 enumeration otázky
- `match.ts` — 4 match otázky (pairs)
- `index.ts` — `SASP_LAW_QUESTIONS` concat všech (94 otázek), `source: 'sasp'`
- `sasp.test.ts` — validace (counts, unique IDs, options ≥5, alias non-collision,
  theme enum, match pairs). Anti-leak: NESMÍ přebírat konkrétní formulace z reálného testu.

ID prefix: `sasp.<kind>.<theme>.<n>`. 9 témat (pojmy/hodnosti/jednani/rto/vybava/zasah/
zadrzeni/kriminalistika/paragrafy). Zdroj surovin: `docs/sasp-manual.md` (gitignored/důvěrný).


## Algoritmy

### Codes

**`pickNextCode(state, allCodes)`** (`src/modules/codes/state/selection.ts`)
deleguje na `pickNextFromPool` ze `@/shared/quiz/pickNextFromPool`. Před tím
filtruje codes přes `eligibleCodes` (importance filter + score < 2).

**`buildOptions(correct, allCodes)`** (`src/modules/codes/state/distractors.ts`):
1 správná + 2 ze stejné dekády (`10-40..10-49` pro `10-44`) + 2 náhodné. Distraktory
**ignorují filtr důležitosti** (taháno z celé množiny `CODES`). Když je dekáda chudá
(<2 jiných kódů), padne se na nejbližší podle `|Δnumber|`.

**Klávesy v ModeChoose**: `1`–`5` vybírá odpověď. Listener visí na `window` jen po dobu
aktivní otázky (efekt s deps `[current, choice, options, recordAnswer]`), ignoruje
modifikátory a `INPUT/TEXTAREA/contenteditable` cíle.

### Shared

**`pickNextFromPool<T extends { id: string }>(pool, progress, turn): T | null`**
(`src/shared/quiz/pickNextFromPool.ts`):
1. Eligibilní = `pool` (volající už profiltroval). Když prázdný → null.
2. Cooldown: `turn - lastAskedAtTurn >= 2`. Když by cooldown vyprázdnil pool, ruší ho.
3. Vážený výběr: `weight = 3 - score` (od `-2` váha 5, od `+1` váha 2). Používá
   `weightedRandom` z `@/shared/rng`.

**`normalize(s: string)`** (`src/shared/text/normalize.ts`): `lowercase` + `NFD` decompose
+ strip combining marks `[̀-ͯ]` + `\s+ → ' '` + trim. Pure function, sdílená
všemi matchers.

### Law (Teorie) logika

**`matchText`** (`src/modules/law/logic/matchText.ts`): strict full-string equality po
`normalize`. **`suggestText`** (`suggest.ts`): substring autocomplete, min 2, max 5.
**`matchEnumeration`** (`matchEnumeration.ts`): deleguje na alias matching (LEA) nebo
paragraph matching (Penal) dle `matcher` field na otázce. Používá `suggestParagraphs`
z `laws/penal/logic/suggestParagraph.ts` pro paragraph autocomplete.
**`matchChoice`** (`matchChoice.ts`): porovnání zvoleného indexu vs `correctIndices[]`.
**`checkMatch`** (`checkMatch.ts`): evaluace match pairs po kliknutí.
**`pickNextQuestion(state, settings, all)`** = `pickNextFromPool(eligibleQuestions(...), ...)`,
kde `eligibleQuestions` filtruje score < 2 + source/theme filtr.

### LEA data matching (sdíleno přes Teorie)

**`AnswerRow`/`AnswerList`** (`src/modules/laws/lea/components/`) jsou sdílené vizuální
primitivy pro enumeration chips (correct/duplicate/wrong/missed). Enter algoritmus
v `EnumerationInput`: matchAnswer first → commit přímý hit, jinak fill z highlight
pokud je nabídka, jinak commit raw. Šipky ↑↓ mění highlight, Tab fillne, Esc zavře.

### Penal Code

**Scénky (Teorie/enumeration formát):** `adaptPenal.ts` konvertuje `PENAL_SCENARIOS` na
`LawQuestion[]` s `kind:'enumeration'`, `matcher:'paragraph'`, `expected: ExpectedAnswer[]`.
`EnumerationInput` (Teorie) vyhodnocuje chips přes `matchEnumeration` → `canonicalAnswerId`
+ paragraf lookup + sub validace. Strict — žádný partial credit (Gotcha 23).

**`canonicalAnswerId(input): string | null`** normalizuje vstupy `'§25 b'`,
`'25B'`, `'25b'`, `'§25'`, `'27'` → `'25b'` / `'25'` / `'27'`. Strip `§`,
lowercase, collapse whitespace, regex `^(\d+)([a-e]?)$`. Null pro neparseable.

**`suggestParagraphs(input, paragraphs, excludeKeys): ParagraphSuggestion[]`**
(`laws/penal/logic/suggestParagraph.ts`):
1. Numeric prefix (`25`, `25b`): rozšíří paragraf na všechny sub-varianty.
2. Text substring: substring přes title + aliasy po normalize.
`excludeKeys` (Set canonical IDs `'25b'`, `'27'`) skrývá už commitnuté chips.
Min length 1, max 8 výsledků. Používá `EnumerationInput` přes `matchEnumeration`.

**Recall.** Otázka „Co je §X?" pickne paragraf z **`RECALL_PARAGRAPHS`**
(derivovaný subset z `PENAL_PARAGRAPHS` — jen ty co jsou v `PENAL_SCENARIOS.expected`,
27 položek).

**`matchParagraph(input, paragraphs): PenalParagraph | null`** = alias match
po normalize. V `PenalRecallPage` se volá s `[current]` — korektní odpověď je jen
jméno aktuálně testovaného paragrafu.

**`pickNextRecallParagraph`** deleguje na `pickNextFromPool` se score < 2 filterem.

### Progress bar (všechny moduly)

`pct = Σ min(2, max(0, score(c))) / (2·N)` přes filtrované položky. Záporné
skóre se klampuje na 0 jen pro UI; legacy hodnoty `score > 2` (z původního
rozsahu `-3..+3`) jsou taky zclampované na 2, takže pct nikdy nepřekročí 100 %.
Storage uchovává nově `-2..+2`, selection filtruje `score < 2`.

- **Codes desktop SidePanel**: testid `progress-percent`
- **Codes mobile summary**: testid `mobile-progress-percent`
- **Law (Teorie) desktop SidePanel**: testid `law-progress-percent`
- **Law (Teorie) mobile summary**: testid `law-mobile-progress-percent`
- **Penal Recall desktop**: testid `penal-recall-progress-percent`
- **Penal Recall mobile**: testid `penal-recall-mobile-progress-percent`
- **Geo Blind desktop**: testid `geo-blind-progress-percent`
- **Geo Blind mobile**: testid `geo-blind-mobile-progress-percent`
- **Geo Name desktop**: testid `geo-name-progress-percent`
- **Geo Name mobile**: testid `geo-name-mobile-progress-percent`

`isComplete` ⟺ všechny filtrované items na +2.

### SidePanel layout (codes / law / penal)

Všechny boční panely sdílí vizuální jazyk: `card flex flex-col gap-3 p-4` wrapper +
`ProgressHeader` (uppercase tracking-wider "Splněno" vlevo, percent vpravo, bar
pod) + score-based barva pozadí podle stejné `SCORE_CLASS` mapy (`-3..+3`).
Mapa zůstává s rozsahem `-3..+3` pro zpětnou kompatibilitu s legacy daty;
nové skóre používá jen `-2..+2`. Duplikovaná v `codes/SidePanel.tsx`,
`law/LawSidePanel.tsx`, `laws/penal/PenalSidePanel.tsx`; až bude 3. modul,
půjde refaktorovat do `src/shared/quiz/SidePanel.tsx`.

Codes panel: dense grid `grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4`
chips s ID kódu. Law panel: filtry (source + theme) + chips s source zkratkou +
promptem, klikatelné (přepnutí otázky). Penal Recall panel: generický
(item: `{ id, label, sublabel?, hoverTitle }`), recall má jen label=`§N` (sublabel
záměrně vynechán — jen čísla, ne názvy). Každý řádek `data-testid="chip-<id>"`,
`data-score`, `data-done`.

## Analytika (Mixpanel)

`src/shared/analytics.ts` je tenký typed wrapper nad `mixpanel-browser`.
Init v `src/main.tsx` přes `initAnalytics()`, project token je hardcoded
konstanta (Mixpanel FE tokeny jsou public-by-design).

**Eventy** (per-event typed funkce, ne generický `trackEvent`):

| Funkce | Event name | Properties | Trigger |
|---|---|---|---|
| `trackCodeAnswered` | `code_answered` | `mode: 'write'\|'choose'`, `success`, `code_id` | ModeWrite/ModeChoose po vyhodnocení |
| `trackLawAnswered` | `law_answered` | `source: 'lea'\|'penal'\|'sasp'`, `kind: 'choice'\|'text'\|'enumeration'\|'match'`, `success`, `question_id` | LawPage `handleSubmit` |
| `trackPenalAnswered` | `penal_answered` | `mode: 'recall'`, `success`, `question_id` | PenalRecallPage `handleSubmit` |
| `trackPenalCompleted` | `penal_completed` | `mode: 'recall'` | Mount completion screen po posledním correct submitu |
| `trackProgressReset` | `progress_reset` | `module: 'codes'\|'law'\|'penal-recall'\|'geo-blind'\|'geo-name'` | ResetButton/LawResetButton/PenalResetButton/GeoResetButton confirm |
| `trackCodesCompleted` | `codes_completed` | `scope: 'all'\|'partial'` | CongratsBanner mount |
| `trackQuestionSkipped` | `question_skipped` | `module: 'codes'\|'law'\|'penal-recall'\|'geo-blind'\|'geo-name'`, `question_id` | handleSkip ve všech kvízových stránkách |
| `trackGeoAnswered` | `geo_answered` | `mode: 'blind'\|'name'`, `success`, `poi_id` | GeoBlindPage / GeoNamePage po vyhodnocení |
| `trackGeoCompleted` | `geo_completed` | `mode: 'blind'\|'name'` | Mount completion screen po posledním masteru |
| `trackPageview` | _(Mixpanel pageview)_ | `url` (origin + `#` + path) | AppLayout useEffect na route change |

Poznámka: `trackSaspAnswered` a `trackSaspCompleted` jsou v `analytics.ts` definovány,
ale aktuálně nevolány (starý modul smazán, v7→v8 migrace je nevymazala z kódu).

**Init pipeline** (po `mixpanel.init`):
1. `mixpanel.identify(mixpanel.get_distinct_id())` — self-identify s anonymním
   device id; bez toho Simplified Identity Merge dropne anonymní `people.*` calls
2. `mixpanel.people.set_once({ $created })` — vytvoří profil v Users tab

**Init config:**
- `api_host: 'https://api-eu.mixpanel.com'` — projekt je EU-resident
- `track_pageview: false` — hash router (`#/path`) by autotracker zaznamenal
  všechno na `/`, proto pageview manuálně z AppLayoutu
- `debug: import.meta.env.DEV` — v devtools console viditelné `Mixpanel: ...`
  logy
- `persistence: 'localStorage'`, `ignore_dnt: true`

**Test mock:** `src/test/setup.ts` má globální `vi.mock('mixpanel-browser')`
se stub objektem (`init`, `track`, `track_pageview`, `identify`,
`get_distinct_id`, `people.set`, `people.set_once`, `register`, `reset`).
Komponentové testy o tom nevědí; explicitní aserce jen v `analytics.test.ts`.
Volání `trackX` před `initAnalytics` je no-op (modul-level `initialized` flag),
takže testy nevolající init si dál fungují.

**E2E vypnuto:** `seed()` nastaví `window.__GENK_E2E__ = true` v `addInitScript`
(mimo session-once guard, takže perzistuje přes reload). `initAnalytics()` na
flagu vrátí no-op před `mixpanel.init`. Plus belt-and-suspenders route blocks
na `**/api*.mixpanel.com/**` a `**/*.mxpnl.com/**` v `seed()`.

## LEA data & primitives

`LEA_QUESTIONS` (17 otázek, 95 položek) v `src/modules/laws/lea/data/questions.ts`.
Každá otázka má `{ id, prompt, description, ref, items[] }`, každá položka má
`{ id, quote, aliases[], ref }`. `description` je krátký popis (~20–35 znaků,
nominalizace) — používá ho `adaptLea.ts` při konverzi do Teorie formátu.

`AnswerList` a `AnswerRow` v `src/modules/laws/lea/components/` jsou **sdílené UI
primitivy** — importuje je `EnumerationInput` (Teorie) i `PenalRecallPage`.
Neukazují se pod `/laws/lea` (route neexistuje), ale jsou stále živé kódem.

Pokrytá paragrafy LEA: §7, §9 A/B, §10, §11, §12 A/C, §15, §16 B, §17 A, §18 A,
§19 A, §21 A, §23 B, §37. Question IDs jsou `lea.<paragraph>[.<section>]`,
item IDs `lea.<paragraph>.<section>.<sub>` (např. `lea.16.B.3b`).

**Křížové otázky z jiných zákonů**: `lea.zbrojni-prukaz` (Firearm Act §4) a
`lea.ridicsky-prukaz` (Penal Code §34/§36/§37/§58). Question ID je slug místo
paragrafu, skutečná reference je v poli `ref`.

## Penal Recall UI flow

`PenalRecallPage` (`src/modules/laws/penal/components/PenalRecallPage.tsx`) — standalone `/penal/recall`:

1. `usePenalRecallProgress` nad `penal.recall` slice.
2. Pool = `RECALL_PARAGRAPHS` (27 paragrafů z `data/recallPool.ts`). Picker přes `pickNextRecallParagraph`.
3. Otázka „Co je §X?" + plain `<input>` (žádné chips, žádné autocomplete).
   testid `penal-recall-input`. Enter triggers handleSubmit.
4. `handleSubmit`: `matchParagraph(value, [current])` — jediný paragraf v poolu
   pro match je current. Match = perfect.
5. Reveal: `RecallReveal` komponenta v stejném souboru. Když matched=current →
   zelený „Správně!" banner (testid `penal-recall-correct`). Jinak red box
   s plnou odpovědí (testid `penal-recall-wrong`).
6. Reveal box dál vypisuje `description` paragrafu + všechny sub-paragrafy
   (testid `penal-recall-reveal`) — edukační moment, user vidí kategorizaci.
7. Reset/Skip: `PenalResetButton` s prefixem `penal-recall`, skip přes
   `recordSkip` + `trackQuestionSkipped({ module: 'penal-recall' })`.
8. SidePanel show **jen čísla paragrafů** (label=`§N`, sublabel undefined).
   Hover tooltip ukazuje název + popis. testid `penal-recall-side-panel`.

## Geo UI flow

`GeoLayout` (`src/modules/geo/components/GeoLayout.tsx`) je parent route s
`<Outlet />`, NavLink tabs `Slepá mapa` / `Co je tady`, default index =
`<GeoBlindPage />`.

`GeoBlindPage` (mode 1):
1. `useGeoBlindProgress` nad `geo.blind` slice.
2. `current: POI | null` v `useState`. Picker v `useEffect` jen když
   `current === null && phase === 'answering'` (LEA Gotcha 7 pattern).
3. `phase`: `'answering'` → `'revealed'`. `userClick: Vec2 | null`, `hit: boolean | null`.
4. Map layers: TileLayer + mastered POI (faded markery / polyline) + click-capture
   (jen `answering`) + reveal (jen `revealed`: target marker, wrongClick marker).
5. Click handler: `evaluateClick(poi, click)` z `logic/hitTest.ts`. `recordSubmit`
   s `perfect: hit`. Phase → revealed.
6. Skip: `recordSkip` + `trackQuestionSkipped({ module: 'geo-blind' })`.
7. SubmitFooter v `submit-footer--end`. Skip pořád dostupný, "Další otázka" jen
   v revealed.

`GeoNamePage` (mode 2):
1. `useGeoNameProgress` nad `geo.name` slice.
2. Stejný picker pattern. `feedback: { matched: POI|null, raw: string } | null`.
3. Map layers: TileLayer + mastered + asked POI (pulsing marker BEZ labelu).
   V revealed se asked přepne na `target` (correct) / `wrongClick` (incorrect)
   variant a dostane label.
4. `GeoAnswerInput` je adapt LEA `AnswerInput`: input + Vyhodnotit + autocomplete
   `suggestPois(input, ALL_POIS)`. Match přes `matchPoi(input, [target])` — proti
   jen current target POI, jako Penal Recall.
5. Hard mode toggle (`useState(false)`) v `submit-footer--split` vlevo. Per-session,
   nepersistuje.
6. Skip + reset analogicky `geo-name` testidy.

`GeoSidePanel` (sdílený obě módy přes prop `mode: 'blind'|'name'`):
- ProgressHeader s testid `geo-{mode}-progress-percent` / `-bar`.
- 4 checkboxy `geo-filter-{street|highway|city|state}`. Mění `geo.settings.categoryFilter`
  přes `useGeoSettings` (sdílený hook). Filter platí pro oba módy.
- POI seznam — chips s 3-znakovou kategorií (ULI/LMK/PD), name, ✓ pro mastered.
- Mobile přes `<details>` v `GeoMobilePanel`.

## Law (Teorie) UI flow

`LawPage` (`src/modules/law/components/LawPage.tsx`) je **jediná stránka** na routě `/law`.
Sjednocený kvíz LEA + Penal scénky + SASP, render dle `current.kind`:

1. `useLawQuizProgress` nad `law` slice + `useLawSettings` (sourceFilter + themeFilter).
2. `current: LawQuestion | null` v `useState`. Picker `pickNextQuestion` v `useEffect`
   jen když `current === null && phase === 'answering'` (LEA Gotcha 7 pattern).
3. `phase`: `'answering'` → `'revealed'`. Reveal state dle kind.
4. **Render dle `kind`** (TS narrowing přes `current.kind === …`):
   - `choice`: `<ChoiceInput>` — ≥5 options, klávesy `1`–`N`. `trackLawAnswered({kind:'choice'})`.
   - `text`: `<TextInput>` — input + autocomplete + Hard mode toggle. `trackLawAnswered({kind:'text'})`.
   - `enumeration`: `<EnumerationInput>` — multi-chip input (aliases nebo paragraph matcher
     dle `matcher`). `<ScenarioBox>` zobrazí scénku nad inputem. `trackLawAnswered({kind:'enumeration'})`.
   - `match`: `<MatchInput>` — click-pairing levý↔pravý sloupec. `trackLawAnswered({kind:'match'})`.
5. Skip (`law-skip`), Reset (`LawResetButton`), Congrats, testidy `law-*`.
6. Klik na chip v `LawSidePanel` → `handleSelect(id)` přepne na danou otázku.

`LawSidePanel`:
- ProgressHeader s testid `law-progress-percent` / `-bar`.
- 3 source checkboxy (lea/penal/sasp) + 9 theme checkboxy.
- Chips — source zkratka + prompt, ✓ pro mastered, klik přepne otázku.
- Mobile přes `<details>` v `LawMobilePanel`.

## Refaktor: sjednocený modul Teorie (HOTOVO)

Branch `quiz-refactor`. Plán + spec v `docs/superpowers/plans/` a `docs/superpowers/specs/`.

- Nový `src/modules/law/` s `LAW_QUESTIONS` pool (LEA + Penal scénky + nativní SASP).
- 4 `kind` formáty: `choice` (multi-select ≥5 opts), `text`, `enumeration`, `match`.
- `LawPage`, `LawSidePanel` (source: lea/penal/sasp + 9 témat), `LawResetButton`.
- Adaptéry: `adaptLea.ts` (LEA → enumeration/alias), `adaptPenal.ts` (Penal scénky → enumeration/paragraph).
- Nativní SASP obsah v `src/modules/law/data/sasp/` — 94 otázek (86 choice + 2 text + 2 enum + 4 match).
  Anti-leak: obsah je exam-prep, NESMÍ přebírat konkrétní formulace z reálného testu.
- Storage schema v8: odstraněny `lea`, `penal.scenarios`, `sasp` slices; migrace v7→v8 je stripuje.
- E2E: `e2e/law/` (quiz-flow, filter, redirects, persistence) + `e2e/penal/` (recall-flow).
- Staré routy `/laws/*`, `/sasp` → redirect na `/law`; Penal Recall na `/penal/recall`.
- Staré UI kódy smazány: `src/modules/sasp/`, scénková UI v `laws/penal/`, vlastní kvízové
  komponenty v `laws/lea/`. Zůstaly sdílené primitivy (AnswerList/AnswerRow) a data/logic.

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
   `schemaVersion: 8` se všemi aktuálními slices) a `localStorage["genk-pd:rng-seed"]`.
   Init script používá `sessionStorage` flag `genk-pd:seeded`, aby se
   **nepřeseedoval po reloadu** (jinak by persistence testy byly k ničemu).

4. **SidePanel se renderuje jen jednou**, ne dvakrát. `CodesPage`, `LawPage`,
   `PenalRecallPage` i `GeoLayout` přepínají mezi inline desktop a collapsible mobile
   podle `useMediaQuery('(min-width: 1024px)')`. Bez toho by `data-testid` byly
   duplicitní → strict mode collision.

5. **`progress` a `turn` MUSÍ být v deps `useEffect`** v `ModeWrite`/`ModeChoose`,
   které pickují další otázku — bez nich se po `reset()` (z congrats banneru) nevyzvedne
   nová otázka.

6. **Auto-focus inputu v ModeWrite je SAMOSTATNÝ efekt** s deps `[current, feedback]`,
   ne `queueMicrotask` ve výběrovém efektu. Důvod: když efekt nastaví `current`, input
   ještě není v DOMu (renderuje se `<QuestionSkeleton />`), takže microtask focusne `null`.

7. **`current` v `useState`, NE `useMemo`.** Critical bug fix platí pro všechny kvízové
   stránky (LawPage, PenalRecallPage, GeoBlindPage, GeoNamePage):
   `useMemo(() => pickNextQuestion(...), [progress, turn])` po submitu okamžitě re-pickl
   JINOU otázku → `useEffect` na `[current?.id]` resetnul phase z `revealed` zpátky na
   `answering` → reveal zmizel. Fix: `current` v `useState`, `useEffect` pickne jen
   když `current === null && phase === 'answering'`. `handleSubmit` nechá `current`
   netknuté, jen mění phase.
   **Při přidání nové otázky do `LAW_QUESTIONS` (přes data soubory nebo adaptery)
   MUSÍŠ rozšířit i `LawPage.test.tsx` saturation listu**, jinak `pinNextLawQuestion`
   přestane být deterministický a testy padnou.

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

11. **`schemaVersion` v test seedech musí být `8` se správnými slices**.
    Hardcoded literály ve všech `*.test.tsx` které volají `saveState({...})` musí mít
    `schemaVersion: 8`, `penal: { recall: { progress: {}, turn: 0 } }`,
    `geo` slice s `settings.categoryFilter` (4 kategorie) a `law` slice s
    `progress: {}`, `turn: 0`, `settings.sourceFilter` (3 zdroje) a `settings.themeFilter` (9 témat).
    BEZ `lea`, `sasp` nebo `penal.scenarios` — migrace v8 je stripuje.
    Pokud přidáš další slice, bumpni schema (v8 → v9) a doplň migraci v `storage.ts`.

12. **Vite dev server je default lockdown na `localhost`.** Pro ngrok/cloudflared
    tunel je v `vite.config.ts` `server.allowedHosts: ['.ngrok-free.app', '.ngrok.app',
    '.trycloudflare.com']`. Bez toho Vite vrací "Blocked request" pro neznámé hosty.

13. **`text-sasp-ink-dim` použít NE `text-sasp-ink/60`**. CLAUDE.md / Tailwind paleta
    má pojmenovaný odstín pro tlumený text — preferuj ho.

14. **Žádná emoji v kódu / dokumentaci**, pokud uživatel výslovně nepožádá.

15. **`.card` třída NEMÁ padding.** Padding (`p-6 sm:p-8` typicky) se přidává
    per použití. Codes panely, HomePage karty, `<main>` v LawPage i PenalRecallPage
    si ho přidávají samy. Bez něj vypadá karta nalepená na okrajích —
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

18. **Mixpanel projekt je EU-resident** — `api_host: 'https://api-eu.mixpanel.com'`
    MUSÍ zůstat v `mixpanel.init()` configu. Bez toho SDK posílá na default
    `api-js.mixpanel.com` (US) → server vrátí HTTP 200, ale eventy se v EU
    instanci nikdy neobjeví (v Live View by bylo prázdno, v Network OK). Symptom
    je nezáludný — proto se snadno přehlédne.

19. **Simplified Identity Merge dropuje anonymní `people.*` calls** — Mixpanel
    od ~2024 default. `mixpanel.identify(mixpanel.get_distinct_id())` PŘED
    `people.set_once` v `initAnalytics` to obchází: self-identify s `$device:...`
    ID „povýší" anonymní distinct_id na stabilní identitu, profil se v Users
    tab vytvoří. **Neodstranit ten řádek** (eventy by chodily, profily ne — to
    se debugguje hodiny).

20. **E2E vypíná Mixpanel přes `window.__GENK_E2E__`** — `seed()` flag nastaví
    v `addInitScript` (mimo session-once guard, takže perzistuje přes reload).
    `initAnalytics()` na flagu vrátí no-op před `mixpanel.init`. Všechny E2E
    specy volají `seed()`, takže to platí univerzálně. Pokud bys někdy psal
    spec bez `seed()`, Mixpanel by bootnul a route blocks v `seed()` by chyběly
    → reálné requesty by ucházely.

21. **Skip override-uje feedback skóre** — v ModeWrite/ModeChoose i v LEA
    `revealed` phase je tlačítko Skip stále aktivní. Stisk po `recordAnswer`
    (codes) nebo `recordSubmit` (LEA) přepíše skóre absolutně na MAX (`+2`).
    To je úmyslné UX: uživatel řekne „znám, dej mi další". `recordSkip`
    zapisuje absolutní hodnotu, ne deltu, takže prior wrong submit (-2) /
    wrong answer (-1) je vyresetován. Při ladění: pokud chceš zachovat
    skip-only-before-answer chování, schovej tlačítko podmínkou na `feedback`/
    `phase`.

22. **UI clamp earnedScore na MAX_SCORE (2)** — progress-bar pct počítá
    `Σ min(2, max(0, score))` namísto `Σ max(0, score)`. Bez horního clampu
    by legacy `score=3` (z rozsahu `-3..+3`) dával pct > 100 % (test viděl
    150 %). Místa: codes `SidePanel.tsx` + MobilePanel, law `LawSidePanel.tsx`
    + MobilePanel, penal `PenalSidePanel.tsx` + `PenalRecallPage.tsx` MobilePanel,
    geo `GeoSidePanel.tsx`. Při bumpu range nezapomenout všechna místa.

23. **Penal mode A: strict ID matching, žádný partial credit** —
    `matchScenarioAnswer` vrací null, pokud paragraf má subs ale uživatel
    neuvedl sub (nebo naopak). Stejně tak špatný sub (`25a` při expected `25b`)
    je v page logice plné `wrong`. To je úmyslný edukační design — modul učí
    distinkci sub-paragrafů. Pokud bys to měnil, drsně to změní expected
    behavior všech 28 scénář.

24. **Penal recall pool je derivovaný subset z `PENAL_PARAGRAPHS`** přes
    `data/recallPool.ts` (filter na `paragraphId` z `PENAL_SCENARIOS.expected`).
    Když přidáš novou scénku referující dosud nepokrytý paragraf, RECALL_PARAGRAPHS
    se automaticky rozšíří. Když odebereš poslední scénku referující paragraf,
    spadne z recall poolu — uživatelé už ho nikdy v mode B neuvidí. Test
    `recallPool.test.ts` validuje, že pool match union scénár expected.

25. **Penal paragraph IDs v E2E seed musí být sync s daty** — `e2e/fixtures/seed.ts`
    má hardcoded `PENAL_PARAGRAPH_IDS` pro Recall saturation. Když přidáš nový paragraf do
    `paragraphs.ts`, **rozšiř i list v seed.ts**, jinak `pinNextPenalParagraph` přestane
    saturovat N-1 a picker pustí jiný target. `PENAL_SCENARIO_IDS` ze seedu byl
    odebrán (scénky jsou nyní v Teorie, ne v standalone E2E).

26. **`EnumerationInput` (paragraf matcher) používá canonical ID jako match key, ne quote** —
    chip excludeKeys obsahuje `'25b'`, `'27'`, ne `paragraphId`. Pokud bys měnil
    AnswerList nebo chip strukturu, drž canonical ID jako exclude klíč.

27. **Hard mode toggle v `EnumerationInput` (paragraf matcher) je per-session state**
    (`useState(false)` v `LawPage`). Stav nepřežije refresh. Záměrně — bumpnout
    schema až bude poptávka. Pokud má persist, přidat do `law.settings.hardMode`
    a bumpnout schema (v8 → v9).

28. _(rezervováno)_

29. **Schema je v8** — bumpnuto z v7 odstraněním `lea`, `sasp`, `penal.scenarios` slices
    (v7 = +law slice additivně, v6 = sasp quiz sloučen, v5 = sasp split, v4 = geo).
    **Test seedy s hardcoded `saveState({...})` nesmí obsahovat `lea`, `sasp` ani
    `penal.scenarios`** — migrace v8 je stripuje, takže v unit testech jsou zbytečné
    a v E2E seed jsou schválně vynechány. Pokud přidáš nový modul, bumpni v8 → v9
    a doplň migraci v `storage.ts`.

30. **Tile pipeline NEní v `npm run build`** — `scripts/generate-tiles.mjs` je
    jednorázový skript spouštěný ručně (`node scripts/generate-tiles.mjs`).
    Generuje 802 tiles do `public/tiles/{z}/{x}/{y}.jpg` (z=0..3, ~5.7 MB) +
    přepisuje `src/modules/geo/data/tileMeta.ts`. Output je commitnutý — pokud
    bys měnil source `docs/clean-map.jpg` (8192×12288), spusť skript a commitni
    nové tiles. Pokud chceš ostřejší max zoom, bumpni `MAX_ZOOM` v skriptu na 4
    (přidá ~600 tiles, ~25 MB navíc).

31. **react-leaflet v jsdom se rozbije** — komponenty `MapContainer`, `TileLayer`,
    `Marker`, `Polyline`, `Tooltip` a `useMapEvents` se rendrovat nedají bez
    skutečného Layoutu. Vzor pro page testy (`GeoBlindPage.test.tsx`,
    `GeoNamePage.test.tsx`): `vi.mock('react-leaflet')` se stub komponentami
    + `useMapEvents` zachytávajícím handler do `vi.hoisted` capture objektu.
    Test pak triggerne click handler přímo s fake `latlng` (přepočítaným z
    normalizovaných coords přes `TILE_META`). Real Leaflet rendering testujeme
    jen v Playwright E2E.

32. **Geo hit-test je ve square coord space (akceptujeme aspect distortion)** —
    `pointHit` a `polylineHit` z `logic/hitTest.ts` počítají Euklidovu distanci
    v normalizovaném 0..1 prostoru. Source JPEG je portrait 8192×12288, takže
    1 jednotka v Y odpovídá menšímu počtu pixelů než v X. Pro práh medium 0.0233
    to znamená cca 191 zdrojových px v X vs 286 v Y. Pro MVP fine. Pokud bude
    bolet, vynásobit Y rozdílem (8192/12288 = 0.667) v hit-testu pro skutečně
    izotropní distanci.

33. **POI dataset je hardcoded TS literal** v `src/modules/geo/data/pois.ts`
    s normalizovanými coords (0..1) ověřenými proti `docs/clean-map.jpg`. Pokud bys
    posouval marker, edituj `position` / `path` v literálu a `pois.test.ts` to
    validuje (range, alias non-collision). Pro hromadnou revizi POI použij
    `gta-5-map.com` jako referenci.

34. **Geo POI IDs v E2E seed musí být sync s daty** — `e2e/fixtures/seed.ts`
    má hardcoded `GEO_POI_IDS` (30 IDs). Při přidání nové POI do `pois.ts`
    rozšiř i list v seed.ts, jinak `pinNextGeoPoi` přestane saturovat 29/30
    a picker pustí jiný target.

35. **Geo ResetButton je per-mode** — `<GeoResetButton mode="blind" />` resetuje
    JEN `geo.blind` slice. Druhý režim a `categoryFilter` zůstávají. Confirm
    dialog testidy `geo-{mode}-reset-{button|confirm|cancel|confirm-yes}`.

36. **GeoLayout je top-level modul, ne pod /laws** — `/geo/blind` a `/geo/name`
    žijí na top-level routě. AppLayout nav má 4 odkazy (Codes/Teorie/Geo/Penal Recall),
    HomePage 4 karty. Při testování home navigace přes `getByRole('link',
    { name: 'Geografie', exact: true })` se shoduje na **navbar link**
    (jednoduchý text), ne na home kartu (link + h2 + p + span = složitý
    accessible name).

37. **4 POI kategorie** — `POICategory = street | highway | city | state`
    (Ulice / Dálnice / Body ve městě / Body ve státě). street+highway = polyline
    geometrie, city+state = point. ID prefix == kategorie (`city.lsia`,
    `highway.del-perro-fwy`). Test fixtures s `categoryFilter` literálem musí mít
    všechna 4 pole (jinak TS type error). Při změně kategorií: update types.ts
    + GeoCategoryFilter v storage.ts + initialState defaults + lenient read
    backfill + GeoSidePanel CATEGORY_LABEL/ABBR/ORDER + GeoBlindPage
    CATEGORY_LABEL + pois.test.ts counts + všechny test fixtures + e2e seed
    (`seed.ts` typ + builder) + `geo-poi-ids.ts` (přejmenované ID).

38. **POI s názvem rovným nějakému aliasu po normalize** = test fail
    (`alias collision with name`). Příklad: name "PDM" + alias "pdm" — oba
    normalizují na "pdm". Řešení: odebrat redundantní alias.

39. **KRITICKÉ: clean-map.jpg NENÍ lineární projekce vanilla GTA světa** —
    `docs/clean-map.jpg` (8192×12288, stitch 6 minimap textur přes
    `scripts/extract-minimap.py`) je CUSTOM mapa serveru: stejný ostrov,
    ale regionálně deformovaná geometrie vs. vanilla world coords (jih města
    je až ~1 km „severněji", deformace je nelineární a neopravitelná žádnou
    globální transformací — empiricky ověřeno fitem road grafu i měřením
    křižovatek). Dřívější teorie „uniform projection x∈[-4000..4000],
    y∈[-4000..8000] @1.024 px/m" je CHYBNÁ — historický `gtaProjection.ts`
    a migrace na ní stavěly a rozbily pozice. **Jediný zdroj pravdy pro souřadnice je
    samotný art** (jeho popisky ulic, route shields, parcelní čísla).
    Z toho plyne: NEgenerovat geo souřadnice z vanilla GTA dat (path-node
    dumpy, Foxxite GeoJSON apod.) — všechny takové pipelines byly smazány.

40. **POI pozice = vizuálně ověřené proti artu**
    — POI pozice jsou umístěné a vizuálně ověřené přímo proti artu
    (`docs/clean-map.jpg`). Jediný zdroj pravdy = art (Gotcha 39). Nejisté
    kandidáty doladit přes `/geo/calibrate` Drag&Drop.

41. **Street centerlines jsou HAND-TRACED z artu** (`streets.generated.ts`,
    navzdory názvu už NENÍ generovaný) — obkresleny podle popisků ulic a
    route shields v artu (I-2 = Del Perro, I-4 = Olympic, I-5 = La Puerta,
    I-1/„Los Santos Freeway" text = LS Fwy, US-13 = Senora, US-15 = Palomino,
    US-1 = GOH, US-68 = Route 68, US-20 = Elysian oblast). Hit-test =
    perpendikulární distance ≤ `POLYLINE_HIT_TOLERANCE` (0.015). Při
    retuningu použít `/geo/blind` debug overlay (klávesa `D`: vykreslí
    všechny centerlines + loguje normalized click coords do console) a
    Drag&Drop editor `/geo/calibrate`, pak paste do `streets.generated.ts`.

42. **Klikací tolerance bodových POI je per-`size`, ne fixní** — `evaluateClick`
    bere práh z `SIZE_THRESHOLDS[poi.size ?? 'medium']` (`logic/hitTest.ts`):
    tiny 0.01 / small 0.0167 / medium 0.0233 / large 0.0367 / huge 0.06. Velké
    rozlehlé oblasti (letiště, doky, města, ropné pole — `size: "huge"`) mají
    velkou klikací zónu, pinpoint budovy (`size: "small"`) malou. `size` je
    volitelné na `POIBase`, ale prakticky platí jen pro point geometry (ulice
    drží fixní `POLYLINE_HIT_TOLERANCE`). `HIT_THRESHOLD` je teď alias medium
    (0.035, byl flat 0.03). Explicitní `threshold` param `evaluateClick` pořád
    override-uje size (testy). `pois.test.ts` validuje, že každý point POI má
    `size` z 5 hodnot. **`formatPoisTs` (calibrate export) emituje `size`** — bez
    toho by re-export z `/geo/calibrate` pole smazal. Retuning hodnot: edituj
    `SIZE_THRESHOLDS` (globálně) nebo per-POI `size` v `pois.ts`. Tier `tiny`
    je zatím nepoužitý (k dispozici pro budoucí pinpoint POI).

43. **Law question IDs v E2E seed musí být sync s daty** — `e2e/fixtures/seed.ts`
    má pro saturation v `LawPage.test.tsx` interně seznam ID. Při přidání nové
    otázky do `law/data/sasp/`, `laws/lea/data/questions.ts` nebo `laws/penal/data/scenarios.ts`
    rozšiř i saturation list v `LawPage.test.tsx`, jinak `pinNextLawQuestion` přestane
    být deterministický a testy padnou (stejný pattern jako Penal Gotcha 25, Geo Gotcha 34).
    Nový SASP obsah: přidej do příslušného souboru v `law/data/sasp/`, ID prefix
    `sasp.<kind>.<theme>.<n>`, pak updatuj test counts v `sasp.test.ts`.

44. **Text aliasy v Law otázkách nesmí po normalize kolidovat s `answer`** —
    `sasp.test.ts` to validuje pro SASP text otázky (analog Geo Gotcha 38).
    Diakritika-free varianta aliasu je redundantní (normalize stripuje diakritiku),
    takže `answer: "Státní zástupce"` + alias `"statni zastupce"` = fail.
    Přidávej aliasy jako skutečné parafráze, ne diakritické varianty.

45. **`LawQuestion` je discriminated union přes `kind`** — `choice | text | enumeration | match`.
    `LawPage` větví render přes `current.kind === …` (TS narrowing). **Nepoužívej
    boolean const k zúžení typu** — nenarrowuje. Nová interakce = nový `kind` +
    větev v `LawPage` + příslušný Input komponent + (volitelně) matcher v
    `law/logic/`.

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

- **Firearm Act** obsah: přidat jako nový `source: 'firearm'` do `LAW_SOURCE_KEYS`
  v `storage.ts`, bump schema (v8 → v9) a doplň migraci. Data adapter v
  `src/modules/law/data/adaptFirearm.ts` + otázky v `law/data/firearm/`.
  Zdroj: `docs/firearm-act.md`. Staré doporučení "nový modul pod /laws/firearm"
  je obsolete — vše jde do sjednoceného `/law` poolu.
- **Sdílený SidePanel ProgressHeader/SCORE_CLASS**: aktuálně duplikovaný v
  `codes/SidePanel.tsx`, `law/LawSidePanel.tsx`, `laws/penal/PenalSidePanel.tsx`.
  YAGNI dokud se nezačne lišit nebo bolet při změnách.
- **Geo polygon regiony / čtvrti** (`/geo`): MVP nemá kategorii `district` —
  Vinewood, Del Perro atd. Polygon podpora byla z kódbáze odstraněna (typ
  POIPolygon, polygon hit-test přes @turf/* — viz git historie). Pokud bude
  poptávka, přidat 7. kategorii `district` s `geometry: 'polygon'` znovu:
  typ + hit-test point-in-polygon + render + formatPoisTs větev.
- **Geo tile zoom z=4** (native pixel sharpness): aktuálně cap z=3, max zoom
  ~5x downscaled. Bumpe `MAX_ZOOM` v `scripts/generate-tiles.mjs` na 4 přidá
  ~600 tiles (~25 MB). Smysl pokud user reportuje rozmazaný max zoom.
- **Geo Hard mode persistence** (`geo.settings.hardMode`) — analog Penal Hard
  mode persistence. Stejný argument: bumpni schema až bude poptávka.
- **Geo POI dolaďení v Drag&drop** — pozice jsou vizuálně ověřené, ale ne
  pixelově přesné. Když user zaregistruje konkrétní špatnou pozici, otevřít
  `/geo/calibrate` (Drag&drop editor), drag-tune, export TS → paste do `pois.ts`.
  Ulice (polyline) mají per-node draggable handles.
- **Teorie modul — SASP obsah rozšíření** — aktuálně 94 SASP otázek (text/enum/match
  formáty podreprezentovány). Přidávat do `src/modules/law/data/sasp/`.
  `docs/sasp-manual.md` zůstává v `.gitignore` (důvěrný zdroj).
  Anti-leak: NESMÍ přebírat konkrétní formulace z reálného testu.
- **Penal scénky další** — přidat do `modules/laws/penal/data/scenarios.ts`;
  `adaptPenal.ts` je automaticky zahrne do `LAW_QUESTIONS`. Rozšíří i `RECALL_PARAGRAPHS`.
- **False-negative aliasy** v LEA / Penal — rozšířit alias seznam v `questions.ts` /
  `paragraphs.ts` ručně. Pozor na strict legal correctness (viz Gotcha o LEA §15 5a).
- **`ComingSoonPage`** (`src/app/ComingSoonPage.tsx`) je bez použití — ponechán
  pro budoucí placeholdery, není importován v `routes.tsx`.
