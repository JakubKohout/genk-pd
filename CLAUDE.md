# CLAUDE.md

Pracovní paměť pro budoucí seance. Stručně a věcně.

## Co to je

Edukativní webová aplikace pro PD (Police Department) na serveru `genk.cz`. Aktuálně
implementovaný jediný modul: **trénink desítkových kódů** ve dvou režimech (psaní kódu,
výběr významu). Plánované budoucí moduly: zákony (Penal Code, LEA, Firearm Act) a
SASP příručka — v navigaci jako placeholdery na `/laws`, `/sasp`.

Pure-frontend, žádný backend. Veškerý stav v `localStorage` (klíč `genk-pd:v1`).

## Stack

- Vite 6 + React 18 + TypeScript 5.6
- Tailwind CSS 3.4 (SASP paleta v `tailwind.config.js`: `sasp-bg`, `sasp-navy`, `sasp-tan`, `sasp-gold`, `sasp-red`, `sasp-ink`)
- React Router 6 (`createBrowserRouter`)
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

`npm run test:all` musí být zelené (43 unit/component + 20 E2E = 63 testů). Žádná
manuální verifikace — pokud něco rozbiju, opravím a prohnám testy.

## Adresářová struktura

```
src/
  app/                       # Shell: AppLayout, HomePage, ComingSoonPage, routes.tsx
  modules/codes/             # Modul desítkových kódů
    data/codes.ts            # Statická data všech 10-X kódů (parsováno z docs/codes.md)
    state/
      useCodeProgress.ts     # Skóre/turn (useSyncExternalStore nad storage.ts)
      useSettings.ts         # Filtr důležitosti
      selection.ts           # pickNextCode (cooldown + vážený výběr)
      distractors.ts         # buildOptions pro mód 2
    components/              # CodesPage, ModeWrite, ModeChoose, SidePanel,
                             # ImportanceFilter, ResetButton, CongratsBanner
  shared/
    storage.ts               # Versionovaný localStorage wrapper s cached snapshot
    rng.ts                   # Pluggable RNG (mulberry32 PRNG, seed přes localStorage)
    useMediaQuery.ts         # SSR-safe matchMedia hook
    ui/BadgeIcon.tsx         # SVG hvězda s "PD"
  styles/index.css           # Tailwind directives + .card / .btn-* / .chip komponenty
  test/setup.ts              # Vitest setup (jsdom + jest-dom + storage cache reset)

e2e/
  fixtures/seed.ts           # `seed(page, {...})` injektuje localStorage před page.goto
  codes/*.spec.ts            # 7 spec souborů (mode-write, mode-choose, side-panel,
                             # settings, persistence, completion, responsive)
```

Když přidáváš nový modul (zákony, SASP), kopíruj strukturu `modules/codes/` a přidej
route v `src/app/routes.tsx`.

## Datový model

```ts
// localStorage["genk-pd:v1"]
{
  schemaVersion: 1,
  codes: {
    progress: { [codeId]: { score: -3..+3, lastAskedAtTurn: number } },
    turn: number,
    settings: {
      importanceFilter: { mandatory: bool, rare: bool, unnecessary: bool }
    }
  }
}
```

Skóre `-3..+3`, sdílené mezi oběma módy. Kód na `+3` vypadne z poolu. Pool prázdný →
`<CongratsBanner />`. Reset maže `progress` a `turn`, **zachovává** settings.

Default `importanceFilter` v `initialState` (storage.ts) je **všechno true** (mandatory,
rare, unnecessary). E2E `seed()` má vlastní fallback `mandatory:true, rest:false` —
záměrně, ať jsou spec soubory deterministicky mandatory-only, dokud explicitně neřeknou jinak.

Kódy s A/B variantami z `docs/codes.md` (`10-14 A/B`, `10-99 A/B`) jsou v `CODES`
**sjednocené** do jednoho záznamu se spojeným významem. Pokud měla A/B různou
důležitost, bere se vyšší (`mandatory > rare > unnecessary`).

Zdroj pravdy pro `CODES` je `docs/codes.md` — **parsováno ručně do TS literálu, ne za
běhu**. Když se změní `docs/codes.md`, ručně updatovat `src/modules/codes/data/codes.ts`
a sjet `npm test` (test ověřuje počet 54 záznamů).

## Algoritmy

**`pickNextCode(state, allCodes)`** (`src/modules/codes/state/selection.ts`):
1. Eligibilní = filter důležitosti AND skóre `< 3`.
2. Cooldown: `turn - lastAskedAtTurn >= 2`. Když by cooldown vyprázdnil pool, rušíme ho.
3. Vážený výběr: `weight = 4 - score` (od `-3` váha 7, od `+2` váha 2).

**`buildOptions(correct, allCodes)`** (`src/modules/codes/state/distractors.ts`):
1 správná + 2 ze stejné dekády (`10-40..10-49` pro `10-44`) + 2 náhodné. Distraktory
**ignorují filtr důležitosti** (taháno z celé množiny `CODES`). Když je dekáda chudá
(<2 jiných kódů), padne se na nejbližší podle `|Δnumber|`.

**Progress bar (SidePanel + MobilePanel)**: `pct = Σ max(0, score(c)) / (3·N)` přes
filtrované kódy. Mínusové skóre se klampuje na 0 jen pro UI (storage uchovává `-3..+3`,
selection na něj spoléhá). Hlavička panelu zobrazuje `Splněno X%` (testid
`progress-percent`); mobilní `<summary>` ukazuje `Přehled kódů — X% splněno` (testid
`mobile-progress-percent`). `isComplete` ⟺ všechny filtrované kódy na +3.

**Klávesy v ModeChoose**: `1`–`5` vybírá odpověď. Listener visí na `window` jen po dobu
aktivní otázky (efekt s deps `[current, choice, options, recordAnswer]`), ignoruje
modifikátory a `INPUT/TEXTAREA/contenteditable` cíle.

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
   `e2e/fixtures/seed.ts` zapisuje rovnou `localStorage["genk-pd:v1"]` a
   `localStorage["genk-pd:rng-seed"]` (čteno v `rng.ts` při module load). Init script
   používá `sessionStorage` flag `genk-pd:seeded`, aby se **nepřeseedoval po reloadu**
   (jinak by persistence testy byly k ničemu).

4. **SidePanel se renderuje jen jednou**, ne dvakrát. `CodesPage` přepíná mezi
   inline desktop a collapsible mobile podle `useMediaQuery('(min-width: 1024px)')`.
   Bez toho měly chipy duplicitní `data-testid`, což lámalo Playwright strict mode.

5. **`progress` a `turn` MUSÍ být v deps `useEffect`** v `ModeWrite`/`ModeChoose`,
   které pickují další otázku — bez nich se po `reset()` (z congrats banneru) nevyzvedne
   nová otázka.

6. **Auto-focus inputu v ModeWrite je SAMOSTATNÝ efekt** s deps `[current, feedback]`,
   ne `queueMicrotask` ve výběrovém efektu. Důvod: když efekt nastaví `current`, input
   ještě není v DOMu (renderuje se `<QuestionSkeleton />`), takže microtask focusne `null`.

7. **Žádná emoji v kódu / dokumentaci**, pokud uživatel výslovně nepožádá.

## Konvence

- Cesta s aliasem `@/...` mapuje na `src/...` (TS path + Vite/Vitest resolve.alias).
- Komentáře píšeme jen tam, kde **proč** není zřejmé z kódu.
- Stylované primitivy v `src/styles/index.css` (`.btn-primary`, `.btn-secondary`,
  `.btn-danger`, `.card`, `.chip`) — preferovat před opakováním tříd.
- `data-testid` na všem, co testuje E2E. Přidávat při psaní komponenty, ne dodatečně.
- Žádný hidden state mimo `localStorage` — všechno persistující jde přes `storage.ts`.

