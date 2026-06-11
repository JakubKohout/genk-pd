# Integrace větve map-test do main (PoC → produkce)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dostat geo modul z PoC větve `map-test` (31 českých commitů, schemaVersion 3→7, balast v docs a CLAUDE.md) do main jako čistou, produkční sérii anglických commitů.

**Architecture:** Žádná nová funkcionalita. Tři úklidové zásahy na nové větvi `geo-integration` (smazání mrtvých souborů, kolaps storage migrací v4–v7 do jediné v3→v4, úklid CLAUDE.md), pak přepis historie přes `git reset --mixed` na merge-base a 3 kurátorované anglické commity, nakonec fast-forward merge do main. Tree-identity check garantuje, že přepis historie nezměnil ani bajt výsledného kódu.

**Tech Stack:** git (reset/merge --ff-only), Vitest, Playwright, sed/grep.

---

## Zjištěná fakta (východiska plánu)

- `main` (`1a754e4`) == merge-base s `map-test` → po přepisu historie jde merge fast-forwardem.
- `main` je na **schemaVersion 3** (codes+lea+penal). Verze 4–7 existují JEN uvnitř PoC větve — nikdo PoC build nepoužil, takže payloady v4–v7 v divočině neexistují a migrační mezikroky lze smazat. Cílová verze po integraci: **4** (= v3 + geo slice ve finálním tvaru).
- 31 hardcoded výskytů `schemaVersion: 7` / `toBe(7)` v `src/` + `e2e/` (10 komponentových testů, `storage.test.ts`, `storage.ts`, `e2e/fixtures/seed.ts`, `e2e/laws/lea/persistence.spec.ts`).
- Mrtvé binárky: `docs/city-map.png` (23 MB) a `docs/state-map.png` (23 MB) — nikde v kódu/skriptech nereferencované (tile source je jedině `docs/clean-map.jpg`). Odkazy na `city-map.png` v CLAUDE.md jsou zastaralé (Gotcha 30, 32, 33).
- Mrtvé docs: `docs/superpowers/plans/2026-05-13-streets-auto-import.md` (1927 řádků) + `docs/superpowers/specs/2026-05-13-streets-auto-import-design.md` — popisují Foxxite auto-import, který byl později ve větvi celý smazán (commit c07a2e7). `2026-06-11-geo-poi-size-tolerance-design.md` se NECHÁVÁ (popisuje implementovanou feature, konvence z lea-quiz docs).
- CLAUDE.md balast: gotchas 37, 39–41, 43 jsou „(smazáno …)" placeholdery; gotchas 30/32/33 referencují neexistující `city-map.png` a staré rozměry 5039×7463 (skutečnost: `clean-map.jpg` 8192×12288); datový model v code-blocku říká `schemaVersion: 6` (!), text říká v7 — obojí má být 4; Gotcha 45 nese historický affine-transfer narativ.

---

### Task 1: Založit integrační větev a smazat mrtvé soubory

**Files:**
- Delete: `docs/city-map.png`, `docs/state-map.png`
- Delete: `docs/superpowers/plans/2026-05-13-streets-auto-import.md`
- Delete: `docs/superpowers/specs/2026-05-13-streets-auto-import-design.md`

- [ ] **Step 1: Nová větev z map-test**

```bash
git checkout map-test && git checkout -b geo-integration
```

- [ ] **Step 2: Smazat soubory**

```bash
git rm docs/city-map.png docs/state-map.png \
  docs/superpowers/plans/2026-05-13-streets-auto-import.md \
  docs/superpowers/specs/2026-05-13-streets-auto-import-design.md
```

- [ ] **Step 3: Ověřit, že na smazané soubory nic neodkazuje**

```bash
grep -rn "city-map\|state-map\|streets-auto-import" src/ scripts/ e2e/ docs/ CLAUDE.md
```

Expected: jediné zásahy v `CLAUDE.md` (Gotcha 30/33 — opraví Task 3). Pokud se objeví zásah v `src/`/`scripts/`/`e2e/`, STOP — soubor není mrtvý, vrátit ho.

- [ ] **Step 4: Testy stále zelené (sanity)**

```bash
npm test
```

Expected: 410 passed.

- [ ] **Step 5: Commit**

```bash
git commit -m "chore: remove unused map binaries and stale auto-import docs"
```

---

### Task 2: Kolaps schemaVersion migrací 7 → 4

Cíl: `PersistedState.schemaVersion = 4`; jediná nová migrace `migrateV3ToV4` produkuje rovnou finální tvar (geo slice s prázdným progress + 4-kat filter, vše true). Typy `StoredV4/V5/V6`, `GeoLikeSlice` a migrace `migrateV4ToV5/V5ToV6/V6ToV7` se mažou.

**Files:**
- Modify: `src/shared/storage.test.ts` (TDD: nejdřív testy)
- Modify: `src/shared/storage.ts:62-378`
- Modify (mechanicky, sed): 10 komponentových `*.test.tsx`, `e2e/fixtures/seed.ts`
- Modify: `e2e/laws/lea/persistence.spec.ts:42`

- [ ] **Step 1: Přepsat storage.test.ts na v4 sémantiku (failing tests)**

Úpravy po blocích (čísla řádků dle aktuálního stavu):

1. Všechny testy v `describe('storage migration')` čekající `schemaVersion: 7` / název „to v7" přejmenovat a přepnout na **4** (řádky 28, 41, 64, 90, 171, 219, 245, 282). Mechanická náhrada `schemaVersion: 7` → `schemaVersion: 4` a „v7" → „v4" v názvech testů uvnitř tohoto souboru.
2. **Smazat** test `'migrates a stored v4 payload to v7, wiping geo progress and resetting the filter'` (řádek 130) — v4 už není legacy verze, je to current.
3. **Smazat celý** `describe('storage migration v6 → v7', …)` blok (řádek 305 až konec souboru) — verze 5–7 přestávají existovat.
4. Test `'migrates a stored v3 payload …'` (řádek 90) musí nově očekávat finální geo defaults. Klíčová aserce:

```ts
it('migrates a stored v3 payload to v4, preserving all prior slices', () => {
  localStorage.setItem(
    STORAGE_KEY_FOR_TESTS,
    JSON.stringify({
      schemaVersion: 3,
      codes: { progress: { '10-1': { score: 2, lastAskedAtTurn: 1 } }, turn: 5,
        settings: { importanceFilter: { mandatory: true, rare: false, unnecessary: false } } },
      lea: { progress: { 'lea.7': { score: 1, lastAskedAtTurn: 2 } }, turn: 3 },
      penal: {
        scenarios: { progress: { a1: { score: 2, lastAskedAtTurn: 1 } }, turn: 2 },
        recall: { progress: {}, turn: 0 },
      },
    }),
  );
  __resetCacheForTests();
  const state = loadState();
  expect(state.schemaVersion).toBe(4);
  expect(state.codes.progress['10-1']).toEqual({ score: 2, lastAskedAtTurn: 1 });
  expect(state.lea.turn).toBe(3);
  expect(state.penal.scenarios.progress['a1']).toEqual({ score: 2, lastAskedAtTurn: 1 });
  expect(state.geo).toEqual({
    blind: { progress: {}, turn: 0 },
    name: { progress: {}, turn: 0 },
    settings: { categoryFilter: { street: true, highway: true, city: true, state: true } },
  });
});
```

(Importy a okolní helpery v souboru už existují — měnit jen těla testů.)

- [ ] **Step 2: Ověřit, že testy padají**

```bash
npx vitest run src/shared/storage.test.ts
```

Expected: FAIL (storage.ts pořád zapisuje/čte 7).

- [ ] **Step 3: Přepsat storage.ts**

Konkrétní edity:

1. `PersistedState.schemaVersion: 7` → `4` (řádek 63) a `initialState.schemaVersion: 7` → `4` (řádek 71).
2. Smazat typy `StoredV4` (řádky 126–138), `StoredV5` (140–146), `GeoLikeSlice` (148–154), `StoredV6` (156–162).
3. Smazat funkce `migrateV4ToV5`, `migrateV5ToV6`, `migrateV6ToV7` (řádky 242–294).
4. Nahradit `migrateV3ToV4` (řádky 205–240) verzí vracející rovnou `PersistedState`:

```ts
// v3 → v4: geo modul přidán; nový slice startuje prázdný s plným category filtrem.
function migrateV3ToV4(v3: StoredV3): PersistedState {
  return {
    schemaVersion: 4,
    codes: {
      progress: v3.codes?.progress ?? {},
      turn: v3.codes?.turn ?? 0,
      settings: {
        importanceFilter: {
          ...initialState.codes.settings.importanceFilter,
          ...(v3.codes?.settings?.importanceFilter ?? {}),
        },
      },
    },
    lea: {
      progress: v3.lea?.progress ?? {},
      turn: v3.lea?.turn ?? 0,
    },
    penal: {
      scenarios: {
        progress: v3.penal?.scenarios?.progress ?? {},
        turn: v3.penal?.scenarios?.turn ?? 0,
      },
      recall: {
        progress: v3.penal?.recall?.progress ?? {},
        turn: v3.penal?.recall?.turn ?? 0,
      },
    },
    geo: {
      blind: { progress: {}, turn: 0 },
      name: { progress: {}, turn: 0 },
      settings: {
        categoryFilter: { ...initialState.geo.settings.categoryFilter },
      },
    },
  };
}
```

5. V `readFromStorage` (řádky 296–378):
   - union typ parsed: `Partial<PersistedState | StoredV3 | StoredV2 | StoredV1>`
   - lenient branch `parsed?.schemaVersion === 7` → `=== 4`, vnitřní `schemaVersion: 7` → `4`, lokální proměnnou `v7` přejmenovat na `v4` (tělo lenient readu zůstává beze změny — backfill geo/penal defaults je pořád potřeba)
   - migrační chain zkrátit na:

```ts
    if (parsed?.schemaVersion === 3 && parsed.codes) {
      return migrateV3ToV4(parsed as StoredV3);
    }
    if (parsed?.schemaVersion === 2 && parsed.codes) {
      return migrateV3ToV4(migrateV2ToV3(parsed as StoredV2));
    }
    if (parsed?.schemaVersion === 1 && parsed.codes) {
      return migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(parsed as StoredV1)));
    }
```

   (Větve pro 6, 5 a 4-jako-legacy smazat. Neznámá verze padá do `cloneInitial()` — stávající chování.)

- [ ] **Step 4: Storage testy zelené**

```bash
npx vitest run src/shared/storage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Mechanická náhrada fixtures (komponentové testy + e2e seed)**

```bash
grep -rl 'schemaVersion: 7' src e2e | xargs sed -i '' 's/schemaVersion: 7/schemaVersion: 4/g'
```

Pak ručně `e2e/laws/lea/persistence.spec.ts:42`: `expect(parsed.schemaVersion).toBe(7)` → `toBe(4)`, a v `e2e/fixtures/seed.ts` opravit komentáře zmiňující v7.

- [ ] **Step 6: Zkontrolovat zbylé zmínky verze 7**

```bash
grep -rn "schemaVersion[^a-z]*7\|[Vv]ersion 7\|v6 → v7\|V6ToV7" src e2e
```

Expected: žádný výstup (CLAUDE.md řeší Task 3).

- [ ] **Step 7: Celá unit/component suita + build**

```bash
npm test && npm run build
```

Expected: PASS (počet testů klesne — smazané v4/v6→v7 migr. testy; nový počet si poznamenat pro Task 3).

- [ ] **Step 8: E2E**

```bash
npm run test:e2e
```

Expected: 67 passed.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(storage): collapse PoC migrations, ship geo as schemaVersion 4"
```

---

### Task 3: Produkční úklid CLAUDE.md

CLAUDE.md má popisovat finální stav, ne historii PoC. Žádný kód se nemění — po editu jen sanity build.

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Opravit schema verzi všude na v4**

- Úvod („Co to je"): `schemaVersion 7` → `schemaVersion 4`.
- Sekce **Datový model**: v code-blocku `schemaVersion: 6,` → `schemaVersion: 4,` (pozn.: code-block je dnes rozjetý vůči textu).
- Odstavec **Migrace v1 → … → v7** přepsat na: *„Migrace v1 → … → v4: v1: codes; v2: +lea; v3: +penal; v4: +geo (prázdný progress, 4-kat filter). `saveState` vždy zapisuje v4. Lenient v4 read dopočítá chybějící geo/penal sub-slices."* Zmínky o v5/v6/v7 a o vynulováních geo progress smazat (ta historie se do main nedostane).
- Gotcha 3 (Playwright seed): „ve formátu `schemaVersion: 6`" → `schemaVersion: 4`.
- Gotcha 11: `schemaVersion` 7 → 4, „bumpni schema (v7 → v8)" → „(v4 → v5)".
- Gotcha 29 přepsat: *„Schema je v4 — bumpnuto z v3 přidáním geo slice. Všechny test seedy s hardcoded `saveState({...})` musí mít `schemaVersion: 4` + `geo.settings.categoryFilter` se všemi 4 kategoriemi. Stejně tak `e2e/fixtures/seed.ts`. Další modul / přepis kategorií ⇒ bump v4 → v5 + migrace."*
- Sekce adresářové struktury u `storage.ts`: „schemaVersion 7, chained migrate v1→…→v7 … migrateV6ToV7…" → „schemaVersion 4, chained migrate v1→…→v4 při readu, lenient v4 read".

- [ ] **Step 2: Opravit zastaralé reference na mapové soubory**

- Gotcha 30: `docs/city-map.png (5039×7463)` → `docs/clean-map.jpg (8192×12288)`.
- Gotcha 32: „Source PNG je portrait 5039×7463" → „Source JPEG je portrait 8192×12288"; přepočet px údajů: práh medium 0.0233 ≈ 191 px v X vs. 286 px v Y; poměr 8192/12288 = 0.667.
- Gotcha 33: „odhadnuté z `docs/city-map.png`" → „proti `docs/clean-map.jpg`"; smazat větu o ±2 % odhadech (pozice jsou vizuálně ověřené — viz size/calibrate gotchas).

- [ ] **Step 3: Smazat placeholder gotchas a přečíslovat**

- Smazat položky 37, 39–41, 43 („smazáno — …"). Historické odkazy „viz git historie" v nich main nepotřebuje.
- Přečíslovat zbytek: 38→37, 42→38, 44→39, 45→40, 46→41, 47→42.
- Opravit křížové reference: `grep -n "Gotcha" CLAUDE.md` a přepsat každý odkaz dle mapy výše (minimálně: „Gotcha 45" a „Gotcha 47" v popisu `pois.ts`, „Gotcha 46" u `streets.generated.ts`, „Gotcha 44/45/46/47" vzájemné odkazy v textech gotchas; „LEA Gotcha 7" a „Gotcha 28" zůstávají beze změny).

- [ ] **Step 4: Zkrátit historický narativ v geo sekcích**

- Gotcha (původně 45): smazat affine koeficienty a výčet „3 přesné páry / residua ≤ 0.004 / opravené POI". Nahradit: *„POI pozice jsou umístěné a vizuálně ověřené přímo proti artu (`docs/clean-map.jpg`). Jediný zdroj pravdy = art (Gotcha 39). Dolaďování přes `/geo/calibrate` Drag&Drop."*
- Gotcha (původně 44): nechat — insight „custom mapa ≠ vanilla projekce, negenerovat z GTA dat" je load-bearing. Jen zkrátit závorku s historií „proto vznikla session…".
- Sekce „Co to je" bod 4: smazat větu „Pozice přenesené z předchozí mapy přes image-affine…", nechat jen „pozice vizuálně ověřené proti artu, ulice hand-traced".

- [ ] **Step 5: Aktualizovat počty testů**

Řádek „**410 unit/component + 67 E2E = 477 testů**" přepsat na skutečné počty z Task 2 Step 7/8.

- [ ] **Step 6: Závěrečná kontrola konzistence**

```bash
grep -n "v7\|version 7\|schemaVersion: 6\|city-map\|state-map\|5039\|affine\|smazáno" CLAUDE.md
```

Expected: žádný výstup (případně jen legitimní zmínky, projít ručně).

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: rewrite CLAUDE.md geo sections for final state, schema v4"
```

---

### Task 4: Finální verifikace před přepisem historie

- [ ] **Step 1: Kompletní suita**

```bash
npm run test:all
```

Expected: vše zelené (počty dle Task 3 Step 5).

- [ ] **Step 2: Záchytný tag (pro tree-identity check po přepisu)**

```bash
git tag pre-rewrite
```

---

### Task 5: Přepis historie — 3 kurátorované anglické commity

31 PoC commitů (včetně slepých uliček: polygony přidané a smazané, Foxxite import přidaný a smazaný, TPS fit) nemá v main hodnotu. Mixed reset na merge-base a re-commit finálního stromu po logických celcích. Bonus: do historie main se nikdy nedostanou smazané 23MB binárky.

- [ ] **Step 1: Mixed reset na merge-base**

```bash
git reset --mixed 1a754e477f3bf7bb4188b9cae39e45953035d8b6
git status --short | head -30
```

Expected: všechny změny untracked/modified, nic staged.

- [ ] **Step 2: Commit 1 — assets a pipeline**

```bash
git add public/tiles scripts/generate-tiles.mjs scripts/extract-minimap.py docs/clean-map.jpg .gitignore
git commit -m "chore(geo): add map tile pyramid, source art and generation pipeline

- docs/clean-map.jpg (8192x12288) stitched from Rockstar minimap textures
- scripts/extract-minimap.py + scripts/generate-tiles.mjs (one-time, manual)
- public/tiles: 802 JPEGs, z=0..3, ~5.7 MB, committed output"
```

(Pokud `.gitignore` proti main nezměněn, git add ho tiše přeskočí — ok.)

- [ ] **Step 3: Commit 2 — modul + testy**

```bash
git add src e2e package.json package-lock.json
git commit -m "feat(geo): add geography module with interactive Los Santos map

- /geo/blind: click-the-map quiz with size-tiered hit tolerance
- /geo/name: name-the-marker quiz with autocomplete and hard mode
- /geo/calibrate: internal drag&drop position editor with TS export
- 68 POIs (city/state points, street/highway hand-traced polylines)
- Leaflet CRS.Simple over custom tile pyramid
- storage schemaVersion 3 -> 4 (adds geo slice), Mixpanel geo events
- unit/component tests + Playwright e2e (blind, name, persistence)"
```

- [ ] **Step 4: Commit 3 — docs**

```bash
git add CLAUDE.md docs
git commit -m "docs: document geo module (CLAUDE.md, POI mapping, design notes)"
```

- [ ] **Step 5: Nic nezbylo + tree identity**

```bash
git status --short
git diff pre-rewrite HEAD --stat
```

Expected: oba příkazy bez výstupu. Pokud `git status` něco ukazuje, soubor přiřadit do commitu 1–3 (`git add` + `git commit --amend` posledního logického celku). Pokud `git diff` není prázdný, STOP — přepis změnil obsah, vyšetřit.

- [ ] **Step 6: Testy na novém HEAD (paranoia check)**

```bash
npm run test:all
```

Expected: zelené (stejné počty jako Task 4).

---

### Task 6: Archivace PoC větve a předání k review (BEZ merge)

**Záměrně se NEmerguje a NEpushuje** — uživatel si chce `geo-integration` projít ručně před integrací. PoC historie (včetně slepých uliček: polygony, Foxxite import, TPS fit) se archivuje tagem, aby byla dohledatelná i po případném smazání větve.

- [ ] **Step 1: Archivní tag na špičku PoC větve**

```bash
git tag archive/map-test-poc map-test
git log --oneline -1 archive/map-test-poc
```

Expected: tag ukazuje na `eb658e8` (poslední PoC commit, celá 31-commitová historie zůstává dosažitelná přes tag).

- [ ] **Step 2: Smazat pracovní tag pre-rewrite**

```bash
git tag -d pre-rewrite
```

(`map-test` ani `geo-integration` se NEMAŽOU — rozhodne uživatel po review.)

- [ ] **Step 3: Shrnutí pro review**

```bash
git log --oneline main..geo-integration
git diff main...geo-integration --stat | tail -5
```

Vypsat uživateli: 3 commity k review na `geo-integration`, merge později ručně přes `git checkout main && git merge --ff-only geo-integration`. Pokud existuje remote a chce archiv zálohovat: `git push origin archive/map-test-poc`.

---

## Self-review poznámky

- Pořadí Task 1–3 před přepisem (Task 5) je záměrné: mixed reset re-commituje finální strom, takže úklidové commity z Tasků 1–3 se do main nedostanou — slouží jen jako checkpointy.
- Commit 2 (Task 5) obsahuje i e2e — každý ze 3 commitů je samostatně build-zelený (commit 1 = jen assety, commit 2 = funkční celek, commit 3 = docs).
- `docs/superpowers/specs/2026-06-11-geo-poi-size-tolerance-design.md` a tento plán zůstávají v repu (konvence z lea-quiz docs na main).
