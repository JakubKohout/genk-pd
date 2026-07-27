# CLAUDE.md

Working memory for future sessions. Brief and to the point.

## What this is

Educational web application for the PD (Police Department) on the `genk.cz` server.
Currently functional modules:

> **State after the refactor (branch `quiz-refactor`):** The LEA, Penal scenarios and old
> SASP handbook modules are merged into the unified module **Teorie** (`src/modules/law/`,
> route `/law`, nav link "Teorie") as **a single data file** `law/data/questions.ts`
> (137 questions) — no adapters, no `src/modules/laws/` (the whole tree was deleted).
> Old routes `/laws/*` and `/sasp` redirect to `/law`. **Penal Recall was removed** —
> `/penal/recall` (and legacy `/laws/penal/recall`) redirects to `/law`, Penal scenarios
> live only as questions with theme `scenky` (`kind:'enumeration'`, `matcher:'paragraph'`)
> in Teorie. `law/data/paragraphs.ts` remains as a reference catalog (`PENAL_PARAGRAPHS`,
> 75 paragraphs) for the paragraph matcher and autocomplete. **The question model is flat** —
> no `source` field, no `LAW_SOURCES`/`sourceFilter`; the only filter is the 10 themes
> (`LAW_THEME_KEYS`, `scenky` = former Penal scenarios). A question ID is an opaque key
> (legacy questions keep their historical shapes `lea.*`/`penal.*`/`sasp.*`, new ones are
> generated as `q<n>` from the review markdown). Schema is v10 (without `law.settings.sourceFilter`).

1. **Ten-codes** (`/codes`) — two modes: writing the code (`/codes/write`),
   choosing the meaning (`/codes/choose`).
2. **Teorie** (`/law`) — unified quiz: LEA (paragraph enumeration) + Penal scenarios
   (paragraph matcher, theme `scenky`) + native SASP content. One dataset `LAW_QUESTIONS`
   (`law/data/questions.ts`, 137 questions, no adapters, no `source` field),
   single-level filter (10 themes). 4 formats by `kind`:
   - `choice` — multi-select MC (≥5 options, ≥1 correct), options are shuffled, keys 1–N.
   - `text` — free-text recall with autocomplete + Hard mode.
   - `enumeration` — listing (LEA paragraphs or Penal paragraph matcher), ordered optionally.
   - `match` — click-pairing (left column ↔ right column).
   SASP questions are anti-leak exam-prep (must not reuse specific wording
   from the real test). Penal Recall (standalone „Co je §X?" mode) was removed —
   paragraph recall is not practiced standalone, only as part of scenarios.
3. **Geography** (`/geo`) — interactive map of Los Santos and Blaine County
   (Leaflet + CRS.Simple + tile pyramid 0..3 over `clean-map.jpg` 8192×12288),
   2 game modes + internal position editor:
   - **Blind map** (`/geo/blind`, default index) — the user gets a prompt
     „Klikni na X — popis" and clicks on the map. Binary hit-test with a **threshold by
     POI size** (field `size`, 5 tiers tiny/small/medium/large/huge →
     0.01/0.0167/0.0233/0.0367/0.06 normalized units; default medium
     when `size` is missing). Large areas (airport, docks, cities) = huge, pinpoint
     buildings = small. Point POI: euclidean distance. Polyline POI (streets):
     minimum perpendicular distance of a segment (fixed 0.015).
   - **What is here** (`/geo/name`) — a pulsing marker on the map without a label,
     the user types the name. Free-text + autocomplete (LEA pattern) +
     Hard mode toggle (Penal pattern).
   - **Position editor** (`/geo/calibrate`) — internal Drag&drop editor:
     markers and polyline nodes are draggable, exports a TS literal for pasting back
     into `pois.ts` / `streets.generated.ts`.
   Mastered POIs remain as faded markers / polylines with a name on the map → the map
   gradually „unlocks". A shared `categoryFilter` (4 categories:
   street=Ulice / highway=Dálnice / city=Body ve městě / state=Body ve státě)
   in `geo.settings`. Per-mode progress (blind/name are independent slices).
   **68 POI dataset**
   (`pois.ts` + `streets.generated.ts`): 37 city + 11 state + 11 street +
   9 highway. ID prefix == category (`city.lsia`, `state.paleto-bay`,
   `street.vespucci-blvd`, `highway.del-perro-fwy`). Positions visually verified
   against the art (Gotcha 40), streets hand-traced.

Geography is a standalone top-level module. Nav has 3 items: Codes / Teorie / Geo.

Pure-frontend, no backend. All state in `localStorage` (key `genk-pd:v1`,
schemaVersion 10).

## Stack

- Vite 6 + React 18 + TypeScript 5.6
- Tailwind CSS 3.4 (SASP palette in `tailwind.config.js`: `sasp-bg`, `sasp-navy`,
  `sasp-navy-light`, `sasp-tan`, `sasp-gold`, `sasp-red`, `sasp-ink`, `sasp-ink-dim`)
- React Router 6 (`createHashRouter` — beware, not Browser router; URL uses
  `#/law`, `#/geo/blind` format)
- Vitest 2 (unit + component, jsdom)
- Playwright 1 (E2E, chromium-desktop + chromium-mobile)
- Mixpanel browser 2.78 (analytics, frontend-only, EU-resident)
- Leaflet 1.9 + react-leaflet 4.2 (geo module, CRS.Simple custom-tiled map)
- Sharp 0.34 (devDep, tile generation pipeline for the geo module)

## Commands

```
npm run dev        # vite dev server
npm run build      # tsc -b && vite build
npm run preview    # serve built dist on :4173
npm test           # vitest run (unit + component)
npm run test:e2e   # playwright (starts its own dev server)
npm run test:all   # everything
npm run questions:export   # dataset -> docs/questions-review.md (review for a non-technical reviewer)
npm run questions:import   # docs/questions-review.md (or argv path) -> questions.ts + seed.ts + counts
```

`npm run test:all` must be green: **407 unit/component + 60 E2E = 467 tests**.
No manual verification — if I break something, I fix it and run the tests.

The tile pipeline (geo module) does NOT run in `npm run build` — it is a one-time script
`node scripts/generate-tiles.mjs` after swapping the source map. The output `public/tiles/`
is committed.

If you were to regenerate `docs/clean-map.jpg` from Rockstar minimaps again:
`pip install pillow texture2ddecoder && python3 scripts/extract-minimap.py`,
then `node scripts/generate-tiles.mjs`. `docs/map-original/` (source `.ytd`)
is in `.gitignore` — the user extracts them from `scaleform_generic.rpf` via OpenIV.

Street centerlines (geo module) are hand-traced from the art directly in
`src/modules/geo/data/streets.generated.ts` — no generator exists
(historical YND/Foxxite pipelines were deleted; see git history if they were
needed as a reference). Retuning via `/geo/calibrate` Drag&Drop or the
debug overlay (`D` in `/geo/blind`).

## Directory structure

```
src/
  app/                              # Shell: AppLayout, HomePage, ComingSoonPage, routes.tsx
  modules/
    codes/                          # Ten-codes module
      data/codes.ts                 # Static data of 10-X codes (from docs/codes.md)
      state/
        useCodeProgress.ts          # Score/turn (useSyncExternalStore over storage.ts)
        useSettings.ts              # Importance filter
        selection.ts                # pickNextCode (delegates to shared/quiz/pickNextFromPool)
        distractors.ts              # buildOptions for mode 2
      components/                   # CodesPage, ModeWrite, ModeChoose, SidePanel,
                                    # ImportanceFilter, ResetButton, CongratsBanner
    geo/                            # Geography module (interactive map + 2 sub-modes + position editor)
      data/
        types.ts                    # POIBase, POIPoint, POIPolyline, POI union,
                                    # POICategory: 4 values (street/highway/city/state),
                                    # POISize: 5 tiers (tiny..huge) — optional field `size`
        pois.ts                     # POIS — 68 POI: 37 city + 11 state (point) + 20 street/highway
                                    # (from streets.generated.ts). Point: positions visually verified
                                    # against the art (Gotcha 40), each has a `size` tier for
                                    # click tolerance (Gotcha 42).
                                    # Streets: concat from streets.generated.ts.
        streets.generated.ts        # HAND-TRACED from the art (not generated despite the name) —
                                    # 20 street polyline centerlines per the labels in the art
                                    # (Gotcha 41)
        tileMeta.ts                 # TILE_META — auto-generated by the generate-tiles.mjs script
        pois.test.ts                # Validation (count, unique IDs, alias non-collision,
                                    # canonical id prefix per category, geometry consistency)
      logic/
        coords.ts                   # toLatLng / fromLatLng helpers (CRS.Simple [y,x])
        hitTest.ts                  # evaluateClick: point (euclid threshold by
                                    # POI size, SIZE_THRESHOLDS 5 tiers, default
                                    # medium 0.0233), polyline
                                    # (perpendicular distance ≤ 0.015).
                                    # hitTest.streets.test.ts: 12 real-coordinate fixtures
                                    # verified against the satellite art
        match.ts                    # matchPoi — strict equality after normalize, name + aliases
        suggest.ts                  # suggestPois — substring autocomplete, min 2, max 5
        calibrate.ts                # polylineCentroid (arc-length midpoint) + formatPoisTs
                                    # (TS literal for pasting into pois.ts) + toleranceRing
                                    # (tolerance ring of the selected POI, ellipse in px) — DragDropTab only
      state/
        selection.ts                # pickNextPoi(state, pois, filter) via pickNextFromPool,
                                    # eligiblePois, isGeoComplete
        useGeoProgress.ts           # Generic hook useGeoSliceProgress('blind'|'name') →
                                    # 2 public: useGeoBlindProgress, useGeoNameProgress
        useGeoSettings.ts           # Category filter (4 categories), persists
      components/                   # GeoLayout (tabs + Outlet), GeoBlindPage (mode 1),
                                    # GeoNamePage (mode 2), GeoMap (Leaflet wrapper +
                                    # MapClickCapture), GeoMarker, GeoPolyline, GeoSidePanel,
                                    # GeoMobilePanel (<details>), GeoAnswerInput, GeoResetButton,
                                    # GeoCalibratePage (renders DragDropTab), GeoDebugOverlay
        calibrate/                  # · DragDropTab — POI markers draggable, polyline nodes
                                    #   draggable, exports TS via formatPoisTs. The selected point
                                    #   POI gets a tolerance ring (toleranceRing → Polygon,
                                    #   non-interactive, ellipse due to the portrait map)
    law/                            # Unified Teorie module (route /law, nav "Teorie")
      data/
        types.ts                    # LawQuestion = discriminated union (LawChoice/LawText/
                                    # LawEnumeration/LawMatch via `kind`); LawExpected;
                                    # LawBase carries optional `title` (short caption for a chip,
                                    # fallback to the prompt) — authored directly in the literal
                                    # (anti-leak, leaks neither answer nor paragraph). No `source`
                                    # field — questions are flat, the only dimension is `theme`.
                                    # LAW_THEMES (10 themes: pojmy/hodnosti/jednani/rto/vybava/
                                    # zasah/zadrzeni/kriminalistika/paragrafy/scenky)
        questions.ts                 # LAW_QUESTIONS — the single source of truth, 137 questions as
                                    # one TS literal (17 with theme paragrafy (LEA) + 28 with
                                    # scenky (former Penal scenarios) + 92 with the remaining themes (SASP)),
                                    # no adapters/merging at runtime. The ID is an opaque key —
                                    # existing questions keep the legacy shape (`lea.7`,
                                    # `penal.scenario.A1`, `sasp.choice.pojmy.1`), new ones are
                                    # generated as `q<n>` (review markdown, see Gotcha 43)
        questions.test.ts            # Validation: single count (137), unique IDs, valid
                                    # theme, title ≤40 chars, per-kind invariants (choice
                                    # options, text alias non-collision, enumeration matcher
                                    # + paragraph-key resolve, match pairs)
        paragraphs.ts                # PENAL_PARAGRAPHS — reference catalog, 75 paragraphs
                                    # (§1–§77, §100–§102) + types PenalCategory/
                                    # PenalSubParagraph/PenalParagraph. Used only for
                                    # the paragraph matcher/autocomplete (enumeration questions),
                                    # it is not a source of questions.
        paragraphs.test.ts           # Catalog validation (unique IDs, subs, aliases)
      logic/
        matchChoice.ts              # matchChoice — comparison of chosen indices vs correctIndices
        matchText.ts                # matchText — strict equality after normalize
        matchEnumeration.ts         # matchEnumeration — alias or paragraph matching by
                                    # `matcher` on the question (delegates to canonicalAnswerId for paragraph)
        checkMatch.ts               # checkMatch — evaluation of match pairs by clicking
        suggest.ts                  # suggestText / suggestEnumeration — substring autocomplete
        canonicalAnswerId.ts        # '§25 b' / '25B' / '25b' → '25b' (null if unparseable)
        suggestParagraph.ts         # Autocomplete (ID prefix or name substring via
                                    # PENAL_PARAGRAPHS), expands a paragraph into all
                                    # sub-variants (used by EnumerationInput)
        *.test.ts                   # Tests for each logic file
      state/
        useLawProgress.ts           # useLawQuizProgress over the `law` slice (delta ±2)
        useLawSettings.ts           # themeFilter (10 themes), persists
        selection.ts                # pickNextQuestion / isLawComplete (filtering +
                                    # score<2 via pickNextFromPool) over LAW_QUESTIONS
        selection.test.ts           # Selection tests
      components/                   # LawPage (single page, branches render by current.kind),
                                    # LawSidePanel (theme filter, chips → onSelect),
                                    # LawMobilePanel (<details>), LawResetButton,
                                    # ChoiceInput, TextInput, EnumerationInput, MatchInput,
                                    # ScenarioBox (for enumeration with a scenario field),
                                    # AnswerList/AnswerRow (shared visual primitives for
                                    # enumeration chips — correct/duplicate/wrong/missed)
                                    # LawPage.test.tsx, LawSidePanel.test.tsx, *Input.test.tsx
      review/                        # Review round-trip for a non-technical reviewer (md v2):
                                    # serializeQuestions (LAW_QUESTIONS → markdown with a legend,
                                    # English codes `type`/`theme`/`ref`/`ordered` + sub-lines
                                    # `aliases`/`keywords`/`key`/`sub`), parseQuestionsMd
                                    # (markdown → { questions, deletedIds }, Czech errors
                                    # with a line number; section `### Titulek \`NEW\`` = new question,
                                    # the ID is generated by the import as `q<n>`), formatQuestionsTs
                                    # (questions → canonical TS literal for questions.ts).
                                    # roundtrip.test.ts verifies losslessness of export→import.
                                    # Called from scripts/questions-export.ts / questions-import.ts.
  shared/
    storage.ts                      # Versioned localStorage wrapper, schemaVersion 10,
                                    # single lenient terminal normalizeToV10 for all
                                    # historical payloads (v1–v10; no chained chain)
    rng.ts                          # Pluggable RNG (mulberry32, seed via localStorage)
    useMediaQuery.ts                # SSR-safe matchMedia hook
    text/normalize.ts               # NFD strip diacritics + lowercase + whitespace collapse
    quiz/pickNextFromPool.ts        # Generic weighted-random + cooldown picker
    ui/BadgeIcon.tsx                # SVG star with "PD"
    analytics.ts                    # Mixpanel wrapper (init + typed track* fns,
                                    # no-op before initAnalytics, mocked in tests,
                                    # disabled in E2E via the window.__GENK_E2E__ flag)
  styles/index.css                  # Tailwind directives + .card / .btn-* / .chip
                                    # (codes only) / .answer-input* / .answer-list*
                                    # /.answer-row* (4 states: correct/duplicate/wrong/
                                    # missed) / .reveal-perfect / .submit-footer*
                                    # /.autocomplete-* / .lea-page
                                    # /.geo-page / .geo-map-shell / .geo-prompt*
                                    # /.geo-feedback* / .geo-marker* (DivIcon styles)
  test/setup.ts                     # Vitest setup: jsdom, jest-dom, storage cache reset,
                                    # window.matchMedia stub (jsdom lacks it)

scripts/
  generate-tiles.mjs                # Tile generator: docs/clean-map.jpg → public/tiles/{z}/{x}/{y}.jpg
                                    # + tileMeta.ts. Run manually (`node scripts/...`)
  extract-minimap.py                # Stitch Rockstar minimap .ytd textures (docs/map-original/,
                                    # gitignored) → docs/clean-map.jpg (8192×12288)
  questions-export.ts               # LAW_QUESTIONS → docs/questions-review.md (gitignored)
                                    # via serializeQuestions. `npm run questions:export`
  questions-import.ts               # docs/questions-review.md (or argv path) → questions.ts
                                    # (formatQuestionsTs) + LAW_QUESTION_IDS in e2e/fixtures/seed.ts
                                    # + counts in questions.test.ts. `npm run questions:import`

public/
  tiles/                            # Generated Leaflet CRS.Simple tiles, z=0..3,
                                    # 802 JPEG files, ~5.7 MB

docs/poi-mapping.md                 # Mapping of the user's POI list → CZ names
                                    # + aliases. Cheat sheet, the app does NOT read it. Serves as a
                                    # human reference for generating pois.ts.

e2e/
  fixtures/seed.ts                  # `seed(page, { codes-flat-fields, geo?, law?, randomSeed? })`
                                    # Writes schemaVersion 10, exports GEO_POI_IDS,
                                    # LAW_QUESTION_IDS (single array, 137 IDs, regenerated by
                                    # npm run questions:import), pinNext{Question, GeoPoi, LawQuestion}
  codes/*.spec.ts                   # 8 spec files, 23 tests
  law/*.spec.ts                     # 4 spec files (quiz-flow 12, filter 5, redirects 6,
                                    # persistence 2), 25 tests
  geo/*.spec.ts                     # 3 spec files (blind-flow, name-flow, persistence),
                                    # 12 tests
```

New content into Teorie → two paths, both resulting in the same `LAW_QUESTIONS` literal:
1. **Directly in TS**: add a `LawQuestion` literal to the array in `src/modules/law/data/questions.ts`
   (make up the ID, the existing convention `source.whatever` is only a legacy habit, not an enforced format).
2. **Via review markdown**: `npm run questions:export`, add a section `### Titulek \`NEW\``
   into `docs/questions-review.md` (see Review workflow below), `npm run questions:import` —
   the ID `q<n>` is generated by the import itself.
Validation in `questions.test.ts`. Shared utilities (`normalize`, `pickNextFromPool`) are
generic. Don't forget to extend the E2E seed `LAW_QUESTION_IDS` (Gotcha 43) — for the path via
review markdown `npm run questions:import` does it itself. `LawPage.test.tsx` derives saturation
from the imported `LAW_QUESTIONS` automatically. A new theme (beyond the existing 10)
requires extending `LAW_THEME_KEYS` in `storage.ts` and bumping the schema (v10 → v11) +
migration; new content in an existing theme needs no schema bump.

Review workflow for a non-technical reviewer (md v2): `npm run questions:export`
generates `docs/questions-review.md` (gitignored, full serialization of the dataset with a legend;
meta line `- type: … | theme: … | ref: … | ordered: true` with English codes, item sub-lines
`aliases:`/`keywords:`/`key:`/`sub:`); the reviewer edits texts / correctness checkboxes
/ writes `SMAZAT` into a question's section / adds a new question as `### Titulek
\`NEW\``; `npm run questions:import <path>` parses the markdown (Czech errors with a line
number, `NEW` sections get a generated ID `q<n>`) and regenerates `questions.ts` +
the single array `LAW_QUESTION_IDS` in `e2e/fixtures/seed.ts` + the count in `questions.test.ts`
(Gotcha 43 mechanically). Losslessness is guarded by the round-trip test in `src/modules/law/review/`.

Firearm Act (future): no new "source" — the model is flat. Either place questions
into an existing theme (e.g. `paragrafy`), or add a new theme (extend
`LAW_THEME_KEYS`, bump schema v10 → v11 + migration). Questions directly into
`law/data/questions.ts` or via review markdown `NEW` (no adapter). The old pattern
"a new `modules/laws/firearm/` with its own route" is obsolete — everything goes into the unified
`/law` pool.

## Data model

```ts
// localStorage["genk-pd:v1"]
{
  schemaVersion: 10,
  codes: {
    progress: { [codeId]: { score: -2..+2, lastAskedAtTurn: number } },
    turn: number,
    settings: {
      importanceFilter: { mandatory: bool, rare: bool, unnecessary: bool }
    }
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
  law: {                             // unified Teorie quiz (LEA + Penal scenarios + SASP), flat questions
    progress: { [questionId]: ProgressEntry },
    turn: number,
    settings: {
      themeFilter: {
        pojmy: bool, hodnosti: bool, jednani: bool, rto: bool, vybava: bool,
        zasah: bool, zadrzeni: bool, kriminalistika: bool, paragrafy: bool, scenky: bool
      }
    }
  }
}
```

**Migration = a single lenient terminal `normalizeToV10(s)`** (`src/shared/storage.ts`):
no chained chain of migration functions — any historical payload (v1–v10) is
normalized on read by one function. Additive history (`lea.progress`,
`penal.scenarios.progress`, `sasp.test/recall/quiz.progress`) is spread-merged
into `law.progress` (law wins per-key; `law.turn` = its own value, otherwise the sum
of legacy turns); removed slices (`lea`, `sasp`, `penal`) and `law.settings.sourceFilter`
disappear simply by not being copied. Version history: v1 codes only, v2 +lea,
v3 +penal, v4 +geo, v5 +sasp, v6 sasp merge, v7 +law, v8/v9 removal of legacy
slices, v10 without sourceFilter + theme `scenky`. NOTE: only v1–v4 (main) and v10
were actually deployed — v5–v9 existed only in development, therefore they have no
dedicated migration code, only spreads in the terminal. `saveState` always writes v10.

**Lenient v10 read** (`normalizeToV10`): if the payload is missing `geo`/`law` or a
sub-slice, we compute empty defaults. `themeFilter`/`categoryFilter` backfills
missing keys from initialState (each true) — this includes computing the missing
`scenky` key when reading an older v9 payload. Input shapes of all versions are covered by
`storage.test.ts` (v1/v2/v3/v4/v5/v6/v7/v8/v9 payloads as fixtures).

`STORAGE_KEY = 'genk-pd:v1'` does NOT change on a schema bump — only the JSON value inside.
"v1" in the key is legacy; versioning lives in the `schemaVersion` field.

### Codes scoring

Default `importanceFilter` (fresh state / backfill of missing keys in `normalizeToV10`)
= **only `mandatory`**; `rare` and `unnecessary` are opt-in via the checkboxes.
Users with an already persisted filter keep their own values.

Score `-2..+2`, shared between both modes. Delta ±1 per answer. A code at `+2` drops out
of the pool. Empty pool → `<CongratsBanner />`. Reset clears `progress` and `turn`,
**preserves** settings.

**Skip** (`recordSkip(codeId)`): sets score = MAX (`+2`) absolutely, bumps the
turn, the code immediately drops out of the pool. Button `data-testid="codes-skip"`,
text „Přeskočit otázku", style `btn-secondary`. Available in ModeWrite and ModeChoose,
in both phases (before answering and in the feedback block — in the latter case it overrides
the score set by `recordAnswer`).

### Law (Teorie) scoring

Score `-2..+2` per question in a single `law` slice. Delta **±2** (NOT ±1 like codes).
Mastered at `+2` (= 1 correct answer from 0). `recordSubmit({ perfect: bool })` changes the score.
Reset clears only the `law` slice, codes remain. Reset is exposed via `LawResetButton`
(confirm dialog, testid `law-reset-*`).

**Skip** (`recordSkip(questionId)`): score=MAX (+2) absolutely, override. Testid `law-skip`.

### Codes data

Codes with A/B variants from `docs/codes.md` (`10-14 A/B`, `10-99 A/B`) are in `CODES`
**merged** into a single record. Higher importance wins (`mandatory > rare > unnecessary`).
Source of truth = `docs/codes.md`, parsed **manually** into a TS literal, not at runtime.

### Geo scoring

Score `-2..+2` per POI, **per mode** (blind / name are independent slices).
Delta ±2. Mastered at `+2`. Reset clears only the given mode,
the other remains. `categoryFilter` in `geo.settings` (shared between modes) affects
what is in the pool — a disabled category is never asked. A POI mastered in a given mode
remains as a faded marker (point) / polyline (street) on the map with a name in the Tooltip
→ „the map gradually unlocks".

**Skip** same semantics as Codes / LEA — score=MAX (+2) absolutely, override.
Buttons `data-testid="geo-blind-skip"` / `data-testid="geo-name-skip"`.

### SASP data (in the Teorie module)

Native SASP content is 92 questions directly in `src/modules/law/data/questions.ts`
(no `source` field — distinguished only by theme; they are questions with themes other than
`paragrafy` and `scenky`, part of the same `LAW_QUESTIONS` literal as LEA and Penal scenarios):
85 choice (≥5 options, ≥1 correctIndex — including a radio translation converted
from the original text format), 1 text (with aliases), 2 enumeration, 4 match (pairs).
Validation in `questions.test.ts` (single overall count, unique IDs, options ≥5,
alias non-collision, theme enum, match pairs). Anti-leak: must NOT reuse specific
wording from the real test.

Distractors went through a review (batches A–D): rules = plausible, believable confusions
(no absurdities or obviously wrong options), and multi-correct where the manual
gives a multi-part rule and 2–3 options are independently correct (≥15 questions). Never
mark an option correct if the manual doesn't support it — a wrong multi-correct
set is the worst defect (the UI requires selecting ALL correct ones).

ID prefix (legacy habit, not tested as an enforced format): `sasp.<kind>.<theme>.<n>`.
9 themes other than `scenky` (pojmy/hodnosti/jednani/rto/vybava/zasah/zadrzeni/kriminalistika/
paragrafy). Source of raw material: `docs/sasp-manual.md` (gitignored/confidential).


## Algorithms

### Codes

**`pickNextCode(state, allCodes)`** (`src/modules/codes/state/selection.ts`)
delegates to `pickNextFromPool` from `@/shared/quiz/pickNextFromPool`. Before that it
filters codes via `eligibleCodes` (importance filter + score < 2).

**`buildOptions(correct, allCodes)`** (`src/modules/codes/state/distractors.ts`):
1 correct + 2 from the same decade (`10-40..10-49` for `10-44`) + 2 random. Distractors
**ignore the importance filter** (drawn from the whole `CODES` set). When the decade is poor
(<2 other codes), it falls back to the nearest by `|Δnumber|`.

**Keys in ModeChoose**: `1`–`5` selects an answer. The listener hangs on `window` only during
the active question (effect with deps `[current, choice, options, recordAnswer]`), ignores
modifiers and `INPUT/TEXTAREA/contenteditable` targets.

### Shared

**`pickNextFromPool<T extends { id: string }>(pool, progress, turn): T | null`**
(`src/shared/quiz/pickNextFromPool.ts`):
1. Eligible = `pool` (the caller already filtered). When empty → null.
2. Cooldown: `turn - lastAskedAtTurn >= 2`. When the cooldown would empty the pool, it is dropped.
3. Weighted selection: `weight = 3 - score` (from `-2` weight 5, from `+1` weight 2). Uses
   `weightedRandom` from `@/shared/rng`.

**`normalize(s: string)`** (`src/shared/text/normalize.ts`): `lowercase` + `NFD` decompose
+ strip combining marks `[̀-ͯ]` + `\s+ → ' '` + trim. Pure function, shared
by all matchers.

### Law (Teorie) logic

**`matchText`** (`src/modules/law/logic/matchText.ts`): strict full-string equality after
`normalize`. **`suggestText`** (`suggest.ts`): substring autocomplete, min 2, max 5.
**`matchEnumeration`** (`matchEnumeration.ts`, fn `matchEnumerationEntry`): delegates to
alias matching (LEA) or paragraph matching (Penal) by the `matcher` field on the question.
Uses `suggestParagraphs` from `law/logic/suggestParagraph.ts` for paragraph autocomplete.
**Keyword matching** (alias matcher): besides exact match of `label`/`aliases` (after `normalize`),
for LEA `expected[].keywords` can list stems — each keyword is a sequence of stem-tokens
(min 3 chars) that must form a contiguous prefix-run in the input (`keywordMatches`: each
input token must `startsWith` the corresponding keyword stem). Priority: exact `label`/`alias`
> keyword. Collision validation in `questions.test.ts` (a keyword must not match another `expected`
of the same question). Lets you accept paraphrases without listing every form.
**`matchChoice`** (`matchChoice.ts`): comparison of the chosen indices vs `correctIndices[]`
(multi-select — the whole set must match). The indices refer to the ORIGINAL order of options,
not the displayed (shuffled) order.
**`checkMatch`** (`checkMatch.ts`): evaluation of match pairs after clicking.
**`pickNextQuestion(state, settings, all)`** = `pickNextFromPool(eligibleQuestions(...), ...)`,
where `eligibleQuestions` filters score < 2 + theme filter.

**`AnswerRow`/`AnswerList`** (`src/modules/law/components/`) are shared visual
primitives for enumeration chips (correct/duplicate/wrong/missed). Enter algorithm
in `EnumerationInput`: matchAnswer first → commit a direct hit, otherwise fill from the highlight
if there is a suggestion, otherwise commit raw. Arrows ↑↓ change the highlight, Tab fills, Esc closes.

### Penal Code (scenarios in Teorie)

**Scenarios (Teorie/enumeration format):** questions with theme `scenky` in `LAW_QUESTIONS`
have `kind:'enumeration'`, `matcher:'paragraph'`, `expected: LawExpected[]` — authored
directly in `questions.ts`, no adapter from a separate scenario dataset.
`EnumerationInput` (Teorie) evaluates chips via `matchEnumeration` → `canonicalAnswerId`
+ paragraph lookup (`PENAL_PARAGRAPHS` in `law/data/paragraphs.ts`) + sub validation.
Strict — no partial credit (Gotcha 23).

**`canonicalAnswerId(input): string | null`** normalizes inputs `'§25 b'`,
`'25B'`, `'25b'`, `'§25'`, `'27'` → `'25b'` / `'25'` / `'27'`. Strip `§`,
lowercase, collapse whitespace, regex `^(\d+)([a-e]?)$`. Null for unparseable.

**`suggestParagraphs(input, paragraphs, excludeKeys): ParagraphSuggestion[]`**
(`law/logic/suggestParagraph.ts`):
1. Numeric prefix (`25`, `25b`): expands the paragraph into all sub-variants.
2. Text substring: substring over title + aliases after normalize.
`excludeKeys` (Set of canonical IDs `'25b'`, `'27'`) hides already committed chips.
Min length 1, max 8 results. Used by `EnumerationInput` via `matchEnumeration`.

### Progress bar (all modules)

`pct = Σ min(2, max(0, score(c))) / (2·N)` over filtered items. Negative
score is clamped to 0 only for the UI; legacy values `score > 2` (from the original
range `-3..+3`) are also clamped to 2, so pct never exceeds 100 %.
Storage now keeps `-2..+2`, selection filters `score < 2`.

- **Codes desktop SidePanel**: testid `progress-percent`
- **Codes mobile summary**: testid `mobile-progress-percent`
- **Law (Teorie) desktop SidePanel**: testid `law-progress-percent`
- **Law (Teorie) mobile summary**: testid `law-mobile-progress-percent`
- **Geo Blind desktop**: testid `geo-blind-progress-percent`
- **Geo Blind mobile**: testid `geo-blind-mobile-progress-percent`
- **Geo Name desktop**: testid `geo-name-progress-percent`
- **Geo Name mobile**: testid `geo-name-mobile-progress-percent`

`isComplete` ⟺ all filtered items at +2.

### SidePanel layout (codes / law)

All side panels share a visual language: `card flex flex-col gap-3 p-4` wrapper +
`ProgressHeader` (uppercase tracking-wider "Splněno" on the left, percent on the right, bar
below) + score-based background color per the same `SCORE_CLASS` map (`-3..+3`).
The map stays with the `-3..+3` range for backward compatibility with legacy data;
new scores use only `-2..+2`. Duplicated in `codes/SidePanel.tsx`,
`law/LawSidePanel.tsx`; once there is a 3rd module, it can be refactored into
`src/shared/quiz/SidePanel.tsx`.

Codes panel: dense grid `grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4`
of chips with the code ID. Law panel: theme filter + chips with the title, clickable (switches
the question). Each row `data-testid="chip-<id>"`, `data-score`, `data-done`.

## Analytics (Mixpanel)

`src/shared/analytics.ts` is a thin typed wrapper over `mixpanel-browser`.
Init in `src/main.tsx` via `initAnalytics()`, the project token is a hardcoded
constant (Mixpanel FE tokens are public-by-design).

**Events** (per-event typed functions, not a generic `trackEvent`):

| Function | Event name | Properties | Trigger |
|---|---|---|---|
| `trackCodeAnswered` | `code_answered` | `mode: 'write'\|'choose'`, `success`, `code_id` | ModeWrite/ModeChoose after evaluation |
| `trackLawAnswered` | `law_answered` | `kind: 'choice'\|'text'\|'enumeration'\|'match'`, `success`, `question_id` | LawPage `handleSubmit` |
| `trackProgressReset` | `progress_reset` | `module: 'codes'\|'law'\|'geo-blind'\|'geo-name'` | ResetButton/LawResetButton/GeoResetButton confirm |
| `trackCodesCompleted` | `codes_completed` | `scope: 'all'\|'partial'` | CongratsBanner mount |
| `trackQuestionSkipped` | `question_skipped` | `module: 'codes'\|'law'\|'geo-blind'\|'geo-name'`, `question_id` | handleSkip in all quiz pages |
| `trackGeoAnswered` | `geo_answered` | `mode: 'blind'\|'name'`, `success`, `poi_id` | GeoBlindPage / GeoNamePage after evaluation |
| `trackGeoCompleted` | `geo_completed` | `mode: 'blind'\|'name'` | Mount of the completion screen after the last master |
| `trackPageview` | _(Mixpanel pageview)_ | `url` (origin + `#` + path) | AppLayout useEffect on route change |

**Init pipeline** (after `mixpanel.init`):
1. `mixpanel.identify(mixpanel.get_distinct_id())` — self-identify with the anonymous
   device id; without it Simplified Identity Merge drops anonymous `people.*` calls
2. `mixpanel.people.set_once({ $created })` — creates a profile in the Users tab

**Init config:**
- `api_host: 'https://api-eu.mixpanel.com'` — the project is EU-resident
- `track_pageview: false` — the hash router (`#/path`) would make the autotracker record
  everything on `/`, therefore pageview is sent manually from AppLayout
- `debug: import.meta.env.DEV` — `Mixpanel: ...` logs visible in the devtools console
- `persistence: 'localStorage'`, `ignore_dnt: true`

**Test mock:** `src/test/setup.ts` has a global `vi.mock('mixpanel-browser')`
with a stub object (`init`, `track`, `track_pageview`, `identify`,
`get_distinct_id`, `people.set`, `people.set_once`, `register`, `reset`).
Component tests are unaware of it; explicit assertions only in `analytics.test.ts`.
Calling `trackX` before `initAnalytics` is a no-op (module-level `initialized` flag),
so tests that don't call init keep working.

**E2E disabled:** `seed()` sets `window.__GENK_E2E__ = true` in `addInitScript`
(outside the session-once guard, so it persists across reload). `initAnalytics()` on the
flag returns a no-op before `mixpanel.init`. Plus belt-and-suspenders route blocks
on `**/api*.mixpanel.com/**` and `**/*.mxpnl.com/**` in `seed()`.

## LEA data (in Teorie)

LEA questions (17, theme `paragrafy`) are directly in `LAW_QUESTIONS`
(`law/data/questions.ts`) as `kind: 'enumeration'`, `matcher: 'alias'` — no
separate dataset or adapter. Paragraphs covered: §7, §9 A/B, §10, §11, §12 A/C,
§15, §16 B, §17 A, §18 A, §19 A, §21 A, §23 B, §37. Question IDs are (legacy
convention, the ID is otherwise opaque) `lea.<paragraph>[.<section>]`, `expected[].key`
`lea.<paragraph>.<section>.<sub>` (e.g. `lea.16.B.3b`).

**Cross-law questions**: `lea.zbrojni-prukaz` (Firearm Act §4) and
`lea.ridicsky-prukaz` (Penal Code §34/§36/§37/§58). The question ID is a slug instead of
a paragraph, the actual reference is in the `ref` field.

`AnswerList` and `AnswerRow` in `src/modules/law/components/` are **shared visual
primitives** for enumeration chips (correct/duplicate/wrong/missed) — imported
by `EnumerationInput`.

## Geo UI flow

`GeoLayout` (`src/modules/geo/components/GeoLayout.tsx`) is the parent route with
`<Outlet />`, NavLink tabs `Slepá mapa` / `Co je tady`, default index =
`<GeoBlindPage />`.

`GeoBlindPage` (mode 1):
1. `useGeoBlindProgress` over the `geo.blind` slice.
2. `current: POI | null` in `useState`. Picker in `useEffect` only when
   `current === null && phase === 'answering'` (LEA Gotcha 7 pattern).
3. `phase`: `'answering'` → `'revealed'`. `userClick: Vec2 | null`, `hit: boolean | null`.
4. Map layers: TileLayer + mastered POI (faded markers / polyline) + click-capture
   (only `answering`) + reveal (only `revealed`: target marker, wrongClick marker).
5. Click handler: `evaluateClick(poi, click)` from `logic/hitTest.ts`. `recordSubmit`
   with `perfect: hit`. Phase → revealed.
6. Skip: `recordSkip` + `trackQuestionSkipped({ module: 'geo-blind' })`.
7. SubmitFooter in `submit-footer--end`. Skip always available, "Další otázka" only
   in revealed.

`GeoNamePage` (mode 2):
1. `useGeoNameProgress` over the `geo.name` slice.
2. Same picker pattern. `feedback: { matched: POI|null, raw: string } | null`.
3. Map layers: TileLayer + mastered + asked POI (pulsing marker WITHOUT a label).
   In revealed the asked switches to the `target` (correct) / `wrongClick` (incorrect)
   variant and gets a label.
4. `GeoAnswerInput` is an adaptation of LEA `AnswerInput`: input + Vyhodnotit + autocomplete
   `suggestPois(input, ALL_POIS)`. Match via `matchPoi(input, [target])` — against
   only the current target POI.
5. Hard mode toggle (`useState(false)`) in `submit-footer--split` on the left. Per-session,
   does not persist.
6. Skip + reset analogously to `geo-name` testids.

`GeoSidePanel` (shared by both modes via prop `mode: 'blind'|'name'`):
- ProgressHeader with testid `geo-{mode}-progress-percent` / `-bar`.
- 4 checkboxes `geo-filter-{street|highway|city|state}`. Change `geo.settings.categoryFilter`
  via `useGeoSettings` (shared hook). The filter applies to both modes.
- POI list — chips with a 3-char category (ULI/LMK/PD), name, ✓ for mastered.
- Mobile via `<details>` in `GeoMobilePanel`.

## Law (Teorie) UI flow

`LawPage` (`src/modules/law/components/LawPage.tsx`) is the **single page** on route `/law`.
Unified quiz LEA + Penal scenarios + SASP, render by `current.kind`:

1. `useLawQuizProgress` over the `law` slice + `useLawSettings` (themeFilter, 10 themes).
2. `current: LawQuestion | null` in `useState`. Picker `pickNextQuestion` in `useEffect`
   only when `current === null && phase === 'answering'` (LEA Gotcha 7 pattern).
3. `phase`: `'answering'` → `'revealed'`. Reveal state by kind.
4. **Render by `kind`** (TS narrowing via `current.kind === …`):
   - `choice`: `<ChoiceInput>` — ≥5 options, keys `1`–`N`. **Options are shuffled**:
     `LawPage` holds `choiceOrder` (`useMemo` over `current`, permutation of indices via
     `shuffle` from `@/shared/rng`), passes it as the `order` prop; ChoiceInput renders/numbers
     the options by `order[position]` and on
     submit returns the ORIGINAL indices (testid number = displayed position, not the original index).
     `trackLawAnswered({kind:'choice'})`.
   - `text`: `<TextInput>` — input + autocomplete + Hard mode toggle. `trackLawAnswered({kind:'text'})`.
   - `enumeration`: `<EnumerationInput>` — multi-chip input (aliases or paragraph matcher
     by `matcher`). `<ScenarioBox>` shows the scenario above the input. Static instruction
     `law-enum-hint` (text by `matcher` — alias vs paragraph). **Ordered enumerations** (`ordered:true`)
     use the same chip input (the former textarea + `law-enum-order-*` testids are gone);
     during `answering` committed chips have a neutral state `pending` (5th value of
     `AnswerStatus` in `AnswerRow`, icon `·`, class `answer-row--pending`), the order is
     evaluated only in revealed via `matchOrdered`. `trackLawAnswered({kind:'enumeration'})`.
   - `match`: `<MatchInput>` — click-pairing left↔right column. `trackLawAnswered({kind:'match'})`.
5. Skip (`law-skip`), Reset (`LawResetButton`), Congrats, testids `law-*`.
6. Click on a chip in `LawSidePanel` → `handleSelect(id)` switches to the given question.

`LawSidePanel`:
- ProgressHeader with testid `law-progress-percent` / `-bar`.
- 10 theme checkboxes (incl. `scenky`), no source filter.
- Chips grouped into collapsible groups by theme (`law-group-<theme>`,
  header = caret + theme + mastered/total + mini bar). Collapsed by default,
  auto-expands groups with the active question; expand state per-session (useState).
  Chip = `title` (short caption instead of the prompt), ✓ for mastered, click switches the question.
- Mobile via `<details>` in `LawMobilePanel`.

## Refactor: unified module Teorie (DONE)

Branch `quiz-refactor`. Three waves, plans + specs in `docs/superpowers/plans/` and
`docs/superpowers/specs/`.

**Wave 1 — unification into Teorie** (`2026-06-18-law-unification-engine.md` and
related):
- New `src/modules/law/` with a pool of questions (LEA + Penal scenarios + native SASP).
- 4 `kind` formats: `choice` (multi-select ≥5 opts), `text`, `enumeration`, `match`.
- `LawPage`, `LawSidePanel` (then: source: lea/penal/sasp + 9 themes — the source
  filter **removed as of Wave 3**, see below), `LawResetButton`.
- Storage schema v8: removed `lea`, `penal.scenarios`, `sasp` slices; migration v7→v8 strips them.
- Old routes `/laws/*`, `/sasp` → redirect to `/law`; Penal Recall stayed at `/penal/recall`.
- Old UI code deleted: `src/modules/sasp/`, scenario UI in `laws/penal/`, custom quiz
  components in `laws/lea/`. Shared primitives (AnswerList/AnswerRow) and data/logic in `laws/` remained.

**Wave 2 — one dataset + removal of Penal Recall** (`2026-07-12-law-single-dataset.md`):
- `LAW_QUESTIONS` materialized as one TS literal in `law/data/questions.ts`
  (137 questions — then still with a `source` field: 17 LEA + 28 Penal + 92 SASP —
  the `source` field **removed as of Wave 3**, see below), adapters (`adaptLea.ts`,
  `adaptPenal.ts`) and `law/data/sasp/` deleted.
- Penal Recall removed as a feature: `/penal/recall` and legacy `/laws/penal/recall`
  redirect to `/law`; `e2e/penal/` deleted.
- Storage schema v9: `penal` slice removed entirely; `normalizeToV9` is the terminal
  of all migration chains and the lenient v9/v8 read (replaced by `normalizeToV10`
  in Wave 3).
- Surviving shared pieces moved under `law/`: `PENAL_PARAGRAPHS` catalog
  (`law/data/paragraphs.ts`), `canonicalAnswerId.ts` + `suggestParagraph.ts`
  (`law/logic/`), `AnswerList.tsx` + `AnswerRow.tsx` (`law/components/`).
- `src/modules/laws/` deleted entirely (no remnants).

**Wave 3 — flat question model + review markdown v2** (`2026-07-13-flat-question-model-md-v2.md`):
- The `source` field removed from all `LawQuestion` — the only classification dimension
  is `theme`. Penal scenarios got a new theme `scenky` (10th value of `LAW_THEME_KEYS`,
  replacing the former `source: 'penal'`); LEA remains under `paragrafy`, SASP under
  the remaining 9 themes. Existing IDs keep the legacy shape (`lea.*`/`penal.*`/`sasp.*`),
  but they are no longer enforced prefixes — they are opaque keys.
- Storage schema v10: `law.settings.sourceFilter` removed, the only filter is
  `themeFilter` (10 keys). `normalizeToV10` is, since the migration reduction, the SINGLE
  migration function — a lenient terminal for all historical payloads
  (the chained chain v1→…→v7 deleted, see the Migration section).
- `LawSidePanel` lost the 3 source checkboxes, only the theme filter remains. The chip
  lost the 1-char source mark (L/P/S), only the `title` remains.
  `trackLawAnswered` lost the `source` property.
- Review markdown moved to **v2**: English codes in the meta line
  (`type`/`theme`/`ref`/`ordered`) and item sub-lines (`aliases`/`keywords`/
  `key`/`sub`), a legend describing each field for the non-technical reviewer.
- Adding new questions via review markdown: section `### Titulek \`NEW\``
  instead of an existing ID; `npm run questions:import` generates the ID as `q<n>`
  and writes it into `questions.ts` and `seed.ts` (the single array `LAW_QUESTION_IDS`).
- `scripts/questions-import.ts` simplified: no per-source arrays/counts
  (`LEA_QUESTION_IDS`/`PENAL_SCENARIO_IDS`/`SASP_QUESTION_IDS` gone),
  just one `LAW_QUESTION_IDS` and one overall count in `questions.test.ts`.

## Gotchas (things to watch out for)

1. **`useSyncExternalStore` snapshot stability** — `storage.ts` has a `cachedSnapshot`,
   which is invalidated **only** on `saveState`/`clearState`/cross-tab `storage` event.
   Without the cache `loadState` would return a new reference → infinite loop. On a manual write
   to `localStorage` in tests call `__resetCacheForTests()` (happens automatically in
   `src/test/setup.ts`).

2. **Vitest has its own vendoring of `vite`** → type conflict `@vitejs/plugin-react`. Therefore
   `vitest.config.ts` is separate and **without** plugin-react. Vitest bends JSX via
   esbuild thanks to `tsconfig.app.json`'s `"jsx": "react-jsx"`.

3. **Playwright seeds via `localStorage`, not via a window hook**: `page.addInitScript`
   runs before app scripts, so window hooks are not attached yet. Instead
   `e2e/fixtures/seed.ts` writes directly to `localStorage["genk-pd:v1"]` (in the format
   `schemaVersion: 10` with all current slices) and `localStorage["genk-pd:rng-seed"]`.
   The init script uses a `sessionStorage` flag `genk-pd:seeded` so that it
   **does not reseed after reload** (otherwise persistence tests would be worthless).

4. **The SidePanel renders only once**, not twice. `CodesPage`, `LawPage`
   and `GeoLayout` switch between inline desktop and collapsible mobile
   by `useMediaQuery('(min-width: 1024px)')`. Without it the `data-testid` would be
   duplicate → strict mode collision.

5. **`progress` and `turn` MUST be in the deps of the `useEffect`** in `ModeWrite`/`ModeChoose`
   that picks the next question — without them, after `reset()` (from the congrats banner) a
   new question is not picked up.

6. **Auto-focus of the input in ModeWrite is a SEPARATE effect** with deps `[current, feedback]`,
   not a `queueMicrotask` in the selection effect. Reason: when the effect sets `current`, the input
   is not in the DOM yet (`<QuestionSkeleton />` renders), so the microtask focuses `null`.

7. **`current` in `useState`, NOT `useMemo`.** The critical bug fix applies to all quiz
   pages (LawPage, GeoBlindPage, GeoNamePage):
   `useMemo(() => pickNextQuestion(...), [progress, turn])` after submit immediately re-picked
   a DIFFERENT question → the `useEffect` on `[current?.id]` reset the phase from `revealed` back to
   `answering` → the reveal disappeared. Fix: `current` in `useState`, `useEffect` picks only
   when `current === null && phase === 'answering'`. `handleSubmit` leaves `current`
   untouched, only changes the phase.
   **When adding a new question to `LAW_QUESTIONS` (directly into `law/data/questions.ts`)
   you MUST extend `LAW_QUESTION_IDS` in `e2e/fixtures/seed.ts`**, otherwise
   `pinNextLawQuestion` stops being deterministic and E2E tests fail.
   `LawPage.test.tsx` derives saturation from the imported `LAW_QUESTIONS`
   automatically — no manual sync is needed there.

8. **`AnswerRow` does not use a prop `ref`** — `ref` is a React reserved prop name
   (forwardRef). The field for the secondary text on the right (typically §ref or "duplikát" /
   "žádná shoda" / "zapomenuto") is in the interface `AnswerEntry` as `meta` and in
   the `AnswerRow` prop also `meta`. Do not add a prop `ref` anywhere in the `law/`
   components. For the paragraph matcher, wrong answers are distinguished via
   `lookupParagraph` (`law/logic/lookupParagraph.ts`): a valid-but-inapplicable
   paragraph shows the name + meta "nevztahuje se", a parseable non-existent number
   "neexistující paragraf", an unintelligible input "žádná shoda".

9. **`data-testid="chiplist"` (no hyphen)** on the `<ul>` of `AnswerList`. The test regex
   `/chip-/` (matching the rows `chip-correct/duplicate/wrong/missed`) would otherwise
   double-match the wrapper. Intentional rename. The same testid is also used by E2E
   `responsive.spec.ts`.

10. **`useMediaQuery` in jsdom** — jsdom lacks `window.matchMedia`. `src/test/setup.ts`
    has a stub `matches: false`, so unit tests render the mobile variant (collapsed
    `<details>`). RTL `getByTestId` finds even hidden elements inside collapsed details,
    so existing tests work.

11. **`schemaVersion` in test seeds must be `10` with the correct slices**.
    Hardcoded literals in all `*.test.tsx` that call `saveState({...})` must have
    `schemaVersion: 10`, a `codes` slice, a `geo` slice with `settings.categoryFilter`
    (4 categories) and a `law` slice with `progress: {}`, `turn: 0`, `settings.themeFilter`
    (10 themes, incl. `scenky`). No `sourceFilter` — it was removed in Wave 3. WITHOUT
    `lea`, `sasp`, `penal` or `penal.scenarios` — `normalizeToV10` strips them.
    If you add another slice, bump the schema (v10 → v11) and add a migration in `storage.ts`.

12. **The Vite dev server is by default locked down to `localhost`.** For an ngrok/cloudflared
    tunnel there is `server.allowedHosts: ['.ngrok-free.app', '.ngrok.app',
    '.trycloudflare.com']` in `vite.config.ts`. Without it Vite returns "Blocked request" for unknown hosts.

13. **Use `text-sasp-ink-dim`, NOT `text-sasp-ink/60`**. CLAUDE.md / the Tailwind palette
    has a named shade for muted text — prefer it.

14. **No emoji in code / documentation**, unless the user explicitly requests it.

15. **The `.card` class has NO padding.** Padding (`p-6 sm:p-8` typically) is added
    per use. Codes panels, HomePage cards, `<main>` in LawPage
    add it themselves. Without it the card looks glued to the edges —
    a typical symptom of a "looks worse" report. When copying a new
    module's layout, don't forget it.

16. **Backspace on an empty input in `AnswerInput` does nothing.** It used to delete
    the last answer via an `onBackspaceEmpty` callback, but that was
    confusing for the user — text fields aren't cleared like tag inputs. The prop
    `onBackspaceEmpty` was removed; a chip is removed only via the × button on the row.

17. **`AnswerInput` Enter algorithm**: `matchAnswer` first → commit a direct hit,
    otherwise fill from the highlight if there is a suggestion, otherwise commit raw. Consequence:
    typing an alias or an exact quote (e.g. "maják") commits in a single Enter;
    typing an abbreviation ("varo") fills the selected suggestion (a second Enter commits).
    Arrows ↑↓ only change the highlight (no `hasNavigated` state exists anymore).
    **Applies also to `EnumerationInput` (Teorie):** Enter first tries a direct match
    (`matchEnumerationEntry` — alias/keyword or paragraph) and commits it in one
    press; otherwise it fills from the highlight if there is a suggestion; otherwise it commits raw.
    I.e. an exact alias / paragraph commits in a single Enter, even when the
    autocomplete is open.

18. **The Mixpanel project is EU-resident** — `api_host: 'https://api-eu.mixpanel.com'`
    MUST stay in the `mixpanel.init()` config. Without it the SDK sends to the default
    `api-js.mixpanel.com` (US) → the server returns HTTP 200, but the events never appear in
    the EU instance (Live View would be empty, Network OK). The symptom
    is not obvious — that's why it's easily overlooked.

19. **Simplified Identity Merge drops anonymous `people.*` calls** — a Mixpanel
    default since ~2024. `mixpanel.identify(mixpanel.get_distinct_id())` BEFORE
    `people.set_once` in `initAnalytics` bypasses it: the self-identify with the `$device:...`
    ID „promotes" the anonymous distinct_id to a stable identity, the profile is created in the Users
    tab. **Do not remove that line** (events would arrive, profiles would not — that
    gets debugged for hours).

20. **E2E disables Mixpanel via `window.__GENK_E2E__`** — `seed()` sets the flag
    in `addInitScript` (outside the session-once guard, so it persists across reload).
    `initAnalytics()` on the flag returns a no-op before `mixpanel.init`. All E2E
    specs call `seed()`, so it applies universally. If you ever wrote a
    spec without `seed()`, Mixpanel would boot and the route blocks in `seed()` would be missing
    → real requests would leak.

21. **Skip overrides the feedback score** — in ModeWrite/ModeChoose and in the LEA
    `revealed` phase the Skip button is still active. Pressing it after `recordAnswer`
    (codes) or `recordSubmit` (LEA) overwrites the score absolutely to MAX (`+2`).
    This is intentional UX: the user says „I know it, give me the next one". `recordSkip`
    writes an absolute value, not a delta, so a prior wrong submit (-2) /
    wrong answer (-1) is reset. When debugging: if you want to keep the
    skip-only-before-answer behavior, hide the button with a condition on `feedback`/
    `phase`.

22. **UI clamps earnedScore to MAX_SCORE (2)** — the progress-bar pct computes
    `Σ min(2, max(0, score))` instead of `Σ max(0, score)`. Without the upper clamp
    a legacy `score=3` (from the range `-3..+3`) would give pct > 100 % (a test saw
    150 %). Places: codes `SidePanel.tsx` + MobilePanel, law `LawSidePanel.tsx`
    + MobilePanel, geo `GeoSidePanel.tsx`. When bumping the range don't forget all places.

23. **Penal mode A: strict ID matching, no partial credit** —
    `matchScenarioAnswer` returns null if a paragraph has subs but the user
    didn't give a sub (or vice versa). Likewise a wrong sub (`25a` when expected `25b`)
    is full `wrong` in the page logic. This is intentional educational design — the module teaches
    the distinction of sub-paragraphs. If you were to change it, it drastically changes the expected
    behavior of all 28 scenarios.

24. _(defunct — recall removed; the former recall pool `RECALL_PARAGRAPHS`/`recallPool.ts`
    was deleted along with the Penal Recall feature)_

25. _(defunct — recall removed; the former `PENAL_PARAGRAPH_IDS`/`pinNextPenalParagraph`
    in `e2e/fixtures/seed.ts` were deleted along with `e2e/penal/`)_

26. **`EnumerationInput` (paragraph matcher) uses the canonical ID as the match key, not the quote** —
    the chip excludeKeys contains `'25b'`, `'27'`, not `paragraphId`. If you were to change
    AnswerList or the chip structure, keep the canonical ID as the exclude key.

27. **The Hard mode toggle in `EnumerationInput` (paragraph matcher) is per-session state**
    (`useState(false)` in `LawPage`). The state doesn't survive a refresh. Intentional — bump the
    schema once there's demand. If it should persist, add it to `law.settings.hardMode`
    and bump the schema (v10 → v11).

28. **Choice tests select an option by TEXT, not by index** — because
    `LawPage` shuffles the order of options (`choiceOrder`), neither unit nor E2E test may click
    a fixed position/index. The specs and `LawPage.test.tsx` import `LAW_QUESTIONS`
    directly and look up the option by its text (`options[correctIndices[i]]`),
    so they adapt to the shuffled order and to changes in the options' text. When writing a new
    choice test, never hardcode "click the 1st option" as the correct one.

29. **Schema is v10** — bumped from v9 by removing `law.settings.sourceFilter` and
    adding the theme `scenky` (Wave 3 of the flat model; v9 = the `penal`
    slice removed entirely after the removal of Penal Recall, v8 = removed `lea`, `sasp`,
    `penal.scenarios` slices, v7 = +law slice additively, v6 = sasp quiz
    merged, v5 = sasp split, v4 = geo). **Test seeds with hardcoded
    `saveState({...})` must not contain `lea`, `sasp`, `penal`, `penal.scenarios`
    or `law.settings.sourceFilter`** — `normalizeToV10` strips them, so
    in unit tests they are pointless and in the E2E seed they are intentionally omitted. If
    you add a new module or a new theme, bump v10 → v11 and add a migration
    in `storage.ts`.

30. **The tile pipeline is NOT in `npm run build`** — `scripts/generate-tiles.mjs` is
    a one-time script run manually (`node scripts/generate-tiles.mjs`).
    It generates 802 tiles into `public/tiles/{z}/{x}/{y}.jpg` (z=0..3, ~5.7 MB) +
    rewrites `src/modules/geo/data/tileMeta.ts`. The output is committed — if
    you were to change the source `docs/clean-map.jpg` (8192×12288), run the script and commit
    the new tiles. If you want a sharper max zoom, bump `MAX_ZOOM` in the script to 4
    (adds ~600 tiles, ~25 MB more).

31. **react-leaflet breaks in jsdom** — the components `MapContainer`, `TileLayer`,
    `Marker`, `Polyline`, `Tooltip` and `useMapEvents` can't be rendered without
    a real Layout. Pattern for page tests (`GeoBlindPage.test.tsx`,
    `GeoNamePage.test.tsx`): `vi.mock('react-leaflet')` with stub components
    + `useMapEvents` capturing the handler into a `vi.hoisted` capture object.
    The test then triggers the click handler directly with a fake `latlng` (recomputed from
    normalized coords via `TILE_META`). Real Leaflet rendering we test
    only in Playwright E2E.

32. **The geo hit-test is in square coord space (we accept the aspect distortion)** —
    `pointHit` and `polylineHit` from `logic/hitTest.ts` compute euclidean distance
    in normalized 0..1 space. The source JPEG is portrait 8192×12288, so
    1 unit in Y corresponds to fewer pixels than in X. For the medium threshold 0.0233
    this means about 191 source px in X vs 286 in Y. Fine for MVP. If it starts
    hurting, multiply Y by the ratio (8192/12288 = 0.667) in the hit-test for truly
    isotropic distance.

33. **The POI dataset is a hardcoded TS literal** in `src/modules/geo/data/pois.ts`
    with normalized coords (0..1) verified against `docs/clean-map.jpg`. If you were to
    move a marker, edit `position` / `path` in the literal and `pois.test.ts`
    validates it (range, alias non-collision). For a bulk POI revision use
    `gta-5-map.com` as a reference.

34. **Geo POI IDs in the E2E seed must be in sync with the data** — `e2e/fixtures/seed.ts`
    has a hardcoded `GEO_POI_IDS` (30 IDs). When adding a new POI to `pois.ts`
    extend the list in seed.ts too, otherwise `pinNextGeoPoi` stops saturating 29/30
    and the picker lets through a different target.

35. **The Geo ResetButton is per-mode** — `<GeoResetButton mode="blind" />` resets
    ONLY the `geo.blind` slice. The other mode and `categoryFilter` remain. Confirm
    dialog testids `geo-{mode}-reset-{button|confirm|cancel|confirm-yes}`.

36. **GeoLayout is a top-level module, not under /laws** — `/geo/blind` and `/geo/name`
    live on a top-level route. AppLayout nav has 3 links (Codes/Teorie/Geo),
    HomePage 3 cards. When testing home navigation via `getByRole('link',
    { name: 'Geografie', exact: true })` it matches the **navbar link**
    (simple text), not the home card (link + h2 + p + span = a complex
    accessible name).

37. **4 POI categories** — `POICategory = street | highway | city | state`
    (Ulice / Dálnice / Body ve městě / Body ve státě). street+highway = polyline
    geometry, city+state = point. ID prefix == category (`city.lsia`,
    `highway.del-perro-fwy`). Test fixtures with a `categoryFilter` literal must have
    all 4 fields (otherwise a TS type error). When changing categories: update types.ts
    + GeoCategoryFilter in storage.ts + initialState defaults + lenient read
    backfill + GeoSidePanel CATEGORY_LABEL/ABBR/ORDER + GeoBlindPage
    CATEGORY_LABEL + pois.test.ts counts + all test fixtures + e2e seed
    (`seed.ts` type + builder) + `geo-poi-ids.ts` (renamed ID).

38. **A POI with a name equal to some alias after normalize** = test fail
    (`alias collision with name`). Example: name "PDM" + alias "pdm" — both
    normalize to "pdm". Solution: remove the redundant alias.

39. **CRITICAL: clean-map.jpg is NOT a linear projection of the vanilla GTA world** —
    `docs/clean-map.jpg` (8192×12288, stitch of 6 minimap textures via
    `scripts/extract-minimap.py`) is a CUSTOM map of the server: the same island,
    but regionally deformed geometry vs. vanilla world coords (the south of the city
    is up to ~1 km „further north", the deformation is nonlinear and not fixable by any
    global transform — empirically verified by fitting the road graph and measuring
    intersections). The earlier theory „uniform projection x∈[-4000..4000],
    y∈[-4000..8000] @1.024 px/m" is WRONG — the historical `gtaProjection.ts`
    and migrations built on it and broke positions. **The only source of truth for coordinates is
    the art itself** (its street labels, route shields, parcel numbers).
    Consequence: do NOT generate geo coordinates from vanilla GTA data (path-node
    dumps, Foxxite GeoJSON, etc.) — all such pipelines were deleted.

40. **POI positions = visually verified against the art**
    — POI positions are placed and visually verified directly against the art
    (`docs/clean-map.jpg`). The only source of truth = the art (Gotcha 39). Uncertain
    candidates fine-tune via `/geo/calibrate` Drag&Drop.

41. **Street centerlines are HAND-TRACED from the art** (`streets.generated.ts`,
    despite the name it is NO LONGER generated) — traced from the street labels and
    route shields in the art (I-2 = Del Perro, I-4 = Olympic, I-5 = La Puerta,
    I-1/„Los Santos Freeway" text = LS Fwy, US-13 = Senora, US-15 = Palomino,
    US-1 = GOH, US-68 = Route 68, US-20 = Elysian area). Hit-test =
    perpendicular distance ≤ `POLYLINE_HIT_TOLERANCE` (0.015). When
    retuning use the `/geo/blind` debug overlay (key `D`: draws
    all centerlines + logs normalized click coords to the console) and
    the Drag&Drop editor `/geo/calibrate`, then paste into `streets.generated.ts`.

42. **The click tolerance of point POIs is per-`size`, not fixed** — `evaluateClick`
    takes the threshold from `SIZE_THRESHOLDS[poi.size ?? 'medium']` (`logic/hitTest.ts`):
    tiny 0.01 / small 0.0167 / medium 0.0233 / large 0.0367 / huge 0.06. Large
    sprawling areas (airport, docks, cities, oil field — `size: "huge"`) have
    a large click zone, pinpoint buildings (`size: "small"`) a small one. `size` is
    optional on `POIBase`, but practically applies only to point geometry (streets
    keep a fixed `POLYLINE_HIT_TOLERANCE`). `HIT_THRESHOLD` is now an alias of medium
    (0.035, was flat 0.03). An explicit `threshold` param of `evaluateClick` still
    overrides size (tests). `pois.test.ts` validates that every point POI has
    `size` from the 5 values. **`formatPoisTs` (calibrate export) emits `size`** — without
    it a re-export from `/geo/calibrate` would delete the field. Retuning values: edit
    `SIZE_THRESHOLDS` (globally) or per-POI `size` in `pois.ts`. The tier `tiny`
    is unused so far (available for future pinpoint POIs).

43. **Law question IDs in the E2E seed must be in sync with the data** — `e2e/fixtures/seed.ts`
    exports a single array `LAW_QUESTION_IDS` (137 IDs) for `pinNextLawQuestion`
    in E2E specs. When adding a new question directly into `law/data/questions.ts`
    extend this array in `seed.ts` too, otherwise `pinNextLawQuestion` stops being
    deterministic and E2E tests fail (the same pattern as Geo Gotcha 34).
    `LawPage.test.tsx` derives saturation from the imported `LAW_QUESTIONS`
    automatically. Validation of new content (overall count, valid theme,
    per-kind invariants) is in `questions.test.ts` — don't forget to update the count
    there. **Manual sync of both is avoided if you add the question via review markdown**
    (`npm run questions:export` → section `### Titulek \`NEW\`` → `npm run
    questions:import`) — the import script regenerates `LAW_QUESTION_IDS` and the count
    in `questions.test.ts` mechanically (see `scripts/questions-import.ts`).

44. **Text aliases in Law questions must not collide with `answer` after normalize** —
    `questions.test.ts` validates this for all text questions (analog of Geo Gotcha 38).
    A diacritics-free variant of an alias is redundant (normalize strips diacritics),
    so `answer: "Státní zástupce"` + alias `"statni zastupce"` = fail.
    Add aliases as real paraphrases, not diacritic variants.

45. **`LawQuestion` is a discriminated union via `kind`** — `choice | text | enumeration | match`.
    `LawPage` branches render via `current.kind === …` (TS narrowing). **Do not use
    a boolean const to narrow the type** — it doesn't narrow. A new interaction = a new `kind` +
    a branch in `LawPage` + the corresponding Input component + (optionally) a matcher in
    `law/logic/`.

46. **`q<n>` IDs from the review markdown can be reused — beware orphaned progress.**
    `parseQuestionsMd` generates a new ID as `1 + max(existing q<n>)`. If you
    delete the question with the highest `q<n>` (e.g. `q9` while there are `q1..q8`) and later
    add a new `NEW` question, the import assigns it the same `q9` — a player who kept the
    old `q9` in their `localStorage` progress inherits its old score, as if
    they already knew/didn't know that new question. The `scripts/questions-import.ts` cross-check
    (see the Gotcha 43 addendum) doesn't catch this — it checks only unknown IDs, not reuse
    of an already deleted one. Therefore: don't delete the highest `q<n>` in the dataset carelessly; if
    you must, consider letting the ID „burn out" (e.g. temporarily add a placeholder question with
    the same ID, or find and delete the related progress in stored data too) rather than
    relying on the new number never colliding with old player state.

## Conventions

- The alias path `@/...` maps to `src/...` (TS path + Vite/Vitest resolve.alias).
- We write comments only where the **why** is not obvious from the code. Never JSDoc on trivial
  pure functions.
- Styled primitives in `src/styles/index.css` (`.btn-primary`, `.btn-secondary`,
  `.btn-danger`, `.card`, `.chip` (codes only), `.answer-input*`, `.answer-list*`,
  `.answer-row*`, `.reveal-perfect`, `.submit-footer*`, `.autocomplete-*`,
  `.lea-page` etc.) — prefer over repeating classes.
- `data-testid` on everything E2E tests. Add it while writing the component, not afterwards.
- No hidden state outside `localStorage` — everything persisting goes through `storage.ts`.
- TDD: failing test → minimal impl → verify pass. Never delete existing tests
  without reason.
- LEA questions are in Czech, prompt format: "Vyjmenuj…" / "Kdy má příslušník…".

## Out of MVP scope / future ideas

- **Firearm Act** content: the model is flat, no new "source" to introduce. Either
  place questions into an existing theme (e.g. `paragrafy`), or add a new
  theme into `LAW_THEME_KEYS` in `storage.ts` (bump schema v10 → v11 + migration).
  Questions directly into `law/data/questions.ts` or via review markdown `NEW`
  (no adapter — the same pattern as LEA/Penal/SASP today). Source:
  `docs/firearm-act.md`. The old recommendation "a new module under /laws/firearm"
  is obsolete — everything goes into the unified `/law` pool.
- **Shared SidePanel ProgressHeader/SCORE_CLASS**: currently duplicated in
  `codes/SidePanel.tsx`, `law/LawSidePanel.tsx`. YAGNI until they start to differ
  or hurt on changes.
- **Geo polygon regions / districts** (`/geo`): MVP has no `district` category —
  Vinewood, Del Perro, etc. Polygon support was removed from the codebase (type
  POIPolygon, polygon hit-test via @turf/* — see git history). If there is
  demand, re-add a 7th category `district` with `geometry: 'polygon'`:
  type + point-in-polygon hit-test + render + formatPoisTs branch.
- **Geo tile zoom z=4** (native pixel sharpness): currently capped at z=3, max zoom
  ~5x downscaled. Bumping `MAX_ZOOM` in `scripts/generate-tiles.mjs` to 4 adds
  ~600 tiles (~25 MB). Makes sense if the user reports a blurry max zoom.
- **Geo Hard mode persistence** (`geo.settings.hardMode`) — analog of Penal Hard
  mode persistence. Same argument: bump the schema once there's demand.
- **Geo POI fine-tuning in Drag&drop** — positions are visually verified, but not
  pixel-precise. When the user registers a specific wrong position, open
  `/geo/calibrate` (Drag&drop editor), drag-tune, export TS → paste into `pois.ts`.
  Streets (polyline) have per-node draggable handles.
- **Teorie module — SASP content expansion** — currently 92 SASP questions (text/enum/match
  formats underrepresented). Add directly into `src/modules/law/data/questions.ts`
  (a theme other than `paragrafy`/`scenky`) or via review markdown `NEW`.
  `docs/sasp-manual.md` stays in `.gitignore` (confidential source).
  Anti-leak: must NOT reuse specific wording from the real test.
- **More Penal scenarios** — add directly into `law/data/questions.ts` as a new
  `LawQuestion` (`theme: 'scenky'`, `kind: 'enumeration'`, `matcher: 'paragraph'`).
- **False-negative aliases** in LEA / Penal — extend the alias list in `questions.ts`
  (LEA `expected[].aliases`) / `paragraphs.ts` (Penal paragraph aliases) manually.
  Watch out for strict legal correctness (see the Gotcha about LEA §15 5a).
- **`ComingSoonPage`** (`src/app/ComingSoonPage.tsx`) is unused — kept
  for future placeholders, not imported in `routes.tsx`.
