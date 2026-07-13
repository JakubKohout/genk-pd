# Jeden dataset pro Teorie modul + zrušení Penal Recall

Datum: 2026-07-12
Branch: `quiz-refactor`
Stav: schváleno uživatelem (design dialog)

## Cíl

Dokončit úklid refaktoru: jeden zdroj pravdy pro právní otázky. Všech 139 otázek
(17 LEA + 28 Penal scének + 94 SASP) žije nativně jako `LawQuestion[]` v jednom
souboru; metadata `kind` / `source` / `theme` řídí formát a filtrování. Adaptéry
(`adaptLea`, `adaptPenal`) a staré datové formáty zmizí. Penal Recall
(`/penal/recall`) se ruší úplně. Adresář `src/modules/laws/` se maže beze zbytku.

## Ne-cíle

- Žádné změny chování Teorie kvízu (formáty otázek, matching, scoring, UI).
- Žádné změny Codes a Geo modulů.
- Žádná změna `STORAGE_KEY` ani ztráta `law` progressu uživatelů (IDs otázek
  zůstávají stabilní).

## Rozhodnutí (z design dialogu)

1. **Vše pod `law/`** — číselník paragrafů, paragraph logika i sdílené UI
   primitivy se stěhují do `src/modules/law/`. Jediný modul vlastní právo.
2. **Jeden soubor** — `law/data/questions.ts` s celým polem 139 otázek
   (~3300 řádků), žádné per-source soubory.
3. **Penal Recall se ruší úplně** — stránka, route, storage slice, analytics,
   E2E. Uvolní to `matchParagraph`, recall pool i celý `laws/penal` UI strom.
4. **Konverze codegenem** — jednorázový skript serializuje dnešní runtime pool
   (výstup adaptérů) do TS literálu; dočasný snapshot test dokáže datovou
   identitu před smazáním starých zdrojů. Garantuje stabilní IDs (localStorage
   progress klíče) a nulové přepisovací chyby.

## Datový model

- `src/modules/law/data/questions.ts` — jediný dataset:
  `export const LAW_QUESTIONS: readonly LawQuestion[]`. Obsah je materializace
  dnešního `adaptLeaQuestions() + adaptPenalScenarios() + SASP_LAW_QUESTIONS`,
  datově identická (deep equal) s dnešním runtime poolem.
- `src/modules/law/data/paragraphs.ts` — referenční číselník `PENAL_PARAGRAPHS`
  (75 paragrafů, přesun z `laws/penal/data/paragraphs.ts` včetně typů
  `PenalParagraph` / `PenalSubParagraph` / `PenalCategory` a testů). Není to
  otázkový dataset — je to lookup tabulka pro paragraph matcher
  (autocomplete + validace v `EnumerationInput` / `matchEnumeration`).
- `law/data/types.ts` (`LawQuestion` discriminated union) zůstává beze změny.
- Mazané datové soubory: `law/data/adaptLea.ts`, `law/data/adaptPenal.ts`,
  `law/data/sasp/*`, `law/data/index.ts` (nahrazen `questions.ts`),
  `laws/lea/data/*`, `laws/penal/data/*`. Staré typy (`Question`, `AnswerItem`,
  `PenalScenario`, `ExpectedAnswer`) zanikají.

## Zrušení Penal Recall

- Smazat: `PenalRecallPage`, `PenalSidePanel`, `PenalSubmitFooter`,
  `PenalResetButton`, `laws/penal/state/*`, `laws/penal/data/recallPool.ts`,
  `laws/penal/logic/matchParagraph.ts`, `recall-audit.test.ts`, `e2e/penal/`.
- Routy: `/penal/recall` i legacy `/laws/penal/recall` → redirect na `/law`
  (žádné 404 pro bookmarky).
- Nav 4 → 3 položky (Codes / Teorie / Geo), HomePage 4 → 3 karty.
- Storage: **schema v8 → v9**. Migrace v8→v9 dropne celý `penal` slice.
  `saveState` zapisuje v9 bez `penal`. Lenient read v9 dopočítá chybějící
  `geo` / `law` sub-slices jako dosud. `STORAGE_KEY = 'genk-pd:v1'` beze změny.
- Analytics: smazat `trackPenalAnswered` a `trackPenalCompleted` + hodnoty
  `penal-scenario` / `penal-recall` z enumů `trackProgressReset` a
  `trackQuestionSkipped`; smazat i mrtvé `trackSaspAnswered` /
  `trackSaspCompleted`. `LawSource` enum (`lea | penal | sasp`) zůstává —
  je to metadata otázek, ne modul.

## Přesuny přeživších (vše pod `law/`)

- `laws/lea/components/AnswerList.tsx` + `AnswerRow.tsx` (+ testy) →
  `law/components/` — po zrušení Recallu je používá jen `EnumerationInput`.
- `laws/penal/logic/canonicalAnswerId.ts` + `suggestParagraph.ts` (+ testy) →
  `law/logic/`.
- Po přesunech `src/modules/laws/` neexistuje; `law/` nemá žádné importy mimo
  `@/shared`.

## Postup konverze (pořadí kroků)

1. Codegen skript ve scratchpadu (necommituje se) vypíše dnešní `LAW_QUESTIONS`
   jako formátovaný TS literál.
2. Dočasný snapshot test: pool z adaptérů === pool z literálu (deep equality,
   včetně pořadí). Zelený test = důkaz identity.
3. Přepnout export `LAW_QUESTIONS` na literál; smazat adaptéry, staré zdroje
   a snapshot test.
4. Datové testy sjednotit do `law/data/questions.test.ts`: unikátní IDs, počty
   per source (17/28/94), valid source/theme, choice ≥5 options + ≥1 správná,
   text alias non-collision po normalize, match pairs, title length gate.
5. Recall removal + schema v9 + přesuny; průběžně `npm test`.
6. E2E: smazat `e2e/penal/`, v `seed.ts` odstranit penal slice,
   `PENAL_PARAGRAPH_IDS` a `pinNextPenalParagraph`; seed zapisuje
   `schemaVersion: 9` bez `penal`.
7. Unit test seedy: hardcoded `saveState({...})` literály přepnout na v9 bez
   `penal` slice (Gotcha 11/29 pattern).
8. CLAUDE.md přepsat: nová struktura, schema v9, 3 nav položky, nové test
   počty, aktualizované gotchas (25 zaniká, 43 se zjednoduší).

## Testování

- `npm run test:all` zelené na konci každé fáze; finální počty se přepočítají
  (unit klesne o recall/adapter testy, E2E o 4 penal testy) a zapíšou do
  CLAUDE.md.
- Snapshot identity test je dočasná pojistka konverze — po přepnutí a zeleném
  běhu se maže spolu s adaptéry.
- `LawPage.test.tsx` saturation list a E2E seed law IDs se nemění (IDs jsou
  stabilní), jen se ověří, že žádný test neimportuje z `@/modules/laws`.

## Rizika

- **Tichá změna dat při konverzi** — kryto snapshot testem (deep equal).
- **Ztráta uživatelského progressu** — `law` slice IDs beze změny; `penal`
  slice se zahazuje záměrně (feature zrušena rozhodnutím uživatele).
- **Zapomenutý import na `@/modules/laws`** — finální grep + TS build
  (`tsc -b`) to chytí.
