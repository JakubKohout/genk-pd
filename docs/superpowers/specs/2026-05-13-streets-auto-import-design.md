# Auto-import ulic z Foxxite GeoJSON — Design Spec

**Datum:** 2026-05-13
**Stav:** k revizi
**Modul:** `src/modules/geo/` + nový skript `scripts/import-foxxite-streets.mjs`

## 1. Cíl

Vyřešit, že 20 stávajících ulic v `src/modules/geo/data/pois.ts` má **manuálně
eyeballed** polyline geometrie, která nesedí s mapovým podkladem `clean-map.jpg`.
Hit-test v „Slepá mapa" je proto nespolehlivý — uživatel klikne reálně na ulici,
ale algoritmus to vyhodnotí jako miss.

Cíl: **nahradit všechny ulice správnou geometrií** automaticky, bez manuálního
zadávání kliků nebo souřadnic. Zdroj geometrie = veřejný komunitní dataset
[Foxxite/GTAV-Geo-Json](https://github.com/Foxxite/GTAV-Geo-Json) (licence
ověřena, použití schváleno).

## 2. Rozsah

### V rozsahu
- Stažení a archivace `street.geojson` z Foxxite repa (analog scrape-mapgenie.mjs).
- Whitelist-driven filtr (~20 jmen převzatých z dnešního `pois.ts`).
- Coordinate transform GTA V world coords → naše normalized 0..1 image space
  pomocí existujícího `fitAnchorTransformMode('affine6', anchors)` z `transform.ts`,
  rozšířeného o `gtaWorld` koordináty pro každou kotvu.
- Nový POI geometrie typ `POIPolygon` (přesný obrys ulice).
- Polygon rendering v `GeoMap` přes react-leaflet `<Polygon>`.
- Hit-test `polygonHit` (point-in-polygon + edge distance fallback s tolerancí).
- Storage migrace v5 → v6 (vyresetuje `geo.blind.progress` + `geo.name.progress`,
  protože POI IDs se mění).
- Plný replace stávajících 20 polyline ulic. **`POIStreet` typ se z kódu odstraní**
  (žádný legacy support).

### Mimo rozsah
- `area.geojson` z Foxxite (districts/zóny) — možná v budoucnu jako 7. kategorie.
- MultiPolygon support (Foxxite sample je single-ring; pokud narazím, skript
  zalogguje warning a feature skipne).
- Polygon holes (inner rings) — Foxxite nemá, neřeším.
- Real-time fetch z GitHubu při buildu — skript je one-shot, output commitnutý.
- Per-mode hit threshold tuning UI — `edgeTolerance` je modul-level konstanta.

## 3. Zdrojová data

Foxxite `street.geojson`:
- FeatureCollection s ~150+ ulicemi
- `properties.name`: oficiální Rockstar jméno ulice (např. „Mirror Park Boulevard",
  „Great Ocean Hwy", „Route 68")
- `geometry.type`: `"Polygon"`
- `geometry.coordinates`: `[[[x, y], ...]]` (single outer ring, closed)
- Coordinate system: GTA V world coords (X: ~-3500..+1700, Y: ~-3500..+7200,
  Y roste na sever; metry od origin)

## 4. Whitelist

Hardcoded TS literál na vrchu `import-foxxite-streets.mjs`. Initial obsah převzat
1:1 ze stávajícího `pois.ts` — všech 20 ulic:

| id                          | displayName            | foxxiteName (k ověření) | aliases (krácené) |
|-----------------------------|------------------------|-------------------------|-------------------|
| `street.del-perro-fwy`      | Del Perro Fwy          | Del Perro Fwy           | del perro, …      |
| `street.la-puerta-fwy`      | La Puerta Fwy          | La Puerta Fwy           | la puerta, …      |
| `street.olympic-fwy`        | Olympic Fwy            | Olympic Fwy             | olympic, …        |
| `street.elysian-fields-fwy` | Elysian Fields Fwy     | Elysian Fields Fwy      | elysian, …        |
| `street.los-santos-fwy`     | Los Santos Fwy         | Los Santos Fwy          | los santos, …     |
| `street.palomino-fwy`       | Palomino Fwy           | Palomino Fwy            | palomino, …       |
| `street.senora-fwy`         | Senora Fwy             | Senora Fwy              | senora, …         |
| `street.goh`                | Great Ocean Hwy        | Great Ocean Hwy         | goh, route 1, …   |
| `street.route-68`           | Route 68               | Route 68                | 68, r68, …        |
| `street.vespucci-blvd`      | Vespucci Blvd          | Vespucci Blvd           | vespucci, …       |
| `street.san-andreas-ave`    | San Andreas Ave        | San Andreas Ave         | san andreas, …    |
| `street.palomino-ave`       | Palomino Ave           | Palomino Ave            | palomino avenue   |
| `street.calais-ave`         | Calais Ave             | Calais Ave              | calais, …         |
| `street.alta-street`        | Alta Street            | Alta St                 | alta, alta st     |
| `street.innocence-blvd`     | Innocence Blvd         | Innocence Blvd          | innocence, …      |
| `street.el-rancho-blvd`     | El Rancho Blvd         | El Rancho Blvd          | el rancho, …      |
| `street.popular-st`         | Popular St             | Popular St              | popular, …        |
| `street.las-lagunas-blvd`   | Las Lagunas Blvd       | Las Lagunas Blvd        | las lagunas, …    |
| `street.vinewood-blvd`      | Vinewood Boulevard     | Vinewood Blvd           | vinewood, …       |
| `street.west-eclipse-blvd`  | West Eclipse Blvd      | West Eclipse Blvd       | west eclipse, …   |

- `id`, `displayName`, `aliases` převzato beze změny z dnešního `pois.ts`.
- `foxxiteName` v tabulce je **odhad** podle dnešního naming. Při běhu skriptu
  se ověří proti reálným `properties.name` ve Foxxite; jakýkoliv mismatch
  (např. Foxxite má „Innocence Boulevard" místo „Innocence Blvd") se opraví
  v `WHITELIST` literálu na základě varování skriptu.
- Match je case-insensitive exact (ne substring). Pokud skript ulici v datech
  nenajde, zalogguje warning a entry skipne — řeší uživatel manuálně.

Whitelist je **rozšiřitelný** — přidat ulici = dopsat jeden záznam a spustit
skript znovu. Žádné ruční zadávání coords.

Whitelist je **rozšiřitelný** — přidat ulici znamená dopsat jeden záznam a spustit
skript. Žádné ruční zadávání coords.

## 5. Coordinate transform

### 5.1 Anchor rozšíření

`src/modules/geo/data/anchorsCalibration.ts` — `DEFAULT_ANCHORS` je dnes pole
6 objektů s `{ id, label, mgLatLng: Vec2, image: Vec2 }`. Přidám 7. field:
**`gtaWorld: Vec2`** = pozice anchor bodu v Rockstar GTA V world coords.

Hodnoty `gtaWorld` najdu třemi způsoby:
1. **In-game coords ze hry** (preferred, ±5 m přesnost): u známých landmarků
   jsou souřadnice publikované na GTA Wiki / FiveM dokumentaci.
2. **Match s Foxxite `area.geojson`**: kotva (např. Vespucci PD) je nedaleko
   pojmenované zóny v area dataset — použít centroid zóny jako proxy.
3. **Fallback**: pokud pro ≤2 kotvy se to nepodaří, affine6 fittnu z těch
   3+ které mám (matematicky postačí, jen vyšší residuals).

Plánovaný initial set (~3 m přesnost, hodnoty doplnit při implementaci):
- Vespucci PD ≈ `(-1109, -845)`
- Galileo Observatory ≈ `(-438, 1227)`
- Bolingbroke Penitentiary ≈ `(1846, 2616)`
- Paleto Motel ≈ `(140, 6580)`
- Humane Labs ≈ `(3666, 3735)` *(je-li mimo road network, nahradit jinou kotvou)*
- Helicopter lookout ≈ `(479, 5573)`

Hodnoty nad jsou orientační; při implementaci se ověří proti dnešnímu image-space
pozici každé kotvy (Δ < 0.005 po affine6 fitu).

### 5.2 Transform fitting

Přidám **paralelní funkci `fitGtaWorldTransform(anchors)`** v
`src/modules/geo/logic/transform.ts`, která bere `{ gtaWorld, image }` pairs a
vrací stejný `MgTransform`-shaped objekt (sjednocené API). Internálně volá
generický `fitAffine6` z `calibrate.ts` — žádná duplikace matematiky.

Důvod nové funkce místo úpravy existující: Y axis projekce je odlišná. MG ukládá
lat se sever-jih asymetrií, kterou musí Web Mercator forward kompenzovat (gotcha
#37 v CLAUDE.md). GTA V world Y roste lineárně na sever — žádná projekce, čistě
lineární transformace. Explicitní nová funkce je čistší než parametrizovat
existující o booleovský `applyMercator` flag.

### 5.3 Aplikace

Pro každý whitelistovaný feature:
1. `coordinates[0]` (outer ring) → každý bod `[x_gta, y_gta]` → `apply(transform, …)` →
   `Vec2 v [0..1]`
2. Clamp do `[0, 1]` (mimo image space = chyba, fail-fast s loggováním)
3. Compute centroid (signed-area weighted, standard alg) pro „Co je tady" marker
4. Emit do TS literálu s `geometry: 'polygon'`, `path: Vec2[]`, `centroid: Vec2`

## 6. Datový model rozšíření

### 6.1 Types

`src/modules/geo/data/types.ts`:

```ts
export type POICategory = 'street' | 'landmark' | 'pd' | 'fire' | 'ems' | 'ammu';

export interface POIBase {
  id: string;
  name: string;
  description?: string;
  aliases: string[];
  category: POICategory;
}

export interface POIPoint extends POIBase {
  geometry: 'point';
  position: Vec2;
}

export interface POIPolygon extends POIBase {
  geometry: 'polygon';
  path: Vec2[];          // outer ring, closed (first === last)
  centroid: Vec2;        // pre-computed, používá ho GeoNamePage marker
}

export type POI = POIPoint | POIPolygon;
```

**Změna oproti dnešku:** `POIStreet` (polyline) zaniká, `POIPolygon` ho nahrazuje
pro celou kategorii `street`. Discriminant `geometry` zůstává, jen hodnota
`'polyline'` se z union odstraňuje.

### 6.2 pois.ts

`pois.ts` reorganizuje na strukturu:

```ts
import { STREET_POLYGONS } from './streetPolygons.generated';

const NON_STREET_POIS: POI[] = [
  /* 48 landmark/pd/fire/ems/ammu entries (beze změny) */
];

export const POIS: POI[] = [...NON_STREET_POIS, ...STREET_POLYGONS];
```

- Auto-generovaný soubor `streetPolygons.generated.ts` se commitne a importuje.
- Non-street POI zůstávají hardcoded v `pois.ts` (jsou stabilní a malé množství).
- `POI_BY_ID` lookup map se generuje z `POIS` jako dnes.
- **ID, name, aliases zůstávají stejné** jako dnes (whitelist je v skriptu
  dodává explicitně z původního datasetu).
- Mění se **jen geometrie**: polyline `path: Vec2[]` (current `POIStreet`) →
  polygon `path: Vec2[]` (closed ring) + `centroid: Vec2`. Discriminant
  `geometry` se mění z `'polyline'` na `'polygon'` — breaking pro storage
  progress (viz sekce 8).

Total POI count zůstává 68 (20 streets + 48 ostatní).

## 7. Hit-test

### 7.1 polygonHit

`src/modules/geo/logic/hitTest.ts` přidá:

```ts
const EDGE_TOLERANCE = 0.015; // 1.5 % image width

function pointInPolygon(p: Vec2, ring: Vec2[]): boolean {
  // standard ray casting, ~15 řádků
}

function distanceToPolygonEdge(p: Vec2, ring: Vec2[]): number {
  // min přes všechny segmenty (i,i+1), perpendikulární distance
  // (sdílí helper s existujícím polylineHit)
}

export function polygonHit(ring: Vec2[], click: Vec2, tolerance = EDGE_TOLERANCE): boolean {
  if (pointInPolygon(click, ring)) return true;
  return distanceToPolygonEdge(click, ring) <= tolerance;
}
```

`evaluateClick(poi, click)` rozšířit:

```ts
switch (poi.geometry) {
  case 'point': return pointHit(poi.position, click);
  case 'polygon': return polygonHit(poi.path, click);
}
```

Větev `polyline` se odstraní spolu s `POIStreet`.

### 7.2 Tolerance default

`EDGE_TOLERANCE = 0.015` (1.5 % normalized width).

- `clean-map.jpg` je 5944×8075 px → 1.5 % šířky ≈ 89 px
- Na běžném mobilním displeji (cca 400 px width na zoom 1) ≈ 6 px, na zoom 3 ≈ 96 px
- Pro touchscreen tap (cca 44×44 px hit area) → polygon dostane efektivní tolerance
  cca poloviny tap radia = touch-friendly

Hodnota je modul-level konstanta. Pokud bude potřeba per-kategorie tuning, lze
udělat lookup table nebo přidat `hitTolerance?` na `POIBase` (YAGNI pro MVP).

## 8. Storage migrace

`src/shared/storage.ts`:
- `CURRENT_SCHEMA_VERSION = 6`
- `migrateV5ToV6(state)`:
  - Vynuluje `state.geo.blind.progress = {}` a `state.geo.name.progress = {}`.
    Důvod: i když street POI IDs zůstávají stejné, geometrie se mění radikálně
    (polyline → polygon). Stará score uložená nad „kliknul jsem správně na
    nepřesnou polyline" už neodpovídá novému polygonu. Lepší vynulovat oba módy,
    než selektivně řešit stale progress — čistší a user pochopí (nová mapa
    = nový start v geo).
    Codes/lea/penal slices se nedotýkají, user neztratí progress jinde.
  - `state.geo.blind.turn = 0`, `state.geo.name.turn = 0`
  - `state.geo.settings.categoryFilter` zachovat beze změny (6 kategorií platí dál).
- Lenient v6 read: stejný pattern jako v5 (chybějící klíče backfill defaults).

Test fixtures: všechny hardcoded `saveState({ schemaVersion: 5, … })` v
`*.test.tsx` + `e2e/fixtures/seed.ts` aktualizovat na `schemaVersion: 6`. Update
hardcoded `GEO_POI_IDS` v seed.ts na nový kompletní seznam.

## 9. Rendering

### 9.1 GeoMap.tsx

Switch over `poi.geometry`:
- `point` → `<GeoMarker ... />` (beze změny)
- `polygon` → nová komponenta `<GeoPolygon ... />`

`<GeoPolygon>`:
- React-Leaflet `<Polygon positions={path.map(toLatLng)} />`
- `pathOptions`:
  - **Asked (current question)**: outline `border-color: sasp-gold`, fill 20 % opacity gold
  - **Mastered**: outline `sasp-navy-light`, fill 10 % opacity, tooltip s názvem
  - **Default (in pool, not asked)**: invisible (no stroke, no fill) — aby se mapa
    „odemykala" postupně, jako landmark markery
- Tooltip on hover/tap pro mastered (stejně jako GeoMarker)

### 9.2 GeoNamePage marker

Pulsing marker se kreslí na `polygon.centroid` (pre-computed při importu, ne
runtime — centroid pro non-convex polygon je drahá operace, byť ne extra drahá).

## 10. Quiz integrace

### 10.1 GeoBlindPage

Beze změny v UI flow. `evaluateClick(poi, click)` v `logic/hitTest.ts` se větví
podle `poi.geometry`. Reveal layer v polygon případě:
- **Hit**: žádný target marker (uživatel uhádl, fade-in polygon outline)
- **Miss**: kreslí se polygon outline + uživatelův click marker (testid existující)

### 10.2 GeoNamePage

Beze změny v UI flow. Asked POI marker se renderuje na `polygon.centroid`. Reveal
přidá polygon jako mastered (s názvem v tooltipu) nebo wrong odpověď + correct
answer label.

### 10.3 Side panel

Stejný layout. Polygon ulice mají stejnou 3-znakovou zkratku `ULI` v
`GeoSidePanel`. Filter `categoryFilter.street` filtruje včetně polygon ulic
(category zůstává `'street'`).

## 11. Skript: import-foxxite-streets.mjs

```
scripts/import-foxxite-streets.mjs

Inputs:
  Foxxite GitHub raw URL (constant in script)
  WHITELIST array (top of script)
  DEFAULT_ANCHORS s gtaWorld field (from anchorsCalibration.ts)

Outputs:
  docs/foxxite-data/raw.geojson                          # archived (commit)
  docs/foxxite-data/scraped-at.txt                       # timestamp + URL marker
  src/modules/geo/data/streetPolygons.generated.ts       # POIPolygon[] export
                                                          # (commit, imported by pois.ts)
  e2e/fixtures/geo-poi-ids.generated.ts                  # GEO_POI_IDS export
                                                          # (commit, imported by seed.ts)

Pipeline:
  1. Fetch + archive raw.geojson
  2. Validate: FeatureCollection with Polygon features
  3. Fit GTA→image transform from DEFAULT_ANCHORS (affine6)
     Print per-anchor Δ residuals. Fail if max Δ > 0.01.
  4. For each WHITELIST entry:
     a. Find feature with case-insensitive matching properties.name === foxxiteName
     b. If not found: warn + skip (entry omitted from output)
     c. Transform coordinates[0] (outer ring) → image space
     d. Clamp to [0,1], fail-fast if any point out of bounds
     e. Compute centroid (signed-area weighted)
     f. Append POIPolygon literal to TS output
  5. Write streetPolygons.generated.ts with header comment marking auto-gen
     + DO NOT EDIT notice + skript path + timestamp.
  6. Write geo-poi-ids.generated.ts with full list (streets + landmarks/pd/…).
  7. Print summary: N streets emitted, M skipped, max Δ.
```

Skript je analog `scripts/scrape-mapgenie.mjs` (one-shot, idempotentní, výstup
commitnutý). Není v `npm run build`. Žádné unit testy (one-shot tooling).

## 12. Testing

### Unit / component
- `src/modules/geo/logic/hitTest.test.ts` (rozšíření):
  - `pointInPolygon` — convex, concave, on edge, on vertex
  - `distanceToPolygonEdge` — inside, outside, edge cases
  - `polygonHit` — inside (no tolerance needed), within tolerance, outside tolerance
- `src/modules/geo/data/pois.test.ts` (rozšíření):
  - Každá polygon ulice má ≥4 body
  - Polygon je closed (`path[0]` === `path[path.length-1]`)
  - Centroid je uvnitř polygon (sanity check via `pointInPolygon`)
  - Žádný bod mimo `[0, 1]²`
- `src/shared/storage.test.ts` (rozšíření):
  - Migrace v5 → v6 vynuluje geo progress
  - Lenient v6 read (chybějící klíče backfill)

### E2E
- `e2e/fixtures/seed.ts`:
  - `schemaVersion: 6`
  - Místo hardcoded `GEO_POI_IDS` arrayre-export `GEO_POI_IDS` z
    `geo-poi-ids.generated.ts` (skript ho přepisuje).
- Existující `e2e/geo/*.spec.ts` (3 spec soubory, 12 testů) — zachovat behavior.
  IDs zůstávají stejné (whitelist přebírá z dnešního datasetu, viz sekce 4),
  takže `pinNextGeoPoi('street.del-perro-fwy')` apod. dál funguje. Audit:
  spec reference na konkrétní street ID musí být v whitelistu (sekce 4) —
  pokud ne, fixnout v whitelistu.

### Verifikace
- `npm run test:all` musí být zelené (384 + 67 = 451 testů, plus nové unit testy
  pro polygon hit-test)
- Manual smoke test: spuštění `/geo/blind` v dev serveru, klik na vybraných
  5 ulicích → každý hit registrován; klik tesně mimo ulici → hit registrován
  v rámci tolerance; klik 5 % mimo → miss

## 13. Kompromisy a vědomé YAGNI

- **Polygon holes** (inner rings) nejsou v Foxxite datech, skript je neimplementuje.
  Pokud někdy budou, `distanceToPolygonEdge` se rozšíří o iteraci přes holes.
- **MultiPolygon** features (např. dálnice s několika oddělenými segmenty)
  skript flagne + skipne. Pokud Foxxite ve skutečnosti MultiPolygon má pro nějakou
  whitelistovanou ulici, řešení = manuálně rozdělit na samostatné POI nebo
  rozšířit support na MultiPolygon (out of MVP scope).
- **Per-POI hit tolerance** není konfigurovatelná. Pokud uživatel narazí na
  ulici která má nedostatečnou toleranci, řešení = přidat optional `hitTolerance`
  na `POIBase` (snadné rozšíření, ale YAGNI dokud nezabolí).
- **`area.geojson`** Foxxite je v dataset, ale neimportujeme. Districts/zóny
  jsou samostatná feature (Vinewood, Del Perro, Sandy Shores …) — pokud bude
  poptávka, přidat 7. kategorii `district` v separátní iteraci.
- **Real-time data sync** — nepoužíváme. Foxxite repo se aktualizuje řídce
  (last commit roky stará data jsou stabilní; GTA V mapa se nemění). Stačí
  jednorázový snapshot.

## 14. Sekvence implementace (pro plán)

1. Skeleton: nový typ `POIPolygon` v `types.ts`, odebrání `POIStreet`.
   `evaluateClick` polygon větev (s placeholder always-true, failing test).
2. Hit-test: `pointInPolygon`, `distanceToPolygonEdge`, `polygonHit` + unit testy.
3. Anchor rozšíření: `gtaWorld: Vec2` field v `anchorsCalibration.ts`, naplnit
   hodnotami z GTA Wiki / mod sources.
4. Transform: `fitGtaWorldTransform` v `transform.ts` + unit test (toy data
   3 body, ověří správný affine6 fit + apply round-trip).
5. Skript `scripts/import-foxxite-streets.mjs`: stažení, transform, whitelist,
   write `streetPolygons.generated.ts` + `geo-poi-ids.generated.ts`.
6. Spustit skript poprvé. Ověřit residuals < 0.01, vyřešit warnings (mismatched
   `foxxiteName` v whitelistu).
7. Refactor `pois.ts` → split na `NON_STREET_POIS` + import `STREET_POLYGONS`.
8. Storage migrace v5 → v6 + test fixtures update napříč `*.test.tsx`.
9. Rendering: `<GeoPolygon>` komponenta + integrace do `GeoMap`.
10. `pois.test.ts` validace pro polygon entries (≥4 body, closed, centroid in).
11. Manual smoke test v dev serveru — klik na ~5 ulic včetně okraje.
12. E2E `seed.ts` re-export `GEO_POI_IDS` z generated, audit spec referencí.
13. `npm run test:all` zelené (cíl: 384+ unit/component + 67 E2E).

## 15. Otevřené otázky

Žádné — všechny tři rozhodovací body (whitelist, tolerance, replace strategie)
jsou rozhodnuté v sekci 4, 7.2 a 6.2.
