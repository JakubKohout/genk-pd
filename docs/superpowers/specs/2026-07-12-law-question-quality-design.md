# Kvalita otázek a UX vstupů v Teorii (/law)

Datum: 2026-07-12
Stav: schváleno uživatelem (návrh), čeká na implementaci

## Problém

Tři třídy problémů v modulu Teorie (`src/modules/law/`):

1. **Primitivní choice otázky.** 85 ze 107 hodnot v `correctIndices` napříč
   datasetem je `0` a `ChoiceInput`
   možnosti nemíchá — správná odpověď je téměř vždy volba č. 1. Distraktory jsou
   často absurdní (poznatelné selským rozumem bez znalosti příručky). Všech 86
   choice otázek je multi-select („Vyber všechny správné odpovědi"), ale drtivá
   většina má právě jednu správnou.
2. **Zmatečné enumerace.** Alias enumerace (LEA) chtějí volným textem vyjmenovat
   až 11 položek, matchují ale jen proti konečnému alias seznamu — věcně správná
   parafráze mimo seznam = „žádná shoda". Uživatel neví, zda je špatně obsah,
   nebo formulace. Text otázka „Přelož rádiové hlášení" vyžaduje strict
   full-string equality volné věty — prakticky netrefitelná.
3. **Příšerné UX vstupů.** Enter v `EnumerationInput` přepíše správně napsanou
   odpověď top suggestionem (porušuje Enter algoritmus z CLAUDE.md Gotcha 17).
   Ordered enumerace jsou textarea s Ctrl+Enter. Match „Divize ↔ volací znaky"
   obsahuje samoprozrazující páry (Air Unit → Air).

Vědomě NEřešíme: přísné hodnocení (žádný partial credit, delta ±2) — zůstává
záměrný edukační design (Gotcha 23). Počet očekávaných položek enumerace se
uživateli NEprozrazuje (rozhodnutí uživatele).

## Řešení

### A. Shuffle choice možností

- Permutace se počítá v `LawPage` (`useMemo` klíčovaný `current.id`,
  Fisher-Yates nad seedovaným RNG z `@/shared/rng`) a předává se jako prop
  `order: number[]` do `ChoiceInput` i do reveal bloku v `LawPage` — obě místa
  musí sdílet tutéž permutaci.
- Klávesy 1–N a `data-testid="law-choice-option-<pozice>"` odpovídají zobrazené
  pozici; interně se ukládají a submitují původní indexy dat. `matchChoice`
  a datový formát `correctIndices` beze změny.
- Seedovaný RNG (localStorage `genk-pd:rng-seed`, E2E pinuje) = deterministické
  pořadí v testech.

### B. Keyword matching pro alias enumerace

- Nové volitelné pole `keywords?: string[]` na `LawExpected` (`law/data/types.ts`).
  Čistě datová změna otázek — storage schéma zůstává v9 (keywords nejdou do
  localStorage).
- `matchEnumerationEntry` zkouší postupně:
  1. přesnou shodu label/alias po `normalize` (dnešní chování — autocomplete
     a přesné odpovědi fungují beze změny),
  2. keyword containment: vstup se uzná, když normalizovaný text obsahuje
     keyword jako celá slova — token-subsequence test
     `` ` ${input} `.includes(` ${keyword} `) `` po normalize obou stran.
     Žádné shody uvnitř slov („lest" nematchne „bolest").
- Keywords se autorují per položka včetně tvarových variant („litoval",
  „lítost"). Pořadí položek v `expected` rozhoduje při teoretickém překryvu —
  ale překryvy hlídá test.
- Nová validace v `questions.test.ts`: v rámci jedné otázky se keyword žádné
  položky nesmí (jako token-subsequence) shodovat s keywordem jiné položky
  (obdoba alias non-collision, Gotcha 44).
- Paragraph matcher (Penal scénky) beze změny — `canonicalAnswerId` zůstává.

### C. UX EnumerationInput

1. **Enter algoritmus dle Gotcha 17:** Enter nejdřív zkusí
   `matchEnumerationEntry` na napsaný text — při shodě commit jedním Enterem.
   Teprve bez shody Enter vyplní zvýrazněnou suggestion (druhý Enter commitne).
   Tab/šipky/Esc beze změny.
2. **Ordered enumerace opouštějí textareu** — používají stejný stacked chip
   input; pořadí odpovědi = pořadí commitů. Během odpovídání jsou chipy
   neutrální (bez correct/wrong stavu — živý feedback by prozradil obsah, ale
   ne pozici). Po „Vyhodnotit otázku" per-pozice ✓/✗ + zobrazení správného
   pořadí. Vyhodnocení položky přes stejný entry matcher (keywords fungují
   i v ordered). `matchOrdered` se přepíše z řádkového porovnání labelů na
   porovnání commitnutých entries.
3. **Statická instrukce pod inputem dle matcheru** (neprozrazuje obsah):
   - paragraph: „Zadávej paragrafy ve formátu §25b — na písmenu subu záleží.
     Uveď všechny, které se na situaci vztahují."
   - alias: „Piš vlastními slovy, každou položku potvrď Enterem. Po vyjmenování
     všeho klikni Vyhodnotit otázku."
   - ordered: navíc „Zadávej položky postupně ve správném pořadí."

### D. Obsahová revize dat (`law/data/questions.ts`)

1. **Revize všech 86 choice otázek:** distraktory přepsat na věrohodné záměny
   (zdroj `docs/sasp-manual.md` — lokální, gitignored; anti-leak pravidlo
   platí, žádné doslovné formulace reálného testu). U vhodných otázek 2+
   správných odpovědí. Triviální otázky (odhad 10–15) sloučit do scénkových
   otázek nebo zrušit.
2. **Keywords** doplnit k alias enumeracím: 17 LEA + 2 SASP (ordered).
3. **`sasp.text.rto.*` „Přelož rádiové hlášení"** převést na choice s věrohodnými
   chybnými překlady. `sasp.text.zasah.felony-code` (Code 5) zůstává text.
4. **`sasp.match.hodnosti.callsigns`:** vyhodit 3 samoprozrazující páry
   (Air Unit → Air, Marine Division → Ocean, Park Rangers → Ranger), zůstává 6.

### E. Testy a dopady

- TDD: matcher (keyword containment, kolizní validace), shuffle remap,
  Enter chování a ordered chip flow dostanou failing testy před implementací.
- `questions.test.ts`: aktualizovat per-source counts po rušení/slučování,
  přidat keyword-collision validaci.
- Rušení/slučování otázek → sync `LAW_QUESTION_IDS` v `e2e/fixtures/seed.ts`
  (Gotcha 43) + oprava E2E specs spoléhajících na pozice choice možností
  (shuffle je s pinnutým seedem deterministický, ale pořadí se změní).
- `LawPage.test.tsx` odvozuje saturaci z `LAW_QUESTIONS` automaticky.
- Storage schéma v9 beze změny, scoring beze změny.
- Cíl: `npm run test:all` zelené (počty testů se posunou dle zrušených otázek).

## Mimo rozsah

- Partial credit / změna delty skóre.
- Prozrazování počtu očekávaných položek (i jako hard-mode default).
- Fuzzy similarity matching.
- Hard mode pro enumerace (existující hard mode zůstává jen u text otázek).
