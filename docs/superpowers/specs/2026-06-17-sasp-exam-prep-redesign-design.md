# Sjednocený studijní modul „Teorie" (LEA + Penal scénky + Příručka) + SASP redesign

**Datum:** 2026-06-17 (rev. 2026-06-18)
**Slučuje:** `src/modules/laws/lea/`, `src/modules/laws/penal/` (jen scénky),
`src/modules/sasp/` → nový `src/modules/law/` (route `/law`, nav „Teorie").
**Zůstává samostatně:** Penal Code **recall** (`/penal/recall`) — vedlejší
blbůstka, do sjednoceného poolu nejde.
**Status:** Návrh, čeká na review specifikace

## 0. OPEN rozhodnutí (potvrdit v review)

1. **Migrace progressu.** Bump schema v6→v7: sloučit `lea` + `penal.scenarios` +
   `sasp` progress do jedné `law` slice keyed by question ID; existující mastery
   zachovat mapováním ID. `penal.recall` slice zůstává samostatná. Codes/Geo beze
   změny.
2. **Scoring multi-choice = all-or-nothing** (přesná shoda množiny).
3. **Umístění Penal recall v nav.** Návrh: ponechat jako malý sekundární odkaz
   (ne hlavní dlaždice). Route `/penal/recall`.
4. **Reset granularita** v `law` slice: celý pool vs per-kategorie. Návrh: celý
   (+ případně rychlý reset filtrovaného výběru později).

**Rozhodnuto:** modul `law`, route `/law`, nav „Teorie"; Codes a Geo se
neslučují → nav 3 hlavní dlaždice (Codes / Teorie / Geo) + malý odkaz na Penal
recall.

## 1. Kontext a cíle

Teorii dnes testují tři moduly odděleně (LEA výčet, Penal scénky+recall, SASP
choice/text/order). Cíl: sloučit **LEA + Penal scénky + Příručku** do **jednoho
poolu** na **jedné stránce** (`/law`), filtrovatelného dle **kategorie**
(zdroj + téma). Formát odpovědi je **vlastnost otázky** (výčet / text /
multi-choice / match). Penal recall zůstává samostatně. Dílčí cíl: **redesign
SASP obsahu** na anti-leak přípravu ke zkoušce (§7–10).

## 2. Architektura

Jeden modul `src/modules/law/`, jedna stránka `/law`, jeden pool `LAW_QUESTIONS`
ze všech zdrojů (LEA, Penal scénky, SASP). Stránka **dispatchuje render i
matching dle `kind`** (rozšíření dnešního SASP discriminated-union přístupu na
všechny zdroje). Boční panel = dvouúrovňový filtr (zdroj + téma) + progress +
seznam chipů (klik přepne otázku).

Routy: `/law` hlavní; redirecty `/laws`, `/laws/lea`, `/laws/penal`,
`/laws/penal/scenarios`, `/sasp` → `/law`. **`/penal/recall` zůstává**
(přesun dnešní `PenalRecallPage` + recall slice + recall pool beze změny logiky).

## 3. Kategorie (dvouúrovňový filtr)

Každá otázka má `source` + `theme`. Filtr nabízí obě úrovně nezávisle (otázka se
zobrazí, je-li její `source` i `theme` povolené).

**Zdroj (`source`):** `lea` | `penal` | `sasp`  (penal = jen scénky)

**Téma (`theme`)** — sdílená sada napříč zdroji:

| theme | popis | typické zdroje |
|---|---|---|
| `pojmy` | definice, terminologie | sasp, lea, penal |
| `hodnosti` | hodnosti, divize, call-signy | sasp |
| `jednani` | etika, oslovování, badge number | sasp |
| `rto` | rádio, kanály, priority, hlášení | sasp |
| `vybava` | výstroj, zbraně, kamery | sasp |
| `zasah` | traffic stop, felony, pursuit, roadblock, vyjednávání | sasp |
| `zadrzeni` | zadržení, práva, vazba, donucovací prostředky, zkrácené řízení | sasp, lea, penal |
| `kriminalistika` | stopy, důkazy, GSR | sasp |
| `paragrafy` | recall/aplikace konkrétních paragrafů | lea, penal |

(Téma je orientační; finální seznam a přiřazení dolad v review/implementaci.
LEA výčet a Penal scénky spadají primárně pod `paragrafy`, ale mohou nést i
věcné téma jako `zadrzeni`.)

## 4. Formáty odpovědi (`kind`)

Discriminated union, render+match dle `kind`. Scénář je ortogonální příznak.

### 4.1 `choice` — multi-select (ZMĚNA)
- `options: string[]` — **minimálně 5**.
- `correctIndices: number[]` — **1 a více** správných.
- UI: „Vyber všechny správné odpovědi", checkboxy/toggle, klávesy 1–9 togglují,
  jedno „Vyhodnotit".
- Scoring: **all-or-nothing** — zvolená množina === správná množina.
- Reveal: každá možnost označená správně/špatně (zvolená i nezvolená).
- Nahrazuje dnešní single-correct choice (každou rozšířit na 5+ možností; část
  bude mít víc správných).

### 4.2 `text` — plain text
- `answer`, `aliases[]`, volitelně `scenario`. Autocomplete + Hard mode, strict
  match po normalize. (SASP/Penal recall styl.)

### 4.3 `enumeration` — výčtový seznam (sjednocení LEA + Penal scénky + SASP order)
- `expected: { key: string; label: string; aliases?: string[]; subId?: string }[]`
- `ordered?: boolean` — když true, kontroluje se pořadí (SASP rank ladder).
- `matcher: 'alias' | 'paragraph'`:
  - `'alias'` (default) — LEA/SASP, match po normalize proti label/aliases.
  - `'paragraph'` — Penal scénky, reuse `canonicalAnswerId` + validace
    sub-paragrafu (strict, žádný partial credit).
- UI: LEA stackovaný `AnswerList` (correct/wrong/duplicate/missed) + autocomplete
  + „Zapomněl jsi:" divider při revealu. Pro `matcher:'paragraph'` autocomplete
  z `suggestParagraphs`, jinak z položek otázky.
- Scoring: perfect = všechny `expected` nalezené, žádná wrong/duplicate.
- Pokrývá: LEA recall (vyjmenuj položky §), Penal scénky (vyjmenuj aplikovatelné
  paragrafy), SASP order (`ordered:true`).

### 4.4 `match` — klik-párování (zachováno)
- `leftLabel`, `rightLabel`, `pairs: { left, right }[]`. Klik-párování, pravý
  sloupec deterministicky zamíchán (hash z `id`), all-or-nothing. `checkMatch`,
  testids `law-match-*`, komponenta `MatchInput`. Pravé hodnoty unikátní.

### 4.5 Scénář — příznak
`scenario?: string` na choice/text otázce → stylovaný „Situace:" box nad
promptem. Ne nový `kind`.

## 5. Datový model

```ts
export type LawSource = 'lea' | 'penal' | 'sasp';
export type LawTheme =
  | 'pojmy' | 'hodnosti' | 'jednani' | 'rto' | 'vybava'
  | 'zasah' | 'zadrzeni' | 'kriminalistika' | 'paragrafy';

interface LawBase {
  id: string;            // <source>.<...> (zachovat existující ID prefixy)
  source: LawSource;
  theme: LawTheme;
  prompt: string;
  ref?: string;          // §ref pro LEA/Penal
  note?: string;
  scenario?: string;
}

export interface LawChoice extends LawBase {
  kind: 'choice';
  options: string[];          // >=5
  correctIndices: number[];   // >=1
}
export interface LawText extends LawBase {
  kind: 'text';
  answer: string; aliases: string[];
}
export interface LawEnumeration extends LawBase {
  kind: 'enumeration';
  expected: { key: string; label: string; aliases?: string[]; subId?: string }[];
  ordered?: boolean;
  matcher: 'alias' | 'paragraph';
}
export interface LawMatch extends LawBase {
  kind: 'match';
  leftLabel: string; rightLabel: string;
  pairs: { left: string; right: string }[];
}
export type LawQuestion = LawChoice | LawText | LawEnumeration | LawMatch;
```

**Mapování existujících dat → pool:**
- `LEA_QUESTIONS` → `enumeration` (matcher `'alias'`), source `lea`, theme
  `paragrafy`/věcné. `items` → `expected`. ID prefix `lea.*`.
- `PENAL_SCENARIOS` → `enumeration` (matcher `'paragraph'`), source `penal`,
  theme `paragrafy`. `expected` → expected (key = canonical ID), `scenario` =
  popis scénky, `educationalNote` → note. ID prefix `penal.*` (scénáře).
- `SASP_*` → choice/text/enumeration(order)/match, source `sasp`. ID `sasp.*`.
- `PENAL_RECALL` → **NEjde do poolu** (samostatný `/penal/recall`).

Match sety (SASP) ID: `sasp.match.<topic>.<slug>` (zdroj-prefix zachován).
Scénáře (SASP): `sasp.scenario.<topic>.<n>`.

Data zůstanou v původních souborech; nový `law/data/index.ts` je adaptuje a
sloučí do `LAW_QUESTIONS` (jako dnešní `sasp/data/questions.ts`, jen napříč
zdroji).

## 6. Storage / schema (v6 → v7)

```ts
law: {
  progress: { [questionId]: { score: -2..+2, lastAskedAtTurn } },
  turn: number,
  settings: {
    sourceFilter: { lea: bool, penal: bool, sasp: bool },
    themeFilter: { [theme]: bool }   // 9 témat
  }
}
penal: { recall: { progress: {...}, turn } }   // ZACHOVÁNO (scenarios odebráno)
// codes, geo beze změny
```

Migrace v6→v7: `law.progress` = `lea.progress` ∪ `penal.scenarios.progress` ∪
`sasp.quiz.progress` (ID unikátní napříč zdroji → bezkolizní); `law.turn` =
součet; `penal.recall` ponecháno. Filtry default vše true. Lenient read dopočítá
chybějící. Scoring beze změny (-2..+2, delta ±2, mastered +2).

## 7. Anti-leak pravidla (SASP příprava ke zkoušce)

Platí pro autoring SASP otázek:

1. Žádná doslovná formulace ze zkouškových otázek.
2. Žádné konkrétní detaily ze zkoušky (zakázáno: Hawick Ave, Elgin Ave, banka
   jako orientační bod, pláž Vespucci, „modrý sedan", 120 mph, Sgt Daniel
   Dallas, V-10, V-23, řetězec `V-23 10-6 10-1 7`). Vlastní vymyšlené detaily.
3. Žádné 1:1 mapování — mix formátů, rozložení/sloučení témat.
4. Jiný úhel dotazu.
5. Pokrýt znalost, ne framing.

Coverage matice (§9) je kontrolní seznam.

## 8. Rozsah pokrytí (SASP)

**Pokrýváme** (SASP doména + procedurální/legal obsah z manuálu): terms, ranks,
conduct, radio, equipment, procedures (traffic stop, felony, pursuit, PIT,
roadblock, vyjednávání + právní postupy z manuálu: zadržení 4P, zkrácené řízení
§40, použití zbraně §23, poučení §11, vazba, cely §15, odebrání zbraně §18,
vstup do obydlí §20, prohledání vozidla §21, předvedení), criminalistics.

> CLAUDE.md pravidlo „SASP vynechává právní postupy LEA/Penal" se pro obsah z
> manuálu ruší. Po sjednocení překryv řeší filtr.

**Cross-modul / mimo rozsah:**
- 10-kódy → Codes (v SASP jen čtení callu s jinými kódy).
- Řidičák na skupinu (#19), obnova ŘP po DUI (#26) → Penal/LEA.
- Zbrojní průkaz (#18) → v poolu `lea.zbrojni-prukaz`; v SASP jen odebrání
  zbraně §18.
- První pomoc/pneumotorax (#5) → EMS, není v manuálu, vynecháno (vědomě).

## 9. Zkoušková coverage matice (26 otázek)

| # | Téma | theme | Formát | Anti-leak |
|---|---|---|---|---|
| 1 | hlášení po zastavení 10-11 | zasah | scenario+choice | jiná ulice/vozidlo |
| 2 | kdy nechat vystoupit z vozidla | zasah | choice | úhel „začnou vystupovat → 10-32" |
| 3 | hlášení při pursuitu | zasah | scenario | jiná rychlost/lokace |
| 4 | kdy/proč Code 5 | zasah | choice | rozděleno kdy/proč |
| 5 | první pomoc pneumotorax | — | mimo rozsah | není v manuálu |
| 6 | bez dokladů, totožnost | zadrzeni | scenario | §12, jiný kontext |
| 7 | po PIT/10-50, suspecti | zasah | choice | BOX: vytáhnout |
| 8 | zahájení patroly | rto | scenario | jiná hodnost/lokace |
| 9 | 10-50 + EMS/FD/TEU | zasah | scenario | jiné detaily |
| 10 | kde zastavit PD vozem | zasah | choice | re-angle: bezpečnostní důvod |
| 11 | priorita vyjednavače/velitele | zasah | choice | život rukojmích |
| 12 | zásady roadblocku | zasah | choice | pruh/nehýbat |
| 13 | 10-11 + shots fired + 10-99A | zasah | scenario | priority eskalace |
| 14 | dekódovat rádiový call | rto | scenario(text) | jiné kódy; překryv Codes |
| 15 | BN kolegy v CPZ | jednani | scenario | jiný dotaz |
| 16 | výbava vozu | vybava | choice (multi) | reframe „co patří do výbavy" |
| 17 | nejvyšší hodnost na místě | hodnosti | scenario | jiná sestava |
| 18 | odebrání zbrojního průkazu | zadrzeni | choice | §18 odebrání zbraně |
| 19 | odebraný ŘP na skupinu | — | cross-modul | LEA pool |
| 20 | proč roadblock | zasah | choice | účel |
| 21 | kdo hlásí pozici v pursuitu | zasah | (v #3) | role secondary |
| 22 | žádost o PIT + podmínky | zasah | scenario | jiná rychlost |
| 23 | PIT zamítnut → opakovat? | zasah | choice | reword |
| 24 | prokázání totožnosti + důvod | pojmy/zadrzeni | choice | ŘP/ID + §12 |
| 25 | kdy nelze zkrácené řízení | zadrzeni | choice | §40 >20 let |
| 26 | DUI → obnova ŘP | partial | cross-modul | Penal |

## 10. SASP inventář otázek (po tématech)

Zdroj: `R` reuse, `RW` reword/re-angle (anti-leak), `N` nový. Choice musí mít
**≥5 možností** (kde dává smysl, víc správných). Konkrétní options/aliasy dotvoří
implementace.

### pojmy (~6, choice)
- `RW` loupež vs krádež (opravit výplň, na 5 možností) — §9
- `R` prokázání příslušnosti §10
- `R` definice trestného činu §11/§3
- `N` trestný čin vs přestupek §3
- `N` zadržení vs zatčení
- `N` trestní odpovědnost: od 14 let, příčetnost §3
- ❌ smazat „příklad loupeže" (junk)

### hodnosti (~5)
- `N match sasp.match.ranks.callsigns` — divize↔call-sign (SWAT David, DBI
  William, Canine Charlie, GIU George, TEU Sierra, Marine Ocean, Air Air,
  Motorbike Marry, Park Rangers Ranger; 9 párů)
- `R` která hodnost je Staff (Captain)
- `R enumeration(ordered) sasp.recall.ranks.ladder` — žebříček hodností
- `N scenario` sestava hodností na místě, kdo velí (zk. #17)
- ❌ smazat „nejnižší hodnost" (pokryto žebříčkem)

### jednani (~6, choice + 1 scenario)
- `R` badge number civilistovi
- `R` k čemu civilista BN (stížnost)
- `N scenario` dotaz na BN kolegy (zk. #15)
- `R` povinnost zasáhnout
- `R` pořadová příprava: zaklepat
- `R` zdravit nejvyšší hodnost

### rto (~7)
- `N match sasp.match.radio.channels` — kanál↔účel (F1, F4/F5, F6, F7, F8, F9,
  F10; 7 párů)
- `N match sasp.match.radio.priorities` — priorita↔reakce(+Code): P1 všechny
  dostupné/Code 3; P2 v okolí/Code 3; P3 vhodný počet/Code 2; P4 jedna jednotka
- `RW` patrola dvou detektivů = Henry (odlišit od dvojice)
- `RW` běžná hlídka ve dvojici = Adam + číslo
- `R` po příchodu Tom-1, 10-8
- `N scenario` zahájení patroly (zk. #8)
- `N scenario(text)` dekódovat call (zk. #14, jiné kódy)

### vybava (~14, choice)
- `R` taser dosah 10 m · `R` „taser taser taser" · `R` ne na těhotné · `R`
  obušek nohy/ruce · `R` „shots fired" + poloha · `R` preferovat taser/obušek ·
  `R` Panic A (10-99) · `R` Panic B (nehoda) · `R` bodycam nepřetržitě · `R`
  dashcam nejde vypnout · `R` Tint Meter (SGT/TEU) · `R` odmítnutí krev. testu =
  požil · `R` tester nestačí, nutný krevní test · `N` výbava PD vozu — co
  (ne)patří (zk. #16, multi-choice)

### zasah (~26: traffic/felony/pursuit/roadblock/vyjednávání)
Traffic stop: `R` nesdělovat přestupek na začátku; `RW` bezpečnostní důvod úhlu
(#10); `R` vystoupí→návrat; `N` začnou vystupovat→10-32 (#2); `R`
nesouhlas→zadržet; `R` 14 dní; `R` ukončení Code 4/10-98; `N scenario` hlášení
po zastavení (#1); `N` fotka z radaru až na stanici; `N scenario` bez dokladů (#6).
Felony: `R` min jednotek; `R` kdy felony; `RW enumeration(ordered)` pořadí
vystupování osob (z dnešní order otázky); `N` postup (klíčky z okna/360°/zády za
hlasem); `N` kufr s asistencí; `N` nezastaví dobrovolně→vytáhnout (#7); `R text`
Code 5.
Pursuit/PIT: `RW` role secondary (pozice/směr/…); `RW` PIT od SGT (přepsat note);
`N` PIT zamítnut→žádat znovu (#23); `N scenario` žádost o PIT (#22); `N` PIT
podmínky; `R` max 2 spikes; `N` předjíždění (výjimka); `N scenario` pursuit
hlášení (#3).
Roadblock/breach/perimetr: `R` perimetr úhlopříčky; `N` roadblock zásady (#12);
`N` proč roadblock (#20); `R` breach 3× volání; `N` breach 2 jednotky opačné
strany.
Vyjednávání: `R` výkupné 2000/SGT+; `R` velitel nepřistupuje na nesmysly; `N`
priorita = život rukojmích (#11); `N` vyjednavač skrytý, nikdy zády; `R` BOX
samovolně→Code 5; `N scenario` shots fired + 10-99A (#13); `N scenario` 10-50
koordinace (#9).

### zadrzeni (~12, právní postupy z manuálu)
`N` zadržení 4P max 3 h; `N` do 3 h se nezapočítává právník/soud; `N` kdy NELZE
zkrácené řízení (>20 let, #25); `N` instance SOS→SZ→státní→vrchní soud; `N`
poučení §11 (právo nevypovídat); `N` poučení musí být na bodycam jinak nelze
použít; `N` použití zbraně §23; `N` donucovací prostředky §21 (výzva, upuštění);
`N` vazba 48 h; `N` cely §15 oddělení; `N` odebrání zbraně §18 + vrátit do 24 h
(#18); `N` předvedení max 1 h.

### kriminalistika (~12)
- `N match sasp.match.criminalistics.traces` — druh stopy↔co identifikuje (6 párů)
- `R` přímý balistický důkaz · `R` pozitivní GSR · `N` GSR blízkost 2 m/5 m · `R`
  stopa vs důkaz · `R` neodkladné úkony · `R` zánik stop · `R` relevantní
  události · `N` přímý vs nepřímý důkaz · `N` DNA databáze (násilné) · `N`
  biologické stopy: rukavice, sterilní nádoby

## 11. Engineering / soubory

**Nový modul `src/modules/law/`:**
- `data/types.ts` — `LawQuestion` union (§5), `LawSource`, `LawTheme`
- `data/index.ts` — adaptéry LEA/Penal scénky/SASP dat → `LAW_QUESTIONS`
- `data/sasp/` — match sety, scénáře, choice/text/enumeration (SASP autoring)
- `logic/` — `checkMatch`, `matchChoice` (množinová shoda), reuse LEA
  `matchAnswer`/`suggestItems`, Penal `matchScenarioAnswer`/`canonicalAnswerId`/
  `suggestParagraphs`, SASP `matchText`/`matchOrder`
- `state/` — `useLawProgress` (jedna slice), `useLawSettings` (source+theme
  filtr), `selection.ts` (`pickNextQuestion`, filtr source∧theme∧score<2)
- `components/` — `LawPage` (dispatch dle kind), `ChoiceInput` (multi-select),
  `EnumerationInput` (reuse LEA AnswerList/AnswerInput + `matcher` switch),
  `TextInput`, `MatchInput`, `ScenarioBox`, `LawSidePanel` (dvouúrovňový filtr),
  `LawMobilePanel`, `LawResetButton`

**Penal recall — ponecháno:** přesun `PenalRecallPage` + recall pool + recall
slice na route `/penal/recall` (standalone). Logika beze změny.

**Změny mimo modul:**
- `app/routes.tsx` — `/law`; `/penal/recall`; redirecty starých law/sasp rout
- `app/HomePage.tsx`, `AppLayout` — 3 dlaždice (Codes/Teorie/Geo) + odkaz na
  Penal recall
- `shared/storage.ts` — schema v7 + migrace v6→v7 (§6)
- `shared/analytics.ts` — sjednotit law/penal/sasp tracking na `law_answered`
  `{ source, kind, success, question_id }`; recall ponechá vlastní event;
  `progress_reset` module `'law'`
- `CLAUDE.md` — přepsat sekce, datový model, gotchy, počty
- `e2e/fixtures/seed.ts` — `law` slice + `penal.recall`; sjednotit ID seznamy;
  `pinNextLawQuestion`

**Smazat po migraci:** osamocené `laws/lea`, `laws/penal` (scénky) komponenty/
routy. Geo, Codes beze změny.

## 12. Fázování (dekompozice)

1. **Engine + sjednocení (bez nového obsahu).** `law/` modul, union typy,
   adaptéry existujících dat (LEA + Penal scénky + SASP), `LawPage` s dispatchem
   (multi-choice render; staré single-correct dočasně jako 1-prvkové
   `correctIndices`), filtr, schema v7 + migrace, redirecty, Penal recall
   standalone, analytics. Cíl: funkční `/law` s dnešním obsahem + `/penal/recall`.
2. **Multi-choice obsah.** SASP choice na ≥5 možností, označit vícenásobně správné.
3. **SASP redesign obsahu.** Dedup, match sety, scénáře, legal/procedurální
   otázky, anti-leak rewrite dle §9–10.
4. **Úklid.** Smazat osamocené staré komponenty/routy, CLAUDE.md, počty testů.

## 13. Test plán (TDD)

- `law/data/*.test.ts`: union counts, unikátní ID napříč zdroji, valid
  source/theme, choice ≥5 options + ≥1 correctIndex, enumeration expected
  neprázdné + valid matcher, match unikátní levé/pravé, scénář neprázdný.
- `law/logic/*.test.ts`: `matchChoice` (množinová shoda), `checkMatch`, přesunuté
  testy LEA/Penal/SASP matcherů.
- `storage.test.ts`: migrace v6→v7 (union progress, turn součet, `penal.recall`
  zachováno, lenient).
- `LawPage.test.tsx`: render všech 4 kindů + scénář; multi-select toggle +
  scoring; filtr; klik na chip.
- E2E `e2e/law/*.spec.ts`: flow per kind, filtr, persistence, redirecty starých
  rout. `e2e/penal/recall.spec.ts` ponechat. Sloučit/přepsat staré specy.
- `npm run test:all` zelené; aktualizovat počty v CLAUDE.md.

## 14. Mimo rozsah / budoucí

- Codes (10-kódy) a Geo (mapa) se neslučují.
- Penal **recall** zůstává samostatně (`/penal/recall`), mimo sjednocený pool.
- Cross-modul legal mimo manuál (obnova ŘP) — případně doplnit jako `penal`/`lea`
  otázky později.
- První pomoc / EMS obsah — vědomě vynecháno.
- Refaktor sdílených primitivů do `shared/quiz/` proběhne přirozeně při
  sjednocení.
