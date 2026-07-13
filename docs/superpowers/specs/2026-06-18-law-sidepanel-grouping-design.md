# Spec: Seskupený LawSidePanel + krátké titulky otázek

Datum: 2026-06-18
Branch: `quiz-refactor`
Status: schváleno k implementaci

## Problém

Postranní panel na `/law` (`LawSidePanel`) renderuje **plochý seznam jednoho chipu
na otázku**. Při zapnutí více filtrů (zdroje + témata) je v poolu až ~139 otázek
(17 LEA + 28 Penal + 94 SASP) → seznam je extrémně dlouhý a nepřehledný.

Dva dílčí problémy:

1. **Délka seznamu** — 139 plochých chipů bez struktury.
2. **Dlouhé a nerozlišitelné labely** — chip ukazuje celý `prompt` (dlouhá věta).
   Penal scénky mají navíc VŠECHNY identický prompt (`Které paragrafy se na situaci
   vztahují?`), takže 28 chipů by bylo vizuálně stejných.

Panel slouží uživateli ke dvěma věcem (obě musí řešení zachovat):
- **Přehled progressu** (kolik mám zvládnuto).
- **Jump-to** (klik na chip přepne kvíz na danou otázku).

## Řešení (přehled)

Dvě nezávislé změny:

- **A) Seskupení chipů podle tématu** do rozbalovacích skupin (collapsible).
- **B) Krátký titulek otázky** (`title`) místo plného promptu v chipu.

Filtry (3 zdroje + 9 témat) zůstávají nahoře **beze změny** — řídí co se kvíz ptá
(pool). Skupiny dole = navigace + progress. Dvě různé funkce.

---

## A) Seskupení podle tématu

### Struktura panelu (shora dolů)

```
┌─ PŘEHLED ZÁKONŮ ─────────────────┐
│ Splněno                    43 %  │  ← ProgressHeader (beze změny)
│ ███████░░░░░░░░░░░                │
│                                  │
│ Zdroje:  [✓ LEA] [✓ Penal] [✓ SASP]   ← source fieldset (beze změny)
│ Témata:  [✓ Pojmy] [✓ Hodnosti] …      ← theme fieldset (beze změny)
│ ───────────────────────────────  │
│ ▸ Pojmy             8/15  ▓▓▓░░   │  ← skupina = řádek (header), klik rozbalí
│ ▾ Paragrafy        12/40  ▓▓░░░   │
│     ᴸ Prokázání příslušnosti  ✓  │  ← chipy uvnitř, source badge + title
│     ᴾ Krádež vozidla             │
│     ˢ Loupež vs krádež           │
│ ▸ Zásah             3/9   ▓░░░░   │
│ ▸ Zadržení          0/6   ░░░░░   │
│ …                                │
└──────────────────────────────────┘
```

### Skupiny

- Skupina = jedno **téma** (`LawTheme`), pořadí dle `LAW_THEME_KEYS`.
- Renderují se jen témata, která **projdou filtrem** (source+theme) **a mají ≥1 položku**.
  (Téma vypnuté v theme filtru se nezobrazí vůbec — žádná prázdná skupina.)
- **Header skupiny** (klikatelný řádek):
  - caret `▸`/`▾` (sbaleno/rozbaleno),
  - název tématu (`THEME_LABEL`),
  - `zvládnuto/celkem` (počet chipů se `score >= 2` / počet chipů ve skupině),
  - mini progress bar daného tématu (stejný vzorec pct jako globální:
    `Σ min(2, max(0, score)) / (2·N)` přes chipy skupiny).
  - `data-testid="law-group-<theme>"`, na baru `law-group-<theme>-bar`.

### Rozbalení (collapse)

- **Default sbalené.** Automaticky se rozbalí jen skupina obsahující právě aktivní
  otázku (`currentId`); ten chip se zvýrazní (stávající `isCurrent` ring).
- Stav rozbalení = **per-session** (`useState<Set<LawTheme>>` v `LawSidePanel`),
  nepersistuje (YAGNI, stejně jako Hard mode toggle — Gotcha 27).
- Klik na header přepíná membership tématu v Setu.
- Při změně `currentId` se do Setu doplní téma aktivní otázky (efekt nebo derivace),
  aby jump-to z jiného místa otevřel správnou skupinu.

### Chip (uvnitř rozbalené skupiny)

- Theme badge (`THEME_ABBR`, dnes `PAR/POJ…`) **zmizí** — je redundantní, skupina
  už téma určuje.
- Místo něj **malá značka zdroje** (1 znak: `L`/`P`/`S` pro LEA/Penal/SASP),
  aby šlo uvnitř tématu rozlišit původ. `text-sasp-ink-dim`, mono, `w-3`.
- Zbytek beze změny: `label` (nově = `title`, viz B), `✓` když `done`,
  `onSelect` jump-to, `data-testid="chip-<id>"`, `data-score`, `data-done`,
  `title={label}` (HTML tooltip), `aria-current`.

### Mobile (`LawMobilePanel`)

- Beze změny obalu (`<details>` summary s `law-mobile-progress-percent`).
- Uvnitř renderuje stejný `LawSidePanel`, takže seskupení dostane zdarma.
- `handleSelect` (zavře details + onSelect) zůstává.

---

## B) Krátký titulek (`title`)

### Datový model

- Přidat `title?: string` do `LawBase` (`src/modules/law/data/types.ts`).
  Optional — fallback na `prompt`, kdyby chyběl.
- `LawPanelItem.label` (v `LawPage.panelItems()`) se naplní `question.title ?? question.prompt`.

### Zdroje titulků (autorování)

| Zdroj | Počet | Odkud titulek |
|---|---|---|
| **LEA** | 17 | **`q.description`** už existuje (např. „Prokázání příslušnosti"). `adaptLea` nastaví `title: q.description`. Žádné nové autorování. |
| **Penal** | 28 | Nové krátké `title` v `PENAL_SCENARIOS` (`laws/penal/data/scenarios.ts`), 2–4 slova shrnující scénku (např. „Krádež vozidla"). `adaptPenal` propíše `title: s.title`. |
| **SASP** | 94 | Nové krátké `title` přímo v `data/sasp/{choice,text,enumeration,match}.ts`. |

> Pozn.: LEA `description` se dnes mapuje na `note` v `adaptLea`. Nově se použije
> i jako `title` (note zůstává). Penal scénka potřebuje NOVÉ pole `title` v datech
> (scénka má jen dlouhý `prompt` + `ref` jako „A1").

### Anti-leak (Penal/SASP)

- Penal titulek **nesmí prozradit odpověď** (paragrafy). „Krádež vozidla" je OK,
  „§25 + §27" NE.
- SASP titulky drží anti-leak pravidlo modulu — nepřebírat formulace z reálného testu.

---

## Dotčené soubory

- `src/modules/law/data/types.ts` — `title?: string` do `LawBase`.
- `src/modules/law/data/adaptLea.ts` — `title: q.description`.
- `src/modules/law/data/adaptPenal.ts` — `title: s.title`.
- `src/modules/laws/penal/data/types.ts` + `scenarios.ts` — `title` na `PenalScenario` (28×).
- `src/modules/law/data/sasp/{choice,text,enumeration,match}.ts` — `title` (94×).
- `src/modules/law/components/LawSidePanel.tsx` — groupování + collapse + chip render.
- `src/modules/law/components/LawMobilePanel.tsx` — beze změny logiky (dědí přes LawSidePanel).
- `src/modules/law/components/LawPage.tsx` — `panelItems()`: `label = title ?? prompt`,
  navíc `LawPanelItem` může nést `title` přímo (rozhodnout při implementaci).
- `src/modules/law/data/sasp/sasp.test.ts` — validace, že každá SASP otázka má `title`.
- `src/modules/law/components/LawSidePanel.test.tsx` — testy skupin (headery,
  collapse/expand, `chip-<id>` testidy stále nalezitelné, auto-expand aktivní skupiny).

## Testy

- **Unit/component** (`LawSidePanel.test.tsx`):
  - render skupin jen pro filtrem-povolená neprázdná témata,
  - header ukazuje `zvládnuto/celkem` + bar s korektním pct,
  - default sbaleno; skupina s `currentId` rozbalena; klik na header přepíná,
  - chip uvnitř má `chip-<id>`, source badge, title, `data-done`,
  - jump-to (`onSelect`) funguje z rozbaleného chipu.
- **`sasp.test.ts`** — každá SASP otázka má neprázdný `title`.
- **Existující E2E** (`e2e/law/*`) — `chip-<id>` selektory musí dál fungovat;
  pokud E2E klikají na chip, který je default sbalený, spec předpokládá buď
  (a) auto-expand skupiny s aktivní otázkou stačí, nebo (b) E2E nejdřív rozbalí
  skupinu. Rozhodnout při implementaci dle konkrétních speců.
- `npm run test:all` musí zůstat zelené (aktuálně 413 unit/component + 64 E2E).

## Mimo scope

- Persistence stavu rozbalení (session-only stačí).
- Změna filtrů, scoringu, pickeru, datového flow kvízu.
- Seskupení podle zdroje nebo vnořené source›téma (zvoleno: jen podle tématu).
- Virtualizace / hledání v panelu.
