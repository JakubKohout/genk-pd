# Plochý model otázek + review markdown v2

Datum: 2026-07-13
Stav: schváleno uživatelem (návrh), čeká na implementaci

## Problém

1. ID otázek kóduje strukturu (`lea.9.A`, `penal.scenario.A1`, `sasp.choice.vybava.3`)
   a dimenze `source` (lea/penal/sasp) je mapovaná na konkrétní zákony — uživatel
   tuto vazbu nechce: otázka má mít prostě ID, kategorii a typ; na jeden zákon
   smí být 3 otázky, na jiný žádná.
2. Review markdown neumožňuje přidávat nové otázky.
3. Legenda nevysvětluje jednotlivá pole (type/key/alias/keywords…).
4. Hodnoty typů a technická pole jsou česky s mezerami („výčet (aliasy)") —
   mají to být anglické code listy bez mezer.

## Řešení — fáze A: zploštění datového modelu (aplikace)

### Odstranění `source`

- `LawBase` ztrácí pole `source`; typy `LawSource`, `LAW_SOURCES`,
  `LAW_SOURCE_KEYS` se mažou (types.ts, storage.ts).
- UI: `LawSidePanel` + `LawMobilePanel` ztrácí 3 source checkboxy a
  1znakovou source značku na chipech (chip = jen title + ✓).
- `useLawSettings` ztrácí `sourceFilter`/`setSource`; `eligibleQuestions` /
  `pickNextQuestion` / `isLawComplete` ztrácí sourceFilter parametr.
- Analytika: `trackLawAnswered` ztrácí property `source` (event `law_answered`
  nese jen `kind`, `success`, `question_id`).

### Storage v9 → v10

- Migrace v9→v10: odstraní `law.settings.sourceFilter`, doplní chybějící klíče
  `themeFilter` (nové téma, viz níže). `normalizeToV10` je nový terminál všech
  migračních řetězů (v1–v9 ústí sem) i lenient v10 read. `saveState` zapisuje
  v10. `STORAGE_KEY = 'genk-pd:v1'` se nemění.
- Progress hráčů se zachovává: ID otázek se NEMĚNÍ (progress je klíčovaný ID).

### Téma `scenky` (10 témat)

- `LAW_THEME_KEYS` += `'scenky'`; 28 penal scének (dnes `theme: 'paragrafy'`,
  `matcher: 'paragraph'`, se `scenario`) se přeřadí do `scenky`. LEA výčty
  zůstávají v `paragrafy`. Default `scenky: true` (jako ostatní).

### ID = opaque string

- Zruší se test „IDs are prefixed by their source" v `questions.test.ts`
  a per-source counts (zůstává celkový počet 137; volitelně per-theme).
- Stávající ID zůstávají beze změny — jsou to už jen unikátní klíče.
- Nové otázky dostávají generovaná ID `q1`, `q2`, … (viz fáze B).

### Review modul — kompilační dopad fáze A

`serializeQuestions` / `parseQuestionsMd` / `formatQuestionsTs` referencují
`q.source` (meta, odvozování z ID prefixu, emise) — fáze A je musí upravit
zároveň se zrušením pole: serializace bez source, skupinové nadpisy
`## <theme>`, parser bez `sourceFromId`, format bez `source:` řádku.
Round-trip test zůstává zelený po celou dobu. Změny formátu, které nejsou
vynucené kompilací (anglické kódy, legenda, NEW), patří do fáze B.

### E2E

- `e2e/fixtures/seed.ts`: law slice ve tvaru v10 (bez sourceFilter, 10 témat);
  pole `LEA_QUESTION_IDS` / `PENAL_SCENARIO_IDS` / `SASP_QUESTION_IDS` se
  sloučí do jediného `LAW_QUESTION_IDS` (jediný literál, regenerovaný importem).
- `e2e/law/filter.spec.ts`: testy source filtru se nahradí testem theme filtru
  (vypnutí `scenky` schová scénky).
- `e2e/law/persistence.spec.ts`: v1 migrační test zůstává (řetěz končí v10).

## Řešení — fáze B: review markdown v2

### Anglické code listy

- Meta řádek: `- type: <code> | theme: <theme> [| ref: <ref>] [| ordered: true]`.
  Kódy typů: `choice`, `text`, `enumeration-alias`, `enumeration-paragraph`,
  `match`. `theme` hodnoty jsou existující kódy témat (lowercase bez mezer).
- Technické pod-řádky výčtových položek anglicky: `aliases:`, `keywords:`,
  `key:`, `sub:`.
- Lidské popisky obsahu zůstávají česky: `**Zadání:**`, `**Scénka:**`,
  `**Možnosti:**`, `**Odpověď:**`, `**Aliasy:**`, `**Položky:**`, `**Páry:**`,
  `**Vysvětlivka:**`, `SMAZAT` — čte je recenzent.
- Skupinové nadpisy `## …` se mění na `## <theme>` (source už neexistuje).

### Legenda s popisem polí

Úvod souboru vysvětluje každé pole:
- `id` v backticks (technický klíč — needitovat),
- `type` + výčet kódů s významem (choice = výběr z možností, text = volná
  odpověď, enumeration-alias = vyjmenování položek, enumeration-paragraph =
  určení paragrafů, match = přiřazování dvojic),
- `theme` + výčet 10 témat,
- `ref` (odkaz na paragraf, jen informativní),
- checkboxy `[x]`/`[ ]` (správné/špatné možnosti),
- `**Aliasy:**` u text otázek a `aliases:` u položek (alternativní přesná
  znění, která se uznávají),
- `keywords:` (kmeny slov — odpověď se uzná, když kmen obsahuje; měnit jen
  s rozmyslem),
- `key:`/`sub:` (technické klíče vyhodnocení — needitovat),
- `SMAZAT` (smazání otázky),
- postup přidání nové otázky (viz níže).

### Přidávání nových otázek

- Nová sekce s nadpisem `### <Titulek> \`NEW\`` — sentinel `NEW` je povinný;
  nadpis bez backticks zůstává chybou (uzavřená gramatika: překlep nesmí tiše
  proměnit editaci v delete+add).
- Import vygeneruje ID `q<n>`: n = max přes existující ID tvaru `/^q(\d+)$/`
  v celém souboru + 1 (první nová otázka v historii = `q1`); víc NEW sekcí
  v jednom souboru dostane po řadě n, n+1, …
- Povinné: `type`, `theme`, `**Zadání:**` + tělo dle typu (stejné validace
  jako u existujících otázek: choice ≥5 možností a ≥1 správná, enumeration
  ≥1 položka, match ≥3 páry). Title z nadpisu, ≤40 znaků.
- Výčtové položky nové otázky: chybějící `key:` se vygeneruje slugem z labelu
  (normalize → pomlčky, kolize v rámci otázky = chyba). U
  `enumeration-paragraph` je `key:` povinný (kanonické číslo paragrafu,
  např. `25b`) — validuje existující paragraph test v `questions.test.ts`.
- U EXISTUJÍCÍCH otázek zůstává chybějící `key:` chybou (jako dnes).

### Zachované vlastnosti

Round-trip test nad celým datasetem, uzavřená gramatika (nerozpoznaný řádek =
chyba), CRLF tolerance, `;`/`|`/newline/backtick guardy serializace, atomický
import (parse → všechny výstupy → teprve zápisy), idempotence
export→import, české chybové hlášky `řádek N: …`.

### Import — regenerace

- `formatQuestionsTs` přestane emitovat `source`.
- `seed.ts`: import regeneruje jediný `LAW_QUESTION_IDS` literál (+ count
  komentář).
- `questions.test.ts`: import přepisuje jen celkový count.
- Jednorázová regenerace `questions.ts` (odstranění source řádků + přeřazení
  scének do `scenky`) proběhne datovou úpravou při implementaci fáze A;
  md v2 formát se poprvé použije až po fázi B.

## Dopady

- Breaking změna formátu review md — starý exportovaný soubor nejde
  importovat (artefakt je jednorázový, gitignored; žádná zpětná kompatibilita
  není potřeba).
- Analytics event `law_answered` mění schéma (bez `source`) — poznamenat
  v CLAUDE.md tabulce eventů.
- CLAUDE.md: datový model bez source, v10 migrace, 10 témat, md v2 formát,
  workflow přidávání otázek.
- `npm run test:all` zelené; počty testů se posunou.

## Mimo rozsah

- Přejmenování stávajících ID (rozbilo by uložený progress hráčů).
- Změny scoringu, pickeru, ostatních modulů (codes, geo).
- Jiná témata než přidání `scenky`.
