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
3. **Penal Code** (`/laws/penal`) — Trestní zákoník, dva režimy přepínané
   tabs nahoře (analog `/codes`):
   - **Scénky** (`/laws/penal/scenarios`, default index) — krátké policejní
     popisy situace, uživatel doplňuje paragrafy včetně sub-paragrafu (`25b`,
     `§14a`, `27`). Strict ID matching, autocomplete navrhuje paragrafy po ID
     i názvu, "Hard mode" checkbox v submit-footeru autocomplete vypíná.
   - **Recall** (`/laws/penal/recall`) — aplikace se ptá „Co je §X?",
     uživatel doplní název paragrafu (alias matching jako LEA). Pool je
     omezený jen na paragrafy, které se objeví v některé scénce (27 položek).
   Side panel na recall obsahuje jen čísla paragrafů, na scénkách jejich `ref`
   + zkrácený prompt.
4. **Geografie** (`/geo`) — interaktivní mapa Los Santos a Blaine County
   (Leaflet + CRS.Simple + tile pyramid 0..3 nad `clean-map.jpg` 5944×8075),
   2 herní režimy + interní kalibrátor:
   - **Slepá mapa** (`/geo/blind`, default index) — uživatel dostane prompt
     „Klikni na X — popis" a kliká na mapu. Hit-test binární s prahem 0.03
     normalizovaných jednotek (~3 % šířky). Bodové POI: euklidovská distance.
     Polyline POI (ulice): minimum perpendikulární distance segmentu.
   - **Co je tady** (`/geo/name`) — pulzující marker na mapě bez popisku,
     uživatel napíše název. Free-text + autocomplete (LEA pattern) +
     Hard mode toggle (Penal pattern).
   - **Kalibrátor** (`/geo/calibrate`) — interní 3-tab editor: `Drag&drop`
     (ladění existujících POI), `Anchor & import (MG)` (Map Genie data + bulk
     import přes affine fit), `Přidat POI` (formulář + klik na mapu pro nové
     point/polyline).
   Mastered POI zůstávají faded markery / polyline s názvem na mapě → mapa
   se postupně „odemyká". Společný `categoryFilter` (6 kategorií:
   street/landmark/pd/fire/ems/ammu) v `geo.settings`. Per-režim progress
   (jako Penal). **68 POI dataset** (`pois.ts`): 43 landmark + 2 pd + 1 fire
   + 1 ems + 1 ammu + 20 street. 34 landmarků auto-derived z MG affine fit
   (anchors v `anchorsCalibration.ts`), zbytek manuálně eyeball.

Rozcestník `/laws` (komponenta `LawsIndex`) má LEA i Penal Code aktivní,
**Firearm Act** je disabled (`aria-disabled`, čeká na implementaci).
**SASP příručka** (`/sasp`) je ještě jako `<ComingSoonPage>`. Geografie je
samostatný top-level modul, ne pod `/laws`.

Pure-frontend, žádný backend. Veškerý stav v `localStorage` (klíč `genk-pd:v1`,
schemaVersion 5).

## Stack

- Vite 6 + React 18 + TypeScript 5.6
- Tailwind CSS 3.4 (SASP paleta v `tailwind.config.js`: `sasp-bg`, `sasp-navy`,
  `sasp-navy-light`, `sasp-tan`, `sasp-gold`, `sasp-red`, `sasp-ink`, `sasp-ink-dim`)
- React Router 6 (`createHashRouter` — pozor, ne Browser router; URL používá
  `#/laws/lea` formát)
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

`npm run test:all` musí být zelené: **384 unit/component + 67 E2E = 451 testů**.
Žádná manuální verifikace — pokud něco rozbiju, opravím a prohnám testy.

Tile pipeline (geo modul) se NEspouští v `npm run build` — je to one-time skript
`node scripts/generate-tiles.mjs` po výměně source mapy. Výstup `public/tiles/`
je commitnutý.

Map Genie scrape (geo modul) se NEspouští v `npm run build` — je to one-time
idempotentní skript `node scripts/scrape-mapgenie.mjs`. Zapisuje archiv do
`docs/mapgenie-data/` (commitnuté).

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
      components/LawsIndex.tsx      # /laws rozcestník (LEA + Penal aktivní, Firearm disabled)
      lea/                          # LEA quiz sub-modul
        data/
          types.ts                  # AnswerItem, Question rozhraní
                                    # (Question má description: krátký popis pro SidePanel)
          questions.ts              # LEA_QUESTIONS — 17 otázek, 95 položek, ~505 aliasů
        logic/
          match.ts                  # matchAnswer — exact equality po normalize
          suggest.ts                # suggestItems — autocomplete, min 4 znaky, max 5 návrhů
        state/
          selection.ts              # pickNextQuestion + isLeaComplete
          useLeaProgress.ts         # Skóre/turn pro lea slice (delta ±2)
        components/                 # LeaQuizPage, AnswerInput, AnswerList, AnswerRow,
                                    # SubmitFooter, SidePanel, LeaResetButton
      penal/                        # Penal Code sub-modul (002-19), 2 sub-režimy
        data/
          types.ts                  # PenalParagraph, PenalScenario, ExpectedAnswer
          paragraphs.ts             # PENAL_PARAGRAPHS — 75 paragrafů (§1–§77, §100–§102)
          scenarios.ts              # PENAL_SCENARIOS — 28 scénář A1–E9
          recallPool.ts             # RECALL_PARAGRAPHS — derivované, jen ty co jsou
                                    # v některé scénce (27 paragrafů, vyloučeno §1–§6 atd.)
        logic/
          canonicalAnswerId.ts      # '§25 b' / '25B' / '25b' → '25b' (null pokud neparseable)
          matchScenario.ts          # parse user inputu → ExpectedAnswer; strict, žádný
                                    # partial credit. + expectedEquals pro porovnání.
          matchParagraph.ts         # mode B alias matching, sdílí normalize s LEA
          suggestParagraph.ts       # mode A autocomplete (ID prefix nebo name substring),
                                    # expanduje paragraph na všechny sub-varianty
        state/
          selection.ts              # pickNextScenario, pickNextRecallParagraph,
                                    # isScenariosComplete, isRecallComplete
          usePenalProgress.ts       # Generický hook usePenalSliceProgress(key) →
                                    # 2 veřejné: usePenalScenarioProgress, usePenalRecallProgress
        components/                 # PenalLayout (tabs + Outlet, jako CodesPage),
                                    # PenalScenarioPage, PenalRecallPage, PenalAnswerInput,
                                    # PenalSidePanel (generický pro obě módy s {label, sublabel?,
                                    # hoverTitle}), PenalSubmitFooter, PenalResetButton
    geo/                            # Modul geografie (interaktivní mapa + 2 sub-režimy + kalibrátor)
      data/
        types.ts                    # POIBase, POIPoint, POIStreet, POI discriminated union,
                                    # POICategory: 6 hodnot (street/landmark/pd/fire/ems/ammu)
        pois.ts                     # POIS — 68 POI z uživatelova zadávacího seznamu:
                                    # 43 landmark + 2 pd + 1 fire + 1 ems + 1 ammu + 20 street.
                                    # 34 landmarků MG-derived (Δ ≤ 0.0005), zbytek manuál.
                                    # Coords 0..1 vůči clean-map.jpg (5944×8075). POI_BY_ID.
        anchorsCalibration.ts       # DEFAULT_ANCHORS — 6 persistentních kotev (Vespucci PD,
                                    # Paleto Motel, Humane Labs, Helicopter lookout, Galileo
                                    # Observatory, Bolingbroke Penitentiary). UI nahrává
                                    # automaticky při mountu Anchor & import tabu.
        mapgenieLocations.ts        # Typed wrapper nad docs/mapgenie-data/filtered.json
                                    # (355 lokací). MG_LOCATIONS + MG_LOCATION_BY_ID.
        tileMeta.ts                 # TILE_META — auto-generovaný skriptem generate-tiles.mjs
        pois.test.ts                # Validace (count, unique IDs, alias non-collision,
                                    # canonical id prefix per category, geometry consistency)
      logic/
        coords.ts                   # toLatLng / fromLatLng helpery (CRS.Simple [y,x])
        hitTest.ts                  # pointHit, polylineHit (perpendikulární seg distance),
                                    # evaluateClick(poi, click, threshold=0.03)
        match.ts                    # matchPoi — strict equality po normalize, name + aliases
        suggest.ts                  # suggestPois — substring autocomplete, min 2, max 5
        calibrate.ts                # fitAffine (4-param), fitAffine6 (6-param: +rotace,shear),
                                    # fitTps (Thin-Plate Spline, exact interpolation).
                                    # apply* counterparts, CalibrationPair, formatPoisTs.
                                    # Internal: solve3x3, solveLinearSystem (Gauss elimination).
        transform.ts                # MG-specific:
                                    # · mgLatLngToVec2 — KRITICKÉ: aplikuje Web Mercator
                                    #   forward na latitude (log(tan(π/4 + lat·π/360))).
                                    # · fitAnchorTransformMode (auto/affine6/tps)
                                    # · fitBestAnchorTransform (= auto)
                                    # · computeResiduals / computeLooResiduals
                                    # · MgTransform union (affine4/affine6/tps)
      state/
        selection.ts                # pickNextPoi(state, pois, filter) přes pickNextFromPool,
                                    # eligiblePois, isGeoComplete
        useGeoProgress.ts           # Generický hook useGeoSliceProgress('blind'|'name') →
                                    # 2 veřejné: useGeoBlindProgress, useGeoNameProgress
        useGeoSettings.ts           # Category filter (6 kategorií), persistuje
      components/                   # GeoLayout (tabs + Outlet), GeoBlindPage (mode 1),
                                    # GeoNamePage (mode 2), GeoMap (Leaflet wrapper +
                                    # MapClickCapture), GeoMarker, GeoStreet, GeoSidePanel,
                                    # GeoMobilePanel (<details>), GeoAnswerInput, GeoResetButton,
                                    # GeoCalibratePage (3-tab kontejner)
        calibrate/                  # Tab implementations:
                                    # · DragDropTab — POI markery tažitelné, polyline nody
                                    #   draggable, export TS přes formatPoisTs
                                    # · AnchorImportTab — MG seznam vlevo (search + checkboxy
                                    #   pro import), mapa centr, anchor click flow, Model
                                    #   dropdown (auto/affine6/tps), Preview všech 355 MG
                                    #   checkbox, per-anchor Δ + LOO residual (zelená<0.02,
                                    #   žlutá 0.02-0.04, červená >0.04), "Reset na defaultní"
                                    #   tlačítko
                                    # · AddPoiTab — formulář (id/name/desc/aliases/cat/geometry)
                                    #   + klik na mapu pro point/polyline, draggable, export TS
  shared/
    storage.ts                      # Versionovaný localStorage wrapper, schemaVersion 5,
                                    # chained migrate v1→v2→v3→v4→v5 při readu, lenient v5 read.
                                    # migrateV4ToV5: clear geo.blind.progress + geo.name.progress
                                    # (POI IDs přepsány při novém datasetu), settings zachovat
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
  scrape-mapgenie.mjs               # MG scraper: fetch gta-5-map.com HTML, parse inline
                                    # window.mapData, write docs/mapgenie-data/*. Idempotentní,
                                    # filtr 15 relevantních kategorií (Police, Hospital,
                                    # Building, Misc, Executive Office, Facility, atd.).

public/
  tiles/                            # Vygenerované Leaflet CRS.Simple tiles, z=0..3,
                                    # 802 JPEG souborů, ~5.7 MB

docs/mapgenie-data/                 # Trvalý archiv MG datasetu (commitnutý):
  raw.html                          # Celá HTML response (943 KB)
  raw.json                          # window.mapData (1.2 MB, 2269 lokací × 67 kategorií)
  filtered.json                     # 355 lokací z 15 relevantních kategorií (103 KB) —
                                    # source pro mapgenieLocations.ts
  scraped-at.txt                    # Timestamp + URL + counts
docs/poi-mapping.md                 # Mapování uživatelova POI seznamu → MG IDs + CZ jména
                                    # + aliasy. Cheat sheet, aplikace ho NEČTE. Slouží jako
                                    # human reference pro generování pois.ts.

e2e/
  fixtures/seed.ts                  # `seed(page, { codes-flat-fields, lea?, penal?, geo?, randomSeed? })`
                                    # Píše schemaVersion 4, exportuje LEA_QUESTION_IDS,
                                    # PENAL_SCENARIO_IDS, PENAL_PARAGRAPH_IDS, GEO_POI_IDS,
                                    # pinNext{Question, LeaQuestion, PenalScenario,
                                    # PenalParagraph, GeoPoi}
  codes/*.spec.ts                   # 7 spec souborů, 20 testů
  laws/lea/*.spec.ts                # 6 spec souborů (quiz-flow, matching, autocomplete,
                                    # submit-reveal, persistence, responsive), 16 testů
  laws/penal/*.spec.ts              # 3 spec soubory (scenario-flow, recall-flow, persistence),
                                    # 12 testů
  geo/*.spec.ts                     # 3 spec soubory (blind-flow, name-flow, persistence),
                                    # 12 testů
```

Nový modul (Firearm Act) → kopíruj strukturu `modules/laws/penal/` (která už ukazuje
2-režim pattern s tabs), přidej route v `src/app/routes.tsx`, přidej do `LawsIndex.tsx`.
Sdílené utility (`normalize`, `pickNextFromPool`) jsou generické. AnswerList/AnswerRow
se importují z LEA jako visual primitivy — viz Gotcha o YAGNI.

## Datový model

```ts
// localStorage["genk-pd:v1"]
{
  schemaVersion: 5,
  codes: {
    progress: { [codeId]: { score: -2..+2, lastAskedAtTurn: number } },
    turn: number,
    settings: {
      importanceFilter: { mandatory: bool, rare: bool, unnecessary: bool }
    }
  },
  lea: {
    progress: { [questionId]: { score: -2..+2, lastAskedAtTurn: number } },
    turn: number
  },
  penal: {
    scenarios: { progress: { [scenarioId]: ProgressEntry }, turn: number },
    recall:    { progress: { [paragraphId]: ProgressEntry }, turn: number }
  },
  geo: {
    blind: { progress: { [poiId]: ProgressEntry }, turn: number },
    name:  { progress: { [poiId]: ProgressEntry }, turn: number },
    settings: {
      categoryFilter: {
        street: bool, landmark: bool, pd: bool,
        fire: bool, ems: bool, ammu: bool
      }
    }
  }
}
```

**Migrace v1 → v2 → v3 → v4 → v5** (`src/shared/storage.ts`): při readu se starší
payload chained-migruje v paměti. v1: codes zachováno, lea přidáno default.
v2: codes+lea zachováno, penal přidáno default. v3: codes+lea+penal zachováno,
geo přidáno default. **v4 → v5**: `migrateV4ToV5` vynuluje `geo.blind.progress`
+ `geo.name.progress` (POI IDs kompletně přepsané v novém 68-POI datasetu),
settings se přenese a doplní nové default kategorie (fire/ems/ammu = true).
`saveState` vždy zapisuje v5.

**Lenient v5 read**: pokud v5 payload chybí `geo` nebo některá sub-slice
(`blind` / `name` / `settings`), dopočítáme prázdné defaults. categoryFilter
doplní missing kategorie z initialState (každá true). Stejně lenient pro
`penal`. (Test `storage.test.ts`.)

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

### LEA scoring

Skóre `-2..+2` per otázka. Delta **±2** (NE ±1 jako u codes). Mastered na `+2`
(= 1 perfect submit z 0). `recordSubmit({ perfect: bool })` mění skóre.
Reset maže jen `lea` slice, codes zůstávají. Reset je vystaven přes
`LeaResetButton` (pod kvízem vpravo, confirm dialog) a přes „Začít znovu"
na completion screen.

**Skip** (`recordSkip(questionId)`): stejná sémantika jako u codes — score=MAX
(+2) absolutně, override-uje `recordSubmit`. Tlačítko v `SubmitFooter`
(`data-testid="lea-skip"`) v obou fázích `answering` i `revealed`. Skip v
revealed přepíše právě nastavené skóre z `handleSubmit` na +2.

Default `importanceFilter` v `initialState` je **všechno true**. E2E `seed()` má
fallback `mandatory:true, rest:false` — záměrně, ať jsou spec soubory deterministické.

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

### LEA data

`LEA_QUESTIONS` (17 otázek, 95 položek) v `src/modules/laws/lea/data/questions.ts`.
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
filtruje codes přes `eligibleCodes` (importance filter + score < 2).

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
3. Vážený výběr: `weight = 3 - score` (od `-2` váha 5, od `+1` váha 2). Používá
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
kde `eligibleQuestions` filtruje `score < 2`. (LEA nemá importance filter.)

### Penal Code

**Mode A — scénka → paragrafy.** Každá scénka v `PENAL_SCENARIOS` má
`expected: ExpectedAnswer[]` (1–3 položky), kde `ExpectedAnswer = { paragraphId,
subId? }`. Sub-paragraf je povinný, pokud paragraf má `subs.length > 0`,
a NESMÍ být zadaný, pokud `subs.length === 0`.

**`canonicalAnswerId(input): string | null`** normalizuje vstupy `'§25 b'`,
`'25B'`, `'25b'`, `'§25'`, `'27'` → `'25b'` / `'25'` / `'27'`. Strip `§`,
lowercase, collapse whitespace, regex `^(\d+)([a-e]?)$`. Null pro neparseable.

**`matchScenarioAnswer(input, paragraphs): ExpectedAnswer | null`**: parse přes
canonicalAnswerId, najde paragraf podle ID, validuje sub. **Strict** — žádný
partial credit. Špatný sub = wrong. Vrací null = page treats jako wrong chip.

**`expectedEquals(a, b)`**: porovnání ExpectedAnswer. Used by page-level
matching loop, který každý chip zkontroluje proti `scenario.expected[]`.

**`suggestParagraphs(input, paragraphs, excludeKeys): ParagraphSuggestion[]`**:
2 cesty matche.
1. Numeric prefix (`25`, `25b`): rozšíří paragraf na všechny sub-varianty,
   nebo když user napsal sub, jen tu jednu. Rank: kratší ID = výš.
2. Text substring: substring přes title + aliasy po normalize. Rank: pozice
   matche, pak délka title.
`excludeKeys` (Set canonical IDs `'25b'`, `'27'`) skrývá už commitnuté chips.
Min length 1, max 8 výsledků.

**Hard mode** (`PenalScenarioPage` interní `useState`): checkbox v `submit-footer`
vlevo, prop `disableSuggestions` na `PenalAnswerInput` zablokuje autocomplete
úplně. Per-session, nepersistuje.

**Mode B — recall.** Otázka „Co je §X?" pickne paragraf z **`RECALL_PARAGRAPHS`**
(derivovaný subset z `PENAL_PARAGRAPHS` — jen ty co jsou v `PENAL_SCENARIOS.expected`,
27 položek). Mode A pool je pořád celých 75 (uživatel může napsat libovolný §).

**`matchParagraph(input, paragraphs): PenalParagraph | null`** = LEA-style alias
match po normalize. V `PenalRecallPage` se volá s `[current]` (jen aktuální paragraf),
ne s celým poolem — tj. korektní odpověď je jen jméno právě testovaného paragrafu.

**`pickNextScenario`** / **`pickNextRecallParagraph`**: oba delegují na
`pickNextFromPool` se score < 2 filterem.

### Progress bar (všechny moduly)

`pct = Σ min(2, max(0, score(c))) / (2·N)` přes filtrované položky. Záporné
skóre se klampuje na 0 jen pro UI; legacy hodnoty `score > 2` (z původního
rozsahu `-3..+3`) jsou taky zclampované na 2, takže pct nikdy nepřekročí 100 %.
Storage uchovává nově `-2..+2`, selection filtruje `score < 2`.

- **Codes desktop SidePanel**: testid `progress-percent`
- **Codes mobile summary**: testid `mobile-progress-percent`
- **LEA desktop SidePanel**: testid `lea-progress-percent`
- **LEA mobile summary**: testid `lea-mobile-progress-percent`
- **Penal Scenarios desktop**: testid `penal-scenarios-progress-percent`
- **Penal Scenarios mobile**: testid `penal-scenarios-mobile-progress-percent`
- **Penal Recall desktop**: testid `penal-recall-progress-percent`
- **Penal Recall mobile**: testid `penal-recall-mobile-progress-percent`
- **Geo Blind desktop**: testid `geo-blind-progress-percent`
- **Geo Blind mobile**: testid `geo-blind-mobile-progress-percent`
- **Geo Name desktop**: testid `geo-name-progress-percent`
- **Geo Name mobile**: testid `geo-name-mobile-progress-percent`

`isComplete` ⟺ všechny filtrované items na +2.

### SidePanel layout (codes / LEA / Penal sjednoceno)

Všechny boční panely sdílí vizuální jazyk: `card flex flex-col gap-3 p-4` wrapper +
`ProgressHeader` (uppercase tracking-wider "Splněno" vlevo, percent vpravo, bar
pod) + score-based barva pozadí podle stejné `SCORE_CLASS` mapy (`-3..+3`).
Mapa zůstává s rozsahem `-3..+3` pro zpětnou kompatibilitu s legacy daty;
nové skóre používá jen `-2..+2`. Duplikovaná ve 3 souborech (codes
`SidePanel.tsx` + LEA `SidePanel.tsx` + penal `PenalSidePanel.tsx`); když se
přidá Firearm Act, půjde refaktorovat do `src/shared/quiz/SidePanel.tsx`.

Codes panel: dense grid `grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4`
chips s ID kódu. LEA panel: vertikální `<ul>` s `§ref` (`w-14`) + description.
Penal panel: generický (item: `{ id, label, sublabel?, hoverTitle }`):
scénky mají label=ref + sublabel=zkrácený prompt; recall má jen label=`§N` (sublabel
záměrně vynechán per uživatelova požadavku — jen čísla, ne názvy). Když chybí
sublabel, label dostává `flex-1` místo `w-14`. Každý řádek `data-testid="chip-<id>"`,
`data-score`, `data-done`.

## Analytika (Mixpanel)

`src/shared/analytics.ts` je tenký typed wrapper nad `mixpanel-browser`.
Init v `src/main.tsx` přes `initAnalytics()`, project token je hardcoded
konstanta (Mixpanel FE tokeny jsou public-by-design).

**Eventy** (per-event typed funkce, ne generický `trackEvent`):

| Funkce | Event name | Properties | Trigger |
|---|---|---|---|
| `trackCodeAnswered` | `code_answered` | `mode: 'write'\|'choose'`, `success`, `code_id` | ModeWrite/ModeChoose po vyhodnocení |
| `trackLawAnswered` | `law_answered` | `success` (= perfect), `question_id` | LeaQuizPage `handleSubmit` |
| `trackPenalAnswered` | `penal_answered` | `mode: 'scenario'\|'recall'`, `success`, `question_id` | PenalScenarioPage / PenalRecallPage `handleSubmit` |
| `trackPenalCompleted` | `penal_completed` | `mode: 'scenario'\|'recall'` | Mount completion screen po posledním correct submitu |
| `trackProgressReset` | `progress_reset` | `module: 'codes'\|'lea'\|'penal-scenario'\|'penal-recall'\|'geo-blind'\|'geo-name'` | ResetButton/LeaResetButton/PenalResetButton/GeoResetButton confirm |
| `trackCodesCompleted` | `codes_completed` | `scope: 'all'\|'partial'` | CongratsBanner mount |
| `trackQuestionSkipped` | `question_skipped` | `module: 'codes'\|'lea'\|'penal-scenario'\|'penal-recall'\|'geo-blind'\|'geo-name'`, `question_id` | handleSkip ve všech kvízových stránkách |
| `trackGeoAnswered` | `geo_answered` | `mode: 'blind'\|'name'`, `success`, `poi_id` | GeoBlindPage / GeoNamePage po vyhodnocení |
| `trackGeoCompleted` | `geo_completed` | `mode: 'blind'\|'name'` | Mount completion screen po posledním masteru |
| `trackPageview` | _(Mixpanel pageview)_ | `url` (origin + `#` + path) | AppLayout useEffect na route change |

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

## LEA UI flow

`LeaQuizPage` (`src/modules/laws/lea/components/LeaQuizPage.tsx`):

1. `useLeaProgress` poskytuje `{ progress, turn, recordSubmit, recordSkip, reset }`.
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
   používá `submit-footer--end` v obou fázích — vlevo „Přeskočit otázku"
   (`btn-secondary`, `data-testid="lea-skip"`), vpravo hlavní CTA
   ("Vyhodnotit otázku" v answering, "Další otázka" v revealed). Skip volá
   `handleSkip` (override score na +2, advance).
8. `LeaResetButton` (`flex justify-end` wrapper pod `<main>` v levém sloupci
   gridu) je dostupný v obou fázích. Confirm dialog s `role="alertdialog"`,
   testidy `lea-reset-button`/`lea-reset-confirm`/`lea-reset-cancel`/
   `lea-reset-confirm-yes`. Maže jen `lea` slice, codes zůstávají.
9. `useMediaQuery('(min-width: 1024px)')` switch mezi desktop SidePanel inline
   vs `LeaMobilePanel` (`<details>` se summary).

## Penal UI flow

`PenalLayout` (`src/modules/laws/penal/components/PenalLayout.tsx`) je parent
route s `<Outlet />`:

1. Header: h1 "Penal Code (002-19)" + popis + `NavLink` tabs (`Scénky`/`Recall`)
   se stejným stylem jako `CodesPage` (aktivní tab `bg-sasp-tan text-sasp-bg`,
   neaktivní `border border-sasp-navy-light`).
2. Index route (`/laws/penal`) renderuje `<PenalScenarioPage />` defaultně.
3. Tabs navigují na `/laws/penal/scenarios` a `/laws/penal/recall`.

`PenalScenarioPage` (mode A) — kopíruje LeaQuizPage strukturu:

1. `usePenalScenarioProgress` poskytuje `{ progress, turn, recordSubmit, recordSkip, reset }`
   nad `penal.scenarios` slice.
2. `current: PenalScenario | null` v `useState`. Picker v `useEffect` jen když
   `current === null && phase === 'answering'` (stejný pattern jako LEA, viz Gotcha 7).
3. `chips: AnsweredChip[]` ({ key, raw, parsed: ExpectedAnswer | null, duplicate }).
4. `handleCommit(raw)`: parse přes `matchScenarioAnswer`. Null parsed = wrong.
   Duplicate = key je už v `foundKeys` set.
5. Při submitu projde `chips` proti `current.expected[]`:
   - parsed null → wrong
   - parsed.key v expectedKeys + ne duplicate → correct
   - parsed.key NENÍ v expectedKeys → wrong („neaplikovatelný")
   - duplicate → duplicate
   - perfect = wrong=0 ∧ duplicate=0 ∧ correct=expected.length
6. Reveal přidá `missed` entries pro každý chybějící expected.
7. `educationalNote` z scénky se renderuje v reveal pod „Pozor:" boxem
   (testid `penal-scenario-note`), když ji scénka definuje.
8. SubmitFooter v `submit-footer--end` (default LEA pattern) NEBO když `leftSlot`
   je passed (Hard mode checkbox), přepne na `flex justify-between`.
9. PenalAnswerInput používá `suggestParagraphs` místo `suggestItems`. Suggestions
   pole `{ canonicalId, display, paragraphId, subId, title, description }`.
   Při kliknutí/Enteru se commit hodnota = `canonicalId`. `disableSuggestions`
   prop (= hard mode) blokuje generování suggestions.
10. Skip volá `recordSkip` + `trackQuestionSkipped({ module: 'penal-scenario' })`.

`PenalRecallPage` (mode B) — single-answer flow, jednodušší:

1. `usePenalRecallProgress` nad `penal.recall` slice.
2. Pool = `RECALL_PARAGRAPHS` (27 paragrafů). Picker přes `pickNextRecallParagraph`.
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
- 3 checkboxy `geo-filter-{street|landmark|pd}`. Mění `geo.settings.categoryFilter`
  přes `useGeoSettings` (sdílený hook). Filter platí pro oba módy.
- POI seznam — chips s 3-znakovou kategorií (ULI/LMK/PD), name, ✓ pro mastered.
- Mobile přes `<details>` v `GeoMobilePanel`.

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
   `schemaVersion: 3` s codes + lea + penal slices) a `localStorage["genk-pd:rng-seed"]`.
   Init script používá `sessionStorage` flag `genk-pd:seeded`, aby se
   **nepřeseedoval po reloadu** (jinak by persistence testy byly k ničemu).

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
   E2E používaly `pinNextLeaQuestion` (saturoval 16/17 otázek na +2), takže pool po
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

11. **`schemaVersion` v test seedech musí být `3` + `lea` + `penal` slice**.
    Hardcoded literály ve všech `*.test.tsx` které volají `saveState({...})` musí mít
    `schemaVersion: 3`, `lea: { progress: {}, turn: 0 }`, a
    `penal: { scenarios: { progress: {}, turn: 0 }, recall: { progress: {}, turn: 0 } }`.
    Pokud přidáš další slice, bumpni schema (v3 → v4) a doplň migrationi v `storage.ts`.

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
    150 %). Šest míst: codes `SidePanel.tsx`, codes `CodesPage.tsx` MobilePanel,
    LEA `SidePanel.tsx`, LEA `LeaQuizPage.tsx` LeaMobilePanel, penal
    `PenalSidePanel.tsx`, penal `PenalScenarioPage.tsx`/`PenalRecallPage.tsx`
    MobilePanel. Při bumpu range nezapomenout všech šest.

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

25. **Penal scénář IDs v E2E seed musí být sync s daty** — `e2e/fixtures/seed.ts`
    má hardcoded `PENAL_SCENARIO_IDS` (28) a `PENAL_PARAGRAPH_IDS` (75, hard-coded
    pro full catalog). Když přidáš novou scénku do `scenarios.ts` nebo paragraf do
    `paragraphs.ts`, **musíš rozšířit i hardcoded list v seed.ts**, jinak
    `pinNextPenalScenario` přestane saturovat 27/28 a picker pustí jiný target.

26. **PenalAnswerInput používá canonical ID jako match key, ne quote** — chip
    excludeKeys obsahuje `'25b'`, `'27'`, ne `paragraphId`. Pokud bys přesunul
    AnswerList přes shared a fillnul `meta = paragraphId` místo `display`, exclude
    by přestal fungovat. Drž canonical ID v `chip.parsed → canonicalId` mapování.

27. **PenalLayout je parent route s `<Outlet />`**, analogicky `CodesPage`.
    Index route (`/laws/penal`) defaultuje na `PenalScenarioPage`. Přepínání
    režimu jde přes `NavLink` tabs (`penal-tab-scenarios`, `penal-tab-recall`).
    Žádná redundantní rozcestníková stránka — proklik z `/laws` rovnou jede do
    režimu, na který tabs ukazují (default scénky).

28. **Hard mode toggle je per-session state** v `PenalScenarioPage`
    (`useState(false)`). Stav nepřežije refresh ani přepnutí tabu. Záměrně
    — nechtěl jsem komplikovat storage schema o UI preference. Pokud má persist,
    přidat do `penal.scenarios.settings.hardMode` a bumpnout schema.

29. **Schema je v5** — bumpnuto z v4 při rewrite geo POI datasetu (POI IDs
    úplně přepsané, stará progress garbage). **Všechny test seedy s hardcoded
    `saveState({...})` literálem musí mít `schemaVersion: 5` + `geo.settings.
    categoryFilter` se **všemi 6 kategoriemi**** (`street, landmark, pd, fire,
    ems, ammu` — všechny true defaultně). Stejně tak `e2e/fixtures/seed.ts`.
    Pokud přidáš další modul nebo zase přepíšeš POI dataset, bumpni v5 → v6
    a doplň migraci.

30. **Tile pipeline NEní v `npm run build`** — `scripts/generate-tiles.mjs` je
    jednorázový skript spouštěný ručně (`node scripts/generate-tiles.mjs`).
    Generuje 802 tiles do `public/tiles/{z}/{x}/{y}.jpg` (z=0..3, ~5.7 MB) +
    přepisuje `src/modules/geo/data/tileMeta.ts`. Output je commitnutý — pokud
    bys měnil source `docs/city-map.png` (5039×7463), spusť skript a commitni
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
    v normalizovaném 0..1 prostoru. Source PNG je portrait 5039×7463, takže
    1 jednotka v Y odpovídá menšímu počtu pixelů než v X. Pro práh 0.03 to
    znamená cca 151 zdrojových px v X vs 224 v Y. Pro MVP fine. Pokud bude
    bolet, vynásobit Y rozdílem (5039/7463 = 0.675) v hit-testu pro skutečně
    izotropní distanci.

33. **POI dataset je hardcoded TS literal** v `src/modules/geo/data/pois.ts`
    s normalizovanými coords (0..1) odhadnutými z `docs/city-map.png`. **Coords
    nejsou pixelově přesné** — odhady ±2 % vůči real GTA V positions. Pokud bys
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
    žijí na top-level routě. AppLayout nav má 4 odkazy (Codes/Laws/Geo/SASP),
    HomePage 4 karty. Při testování home navigace přes `getByRole('link',
    { name: 'Geografie', exact: true })` se shoduje na **navbar link**
    (jednoduchý text), ne na home kartu (link + h2 + p + span = složitý
    accessible name).

37. **KRITICKÉ: MG ukládá raw lat ale renderuje Web Mercator.** `mgLatLngToVec2`
    v `src/modules/geo/logic/transform.ts` MUSÍ aplikovat forward Mercator
    na latitude: `y_merc = log(tan(π/4 + lat·π/360))`. Bez toho je vztah
    `lat → image-y` logaritmický (ne lineární) a žádný affine fit nesedí
    (Δ 0.02-0.09 i s 9 anchory). S Mercator fitem sedí 6-param affine na
    6 kotvách s Δ ≤ 0.0005. Empiricky ověřeno: ratio Δour_y/Δlat se mění
    1.92× napříč mapou, ale Δour_y/Δy_merc je konstantní v 2 %. Longitude
    zůstává lineární (Mercator x = lng linearly), žádná projekce.

38. **6 POI kategorií, ne 3** — `POICategory = street | landmark | pd | fire |
    ems | ammu`. Test fixtures s `categoryFilter` literálem musí mít všech 6
    polí (jinak TS type error). Při přidávání nové kategorie: update types.ts
    + GeoCategoryFilter v storage.ts + initialState defaults + lenient read
    backfill + GeoSidePanel CATEGORY_LABEL/ABBR/ORDER + GeoBlindPage
    CATEGORY_LABEL + všechny test fixtures + e2e seed.

39. **Anchor kalibrace má 3 modely** v `transform.ts`:
    - `affine4` (4-param: translate + per-axis scale, žádná rotace) — min 2
    - `affine6` (6-param: + rotace + shear) — min 3 non-collinear
    - `tps` (Thin-Plate Spline, exaktní interpolace přes všechny kotvy +
      hladká interpolace mezi nimi) — min 3 non-collinear, Gauss elim v
      `solveLinearSystem` v `calibrate.ts`
    `fitBestAnchorTransform` auto-vybere: 2 anchors → affine4, 3+ → affine6.
    UI dropdown umožňuje vynutit konkrétní mode.

40. **Leave-one-out (LOO) residuals** v Anchor & import tab — pro každou
    kotvu: "kdybys vyhodil tuhle, fittnul z ostatních, kam by predikovala?"
    Vysoký LOO = outlier kotva (zlý klik nebo nekonzistentní s ostatními).
    Vyžaduje ≥4 anchorů (need 3 pro leave-one-out fit).

41. **`/geo/calibrate` Anchor & import defaultně nahraje 6 anchorů** z
    `anchorsCalibration.ts` při mountu — uživatel nemusí re-clickat po
    reloadu. "Reset na defaultní kotvy" vrátí těch 6. "Smazat všechny"
    vyprázdní seznam.

42. **POI s názvem rovným nějakému aliasu po normalize** = test fail
    (`alias collision with name`). Příklad: name "PDM" + alias "pdm" — oba
    normalizují na "pdm". Řešení: odebrat redundantní alias.

43. **Map Genie tiles jsou za hotlink-protection** — vrací 403 bez Referer
    z `gta-5-map.com`. Obejít přes spoofing = TOS violation, **nedělat**.
    Používáme jen jejich JSON data (inlined v HTML, public). Pokud bychom
    chtěli jejich kvalitnější satelitku, legitimní cesta = veřejný Rockstar
    Social Club atlas nebo CC-licensovaný community render + regenerovat
    `public/tiles/` z něj.

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

- **Firearm Act** modul (`/laws/firearm`): kopíruj strukturu `modules/laws/penal/`
  (která už ukazuje 2-režim pattern s tabs + parent layout), přidej do `LawsIndex`
  (změň `aria-disabled` na aktivní `<Link>`), přidej route. Zdroj: `docs/firearm-act.md`.
- **Sdílený "law quiz engine"**: až bude 3. modul (Firearm Act), refaktorovat
  AnswerList/AnswerRow/SidePanel ProgressHeader/SCORE_CLASS do `src/shared/quiz/`.
  Aktuálně AnswerList/AnswerRow se importují z LEA (penal je závislý na LEA),
  SidePanel je duplikovaný do 4 souborů (codes/lea/penal/geo). YAGNI dokud se to
  nezačne lišit nebo nezačne bolet při změnách.
- **Geo polygon regiony / čtvrti** (`/geo`): MVP nemá kategorii `district` —
  Vinewood, Del Perro atd. Pokud bude poptávka, přidat 7. kategorii
  `district` s `geometry: 'polygon'` (path: Vec2[] uzavřený kruh, hit-test
  point-in-polygon).
- **Geo tile zoom z=4** (native pixel sharpness): aktuálně cap z=3, max zoom
  ~5x downscaled. Bumpe `MAX_ZOOM` v `scripts/generate-tiles.mjs` na 4 přidá
  ~600 tiles (~25 MB). Smysl pokud user reportuje rozmazaný max zoom.
- **Geo Hard mode persistence** (`geo.settings.hardMode`) — analog Penal Hard
  mode persistence. Stejný argument: bumpni schema až bude poptávka.
- **Geo POI dolaďení v Drag&drop** — současný dataset má 34 MG-přesných POI
  (Δ ≤ 0.0005) ale **20 ulic a 9 MANUAL landmarků** je eyeballnuto. Když user
  zaregistruje konkrétní špatnou pozici, otevřít `/geo/calibrate` → Drag&drop,
  drag-tune, export TS → paste do `pois.ts`. Ulice (polyline) mají per-node
  draggable handles.
- **SASP příručka** (`/sasp`) — zatím `<ComingSoonPage>`, `docs/sasp-manual.md`
  je v `.gitignore` (důvěrný zdroj).
- **Penal scénky další** — některé reálné situace (korupce §53, vraždy §12,
  obchod s lidmi §13) nejsou pokryté. Pool nejsou edukačně critical, ale dají
  se přidat. Při každé nové scénce se automaticky rozšíří i `RECALL_PARAGRAPHS`.
- **False-negative aliasy** v LEA / Penal — pokud user narazí na často chybějící
  parafráze, rozšířit alias seznam v `questions.ts` / `paragraphs.ts` ručně.
  Pozor na strict legal correctness (některé parafráze posunou právní význam,
  viz Gotcha o LEA §15 5a; v Penal podobně §50 ≠ §51 přes „drogy").
- **Persist Hard mode** v Penal scenarios (Gotcha 28) — pokud se uživatel ozve.
