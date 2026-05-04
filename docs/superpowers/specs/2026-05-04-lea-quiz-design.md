# LEA Quiz — Design Spec

**Datum:** 2026-05-04
**Stav:** k revizi
**Modul:** `src/modules/laws/lea/`

## 1. Cíl

Přidat do edukativní appky modul **kvíz nad zákonem Law Enforcement Act (006-19)**.
Učitý formát: výčtové otázky typu *„Vyjmenuj…"* a *„Kdy má příslušník pravomoc…"* nad
číselnými výčty v paragrafech.

Uživatel zadává volný text, který se mapuje proti seznamu předdefinovaných položek
(včetně aliasů a hovorových forem). Pomocí autocomplete může napovědět celé znění z
zákona. Po odeslání otázky vidí, na co zapomněl.

## 2. Rozsah MVP

- **Modul:** `laws/lea` jako první ze tří plánovaných (Penal Code, Firearm Act jindy).
- **Architektonický status:** modul stojí samostatně, **bez** zatím vytahovaného shared
  layeru pro „law quiz engine". Hranice dáme tak, aby se shared layer dal vytáhnout,
  až bude druhý zákon konkrétní (princip „abstrakce po druhém případu").
- **Otázky:** 15 paragrafů z LEA (§7, §9 A, §9 B, §10, §11, §12 A, §12 C, §15, §16 B,
  §17 A, §18 A, §19 A, §21 A, §23 B, §37) → **89 položek**, **~470 aliasů**.
  Surovinu má `docs/lea-quiz-questions-draft.md` (po implementaci převést do TS).
- **Formát:** **jeden mód** (free-text + chip + autocomplete). Žádné druhé „mode-choose"
  jako u kódů.
- **Out of scope (zatím):** Penal Code, Firearm Act, importance filter (LEA otázky
  nemají rozumnou kategorizaci důležitosti), randomizace pořadí položek v reveal,
  multimedia (obrázky paragrafů), spaced-repetition algoritmus odlišný od kódů.

## 3. Datový model

### 3.1 Statická data otázek

```ts
// src/modules/laws/lea/data/questions.ts
export interface AnswerItem {
  id: string;        // "lea.16.B.3b"
  quote: string;     // plné zákonné znění; zobrazeno v chipu i autocomplete
  aliases: string[]; // formy přijímané jako match (po normalize)
  ref: string;       // "§16 B 3b"
}

export interface Question {
  id: string;        // "lea.16.B"
  prompt: string;    // "Vyjmenuj způsoby, jakými…"
  ref: string;       // "§16 B"
  items: AnswerItem[];
}

export const LEA_QUESTIONS: Question[] = [ ... ]; // 15 položek
```

**Normalizace** (sdílená pomocná funkce v `src/shared/text/normalize.ts`):
- `lowercase`
- strip diacritics (`NFD` + remove combining marks; `[u0300-u036f]/g`)
- collapse internal whitespace na single space
- trim

`aliases` v TS souboru pišeme **canonical** (s diakritikou, malými písmeny). Normalizace
běží runtime, ne build-time — držíme zdroj čitelný a aliasy rozšiřitelné.

### 3.2 Persistence (localStorage)

Rozšířit existující schéma `genk-pd:v1` (klíč v `src/shared/storage.ts`) o slice `lea`:

```ts
{
  schemaVersion: 2,                       // bumpneme z 1 → 2 kvůli nové sliceové struktuře
  codes: { ... },                          // beze změny
  lea: {
    progress: {
      [questionId]: { score: -3..+3, lastAskedAtTurn: number }
    },
    turn: number
  }
}
```

**Migrace `1 → 2`:** chybějící `lea` doplníme defaultem (`{ progress: {}, turn: 0 }`).
Žádné destructive změny v existujícím `codes` slice. Migrace v `storage.ts` při loadu.

LEA neaplikuje importance filter, takže žádný `settings.lea` nepotřebuje.

## 4. Algoritmy

### 4.1 Matching (chip → barva)

```
match(input, items):
  norm(input) → str
  for item in items:
    if norm(item.quote) === str OR str ∈ map(norm, item.aliases):
      return item
  return null
```

- **Zelený chip:** `match` vrátil item, který ještě nemá zelený chip.
- **Oranžový chip:** `match` vrátil item, který už zelený chip má (duplicita).
- **Červený chip:** `match` vrátil `null`.

Žádný Levenshtein, žádné prefix/suffix matching, žádná morfologie. Aliasy se píšou
generously (česká inflexe + hovorová synonyma).

### 4.2 pickNextQuestion

Stejný princip jako `pickNextCode` v kódech:

1. Eligible = otázky se skóre `< 3`.
2. Cooldown: `turn - lastAskedAtTurn >= 2`. Pokud by cooldown vyprázdnil pool, ruší se.
3. Vážený výběr: `weight = 4 - score`.

Sdílíme implementaci z kódů (`src/shared/quiz/pickNext.ts`) — extrahujeme z
`modules/codes/state/selection.ts` v rámci tohoto úkolu, protože je 100% reusable.

### 4.3 Autocomplete (návrhář)

```
suggest(input, items, foundIds):
  if input.length < 4: return []
  norm(input) → str
  candidates = items where id ∉ foundIds
  return candidates filter (item.quote OR any alias) contains str (substring match po normalize)
  sort by: position of match (earlier = better), then quote.length (kratší = lépe)
  cap at 5 návrhů
```

- **Min length:** 4 znaky (doladíme později; v UI bude konstanta `AUTOCOMPLETE_MIN_LENGTH`).
- **Filtr:** položky, které už mají zelený chip, se ze sugestcí vyřazují (uživatel je
  vidí v chip listě, takže to neporušuje pravidlo „musíš si pamatovat kolik jich je").
- **Confirmation:** Tab nebo ↓+Enter převezme zvýrazněnou nabídku, klik myší taky funguje.
  Esc nabídku zruší.
- **Zobrazení nabídky:** plný `quote` jako primární text. Pod ním ztlumeně `ref`.

### 4.4 Skóre (per-question)

Při submitu:
- **Perfect** (všechny found, žádné red, žádné orange) → `score += 2`, clamp na +3.
- **Imperfect** → `score -= 2`, clamp na -3.

Mastered (vypadne z poolu) na `score === 3`. Reset (z congrats banneru) maže `progress`
+ `turn`, zachovává `schemaVersion` a `codes` slice.

## 5. Routing a navigace

- `/laws` (existuje placeholder) → **rozcestník** s tlačítky pro zákony.
  - LEA: aktivní (vede na `/laws/lea`).
  - Penal Code, Firearm Act: vizuálně přítomné, ale `disabled` / `aria-disabled`.
- `/laws/lea` → `LeaQuizPage` (analogicky `CodesPage`).
- Side panel (desktop) / collapsible details (mobile) ukazuje **stejnou progress
  strukturu** jako kódy: progress bar + chips otázek (ID = paragraf, hover = prompt).

V `routes.tsx` přidat:

```ts
{ path: 'laws', element: <LawsIndex /> },
{ path: 'laws/lea', element: <LeaQuizPage /> },
```

`<ComingSoonPage title="Zákony" />` zmizí (route nahrazena). `/sasp` zůstává jako placeholder.

## 6. UI/UX

### 6.1 Hlavní layout (`LeaQuizPage`)

- Header: `prompt` (velký), pod ním `ref`.
- Body: vstupní pole + autocomplete dropdown + chip list (chipy nad polem nebo pod ním
  — pravděpodobně nad polem, jako u běžných tag-input UI).
- Sidebar/panel: progress bar, list otázek se skórem (jako codes).
- Footer akce: tlačítka **Odeslat** (primary) a **Vzdát se / Přeskočit** (secondary).

### 6.2 Vstupní pole

- Plain `<input type="text">`, autofocus po každé nové otázce.
- Při psaní zobrazuje autocomplete dropdown (od 4 znaků).
- **Trigger commit chipu:** Enter, čárka (`,`) nebo Tab.
- **Backspace v prázdném inputu:** smaže poslední chip.

### 6.3 Chip

- Zobrazuje **plný `quote`** (bude se wrapovat na multi-line, max-width na pole).
- Levá ikona barvy (✓ / ! / ✗) reflektuje stav.
- Pravá `×` ikona pro remove.
- Hover/focus → tooltip s `ref` (a u zelených/oranžových samozřejmě i celý quote, ale
  ten už se zobrazuje v chipu samotném).

### 6.4 Submit flow

1. Tlačítko **Odeslat** je vždy aktivní (i s 0 chipy).
2. Po kliknutí:
   - Zaznamenáme skóre podle 4.4.
   - Zamkneme input (read-only) a chip list.
   - Pod chipy ukážeme **reveal panel:**
     - ✓ Nalezeno (N): list zelených chipů, jen pro připomenutí.
     - ✗ Chybělo (N): list nenalezených itemů s `quote` + `ref`.
     - ✗ Špatně (N): list červených chipů (text, který uživatel napsal, + label „Žádná
       shoda").
3. Tlačítko **Další otázka** → pickne novou, resetuje stav. Pokud pool prázdný →
   `<CongratsBanner>` (analogicky kódům).

### 6.5 Vzdát se / Přeskočit

- Tlačítko, které otázku **nelítí**, pickne další. Ukáže pouze rozbalený quote +
  ref pro neúspěch (žádná penalizace).
- Důvod: dlouhé otázky (§10 11 položek, §21 13 položek) můžou frustrovat; přeskok
  bez penalizace dává prostor jít dál a vrátit se později. (Cooldown stále platí.)

## 7. Komponenty (soubory)

```
src/
  modules/laws/
    components/
      LawsIndex.tsx              # /laws rozcestník (LEA aktivní, ostatní disabled)
    lea/
      data/
        questions.ts             # LEA_QUESTIONS const
      state/
        useLeaProgress.ts        # useSyncExternalStore over storage.ts (lea slice)
      logic/
        match.ts                 # match(input, items) → AnswerItem | null
        suggest.ts               # suggest(input, items, foundIds) → AnswerItem[]
      components/
        LeaQuizPage.tsx          # routovaná stránka
        AnswerInput.tsx          # input + autocomplete dropdown
        AnswerChip.tsx           # zelený/oranžový/červený chip
        ChipList.tsx             # kontejner pro chipy
        SubmitFooter.tsx         # tlačítka odeslat / vzdát se
        RevealPanel.tsx          # po submitu — found / missed / wrong
        SidePanel.tsx            # progress + question chips (analogie codes)
  shared/
    text/
      normalize.ts               # NFD strip + lowercase + trim
    quiz/
      pickNext.ts                # extrahovaná pickNext logika z codes
```

`modules/codes/state/selection.ts` se refaktoruje: zruší se lokální implementace a
deleguje na `shared/quiz/pickNext.ts` (zachovává API). Žádný behaviorální drift.

## 8. Testy

### 8.1 Unit (Vitest)

- `normalize.test.ts` — strip diakritiky, case, whitespace, edge cases.
- `match.test.ts` — match přes alias, přes quote, žádný match. Diakritika zachována i
  shozená. Whitespace tolerance.
- `suggest.test.ts` — min length, filtr foundIds, sort.
- `pickNext.test.ts` — port existujících `pickNextCode` testů + 1–2 LEA-specific case.
- `useLeaProgress.test.ts` — submit + 2/+2 / -2 update, mastery na +3, cooldown.

### 8.2 Component (Vitest + jsdom + RTL)

- `AnswerInput.test.tsx` — typing, Enter/Comma/Tab commit, Backspace remove last,
  autocomplete trigger od 4 znaků, výběr myší vs Tab.
- `AnswerChip.test.tsx` — render barva, × handler, hover/focus tooltip.
- `RevealPanel.test.tsx` — found/missed/wrong sekce.

### 8.3 E2E (Playwright)

`e2e/laws/lea/*.spec.ts` (analogicky `e2e/codes/`):

- `quiz-flow.spec.ts` — happy path: zobrazí otázku, napíše odpovědi, submit, „další".
- `matching.spec.ts` — alias match, diakritika, duplicita = orange, miss = red.
- `autocomplete.spec.ts` — 3 znaky → nic, 4 znaky → návrh, Tab převezme, filtr foundIds.
- `submit-reveal.spec.ts` — perfect → +2, imperfect → -2, mastery na +3.
- `persistence.spec.ts` — reload zachovává progress, reset maže.
- `responsive.spec.ts` — desktop (sidepanel inline) vs mobile (collapsible).

E2E `seed()` fixture rozšířit o `lea` slice (analogicky k `codes`).

`npm run test:all` zůstává očekávaně zelené po implementaci (počty testů narostou).

## 9. Změny v existujícím kódu

- `src/shared/storage.ts` — schemaVersion 1 → 2, migrate funkce, `lea` slice v
  `initialState`.
- `src/app/routes.tsx` — `/laws` jako `<LawsIndex />`, přidat `/laws/lea`.
- `src/app/AppLayout.tsx` — pokud má top-nav, ozvat tlačítko Zákony bezformálně (zatím
  to už ukazuje placeholder, takže nejspíš jen výměna route handleru, ne navi).
- `src/modules/codes/state/selection.ts` — re-export z `shared/quiz/pickNext.ts`,
  přepsat lokální tělo na delegaci. Existující testy musí projít beze změny.

## 10. Tailwind / CSS

Nové komponenty `AnswerChip` (3 barvy) potřebují třídy. Reusable patterns přidat do
`src/styles/index.css`:

- `.chip-correct` — zelený stav (sasp-green ekv. — `bg-emerald-100 text-emerald-900
  border-emerald-300` nebo přidat `sasp-green` do `tailwind.config.js`).
- `.chip-duplicate` — oranžový (`amber-100 / amber-900`).
- `.chip-wrong` — červený (`rose-100 / rose-900` nebo `sasp-red` adapt).
- `.autocomplete-suggestion` — položka v dropdownu.
- `.autocomplete-suggestion--active` — keyboardní highlight.

Estetika konzistentní s existujícími `.chip` v codes.

## 11. Otevřené body / decisions vědomě odložené

- **Konkrétní vizuální podoba dlouhého chipu** (§16 B 3b je 90+ znaků). Implementačně
  necháme wrap + `max-w-full`, zhodnotíme po prvním renderu. Pokud bude působit moc
  rušivě, doladíme později (truncate + `title` tooltip, nebo limit chipu na 1 řádek
  a expand on click).
- **Jak označit „přeskočil otázku".** Asi neukládáme nic do skóre, jen do `lastAskedAtTurn`,
  aby cooldown držel. Ověříme po implementaci.
- **Sdílený quiz engine.** Až bude druhý zákon, podíváme se, co je skutečně shared
  (matching, suggest, pickNext jistě; UI pravděpodobně taky, ale rozhodneme až podle
  konkrétního Penal Code formátu).

## 12. Migrace dat / preview

Před release otestovat ručně: na fresh `localStorage` načíst novou verzi → migrace
`v1 → v2` proběhne; `progress` v kódech zůstává; `lea.progress` je prázdné. Otestovat
i případ „existující v1 storage bez `lea` klíče" → migrace doplní defaulty.

## 13. Akcept criteria

- [ ] `npm run test:all` zelené (codes 43 + nové LEA testy + 20 E2E + nové LEA E2E).
- [ ] Z `/laws` lze proklik na LEA, zpětně zpět.
- [ ] Otázka §16 B s odpovědí „majákem", „výstražné světlo", „varovný výstřel",
      „gestem", „ústně" → zelené chipy, submit perfect, skóre +2.
- [ ] Otázka §16 B s odpovědí „majákem", „blbost", „gestem" → 2 zelené + 1 červený,
      submit imperfect, skóre -2, reveal ukazuje 3 missed + 1 wrong.
- [ ] Reset z congrats banneru maže LEA progress, zachovává codes progress a settings.
- [ ] Reload prohlížeče zachovává LEA progress.

---

**Příští krok:** Po schválení tohoto specu invokovat skill `writing-plans` na detailní
implementační plán.
