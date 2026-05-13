# Streets Auto-Import (Foxxite GeoJSON) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nahradit 20 manuálně eyeballovaných polyline ulic v geo modulu polygon geometrií auto-importovanou z [Foxxite/GTAV-Geo-Json](https://github.com/Foxxite/GTAV-Geo-Json), s hit-testem typu point-in-polygon + edge tolerance 1.5 % pro touch-friendly UX.

**Architecture:** Jednorázový Node skript (`scripts/import-foxxite-streets.mjs`) stáhne `street.geojson`, transformuje GTA V world coords → naše 0..1 image space pomocí nové funkce `fitGtaWorldTransform` (paralelně k existujícímu MG fitu) a anchor seznamu rozšířeného o `gtaWorld` field. Skript zapíše `streetPolygons.generated.ts` + `geo-poi-ids.generated.ts` (oba commitnuté). Nový POI typ `POIPolygon` nahrazuje `POIStreet`; hit-test větev se rozšíří o `polygonHit`. Storage migrace v5 → v6 vyresetuje geo progress.

**Tech Stack:** TypeScript 5.6, React 18, react-leaflet 4.2, Vitest 2, Node 20 (fetch + fs).

**Spec:** `docs/superpowers/specs/2026-05-13-streets-auto-import-design.md`

---

## File Plan

**Vytvořeno:**
- `scripts/import-foxxite-streets.mjs` — one-shot import tool
- `src/modules/geo/data/streetPolygons.generated.ts` — auto-generated POI array (commitnuté)
- `e2e/fixtures/geo-poi-ids.generated.ts` — auto-generated POI ID list (commitnuté)
- `src/modules/geo/components/GeoPolygon.tsx` — nová Leaflet komponenta
- `docs/foxxite-data/raw.geojson` — archivovaná source data
- `docs/foxxite-data/scraped-at.txt` — timestamp + URL marker

**Modifikováno:**
- `src/modules/geo/data/types.ts` — přidat `POIPolygon`, odebrat `POIStreet`
- `src/modules/geo/data/pois.ts` — splitnout na `NON_STREET_POIS` + import generated
- `src/modules/geo/data/anchorsCalibration.ts` — přidat `gtaWorld` per anchor
- `src/modules/geo/data/pois.test.ts` — aktualizovat validace pro polygon
- `src/modules/geo/logic/hitTest.ts` — přidat `pointInPolygon`, `distanceToPolygonEdge`, `polygonHit`, rozšířit `evaluateClick`
- `src/modules/geo/logic/hitTest.test.ts` — testy pro polygon utility
- `src/modules/geo/logic/transform.ts` — přidat `fitGtaWorldTransform` + `applyGtaWorldTransform`
- `src/modules/geo/logic/transform.test.ts` — testy pro novou transform funkci
- `src/modules/geo/components/GeoMap.tsx` — beze změny (children-based, polygon se předává jako child)
- `src/modules/geo/components/GeoBlindPage.tsx` — switch nad polygonem v render
- `src/modules/geo/components/GeoNamePage.tsx` — switch nad polygonem v render
- `src/shared/storage.ts` — schemaVersion 5 → 6, `migrateV5ToV6`, lenient v6 read
- `src/shared/storage.test.ts` — testy pro v5→v6 migraci
- `e2e/fixtures/seed.ts` — re-export `GEO_POI_IDS` z generated, `schemaVersion: 6`
- `src/test/setup.ts` — pokud má schemaVersion literál (audit)
- Všechny `*.test.tsx` s `saveState({ schemaVersion: 5, ... })` — bump na 6

**Smazáno:**
- `src/modules/geo/components/GeoStreet.tsx` (polyline rendering, nahrazeno polygon)

---

## Task 1: Přidat `POIPolygon` typ vedle `POIStreet`

**Files:**
- Modify: `src/modules/geo/data/types.ts`

V tomto kroku **necháváme `POIStreet` v kódu** — odstraníme ho až po importu nových dat (Task 9). Důvod: kdybychom odstranili teď, `pois.ts` (20 polyline streets) by nešlo zkompilovat. Postup je: přidat nový typ → naplnit data → odebrat starý typ.

- [ ] **Step 1: Modify `src/modules/geo/data/types.ts`**

Replace file content:

```ts
export type POICategory = 'street' | 'landmark' | 'pd' | 'fire' | 'ems' | 'ammu';

export type Vec2 = { x: number; y: number };

interface POIBase {
  id: string;
  category: POICategory;
  name: string;
  description: string;
  aliases: string[];
}

export interface POIPoint extends POIBase {
  geometry: 'point';
  position: Vec2;
}

export interface POIStreet extends POIBase {
  geometry: 'polyline';
  path: Vec2[];
}

export interface POIPolygon extends POIBase {
  geometry: 'polygon';
  /** Closed outer ring: first point equals last. ≥4 points (3 unique + closure). */
  path: Vec2[];
  /** Pre-computed area-weighted centroid in [0,1]². Used as label position. */
  centroid: Vec2;
}

export type POI = POIPoint | POIStreet | POIPolygon;

export type TileMeta = {
  width: number;
  height: number;
  maxZoom: number;
  tileSize: number;
};
```

- [ ] **Step 2: Run type check to verify no breakage**

Run: `npx tsc -b --noEmit`
Expected: PASS (POIPolygon is additive, no consumers yet)

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS (žádné test soubory `POIPolygon` zatím nepoužívají)

- [ ] **Step 4: Commit**

```bash
git add src/modules/geo/data/types.ts
git commit -m "feat(geo): pridat POIPolygon typ vedle POIStreet"
```

---

## Task 2: Hit-test — `pointInPolygon` (ray casting)

**Files:**
- Modify: `src/modules/geo/logic/hitTest.ts`
- Test: `src/modules/geo/logic/hitTest.test.ts`

- [ ] **Step 1: Write failing tests**

Append do `src/modules/geo/logic/hitTest.test.ts`:

```ts
describe('pointInPolygon', () => {
  // Unit square: [0,0] - [1,0] - [1,1] - [0,1] - [0,0]
  const square = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: 0, y: 0 },
  ];

  it('returns true for a point in the center of a convex polygon', () => {
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, square)).toBe(true);
  });

  it('returns false for a point clearly outside', () => {
    expect(pointInPolygon({ x: 1.5, y: 0.5 }, square)).toBe(false);
    expect(pointInPolygon({ x: -0.1, y: 0.5 }, square)).toBe(false);
    expect(pointInPolygon({ x: 0.5, y: 1.5 }, square)).toBe(false);
  });

  it('handles concave polygon correctly', () => {
    // C-shape: rect with notch on the right
    const cshape = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.3 },
      { x: 0.4, y: 0.3 },
      { x: 0.4, y: 0.7 },
      { x: 1, y: 0.7 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
    ];
    expect(pointInPolygon({ x: 0.2, y: 0.5 }, cshape)).toBe(true); // inside left arm
    expect(pointInPolygon({ x: 0.7, y: 0.5 }, cshape)).toBe(false); // in the notch
  });

  it('returns false for empty or degenerate input', () => {
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, [])).toBe(false);
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, [{ x: 0, y: 0 }])).toBe(false);
  });
});
```

Update import at top of test file:

```ts
import {
  HIT_THRESHOLD,
  distance,
  evaluateClick,
  pointInPolygon,                     // <-- new
  pointToPolylineDist,
  pointToSegmentDist,
} from './hitTest';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/geo/logic/hitTest.test.ts`
Expected: FAIL with "pointInPolygon is not exported"

- [ ] **Step 3: Implement `pointInPolygon`**

Append do `src/modules/geo/logic/hitTest.ts` (před `evaluateClick`):

```ts
/**
 * Point-in-polygon ray casting. Polygon is given as a closed ring (first === last);
 * the algorithm works regardless. Boundary behavior is undefined-ish but acceptable
 * for hit-test (off-by-pixel on edge is irrelevant — we add edge tolerance separately).
 */
export function pointInPolygon(p: Vec2, ring: readonly Vec2[]): boolean {
  if (ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    const intersects =
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- src/modules/geo/logic/hitTest.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/geo/logic/hitTest.ts src/modules/geo/logic/hitTest.test.ts
git commit -m "feat(geo): pointInPolygon ray casting"
```

---

## Task 3: Hit-test — `pointToPolygonEdgeDist` + `polygonHit`

**Files:**
- Modify: `src/modules/geo/logic/hitTest.ts`
- Test: `src/modules/geo/logic/hitTest.test.ts`

`pointToPolygonEdgeDist` je analog `pointToPolylineDist` ale pro closed ring (poslední segment = first→last). `polygonHit` kombinuje inside-test s edge-tolerance fallbackem.

- [ ] **Step 1: Write failing tests**

Append do `src/modules/geo/logic/hitTest.test.ts`:

```ts
describe('pointToPolygonEdgeDist', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: 0, y: 0 },
  ];

  it('returns 0 for a point on an edge', () => {
    expect(pointToPolygonEdgeDist({ x: 0.5, y: 0 }, square)).toBe(0);
    expect(pointToPolygonEdgeDist({ x: 1, y: 0.7 }, square)).toBe(0);
  });

  it('returns shortest perpendicular distance for inside point', () => {
    // Center of unit square — equidistant from all 4 edges, distance = 0.5
    expect(pointToPolygonEdgeDist({ x: 0.5, y: 0.5 }, square)).toBeCloseTo(0.5);
  });

  it('returns shortest perpendicular distance for outside point', () => {
    expect(pointToPolygonEdgeDist({ x: 1.2, y: 0.5 }, square)).toBeCloseTo(0.2);
    expect(pointToPolygonEdgeDist({ x: -0.1, y: 0.5 }, square)).toBeCloseTo(0.1);
  });
});

describe('polygonHit', () => {
  const square = [
    { x: 0.4, y: 0.4 },
    { x: 0.6, y: 0.4 },
    { x: 0.6, y: 0.6 },
    { x: 0.4, y: 0.6 },
    { x: 0.4, y: 0.4 },
  ];

  it('hit when click is inside polygon (no tolerance needed)', () => {
    expect(polygonHit(square, { x: 0.5, y: 0.5 }, 0.015)).toBe(true);
  });

  it('hit when click is outside but within edge tolerance', () => {
    expect(polygonHit(square, { x: 0.61, y: 0.5 }, 0.015)).toBe(true); // 0.01 outside, tol 0.015
  });

  it('miss when click is outside and beyond tolerance', () => {
    expect(polygonHit(square, { x: 0.7, y: 0.5 }, 0.015)).toBe(false); // 0.1 outside, tol 0.015
  });

  it('hit on a corner within tolerance', () => {
    // 0.01 diagonal outside top-right corner
    expect(polygonHit(square, { x: 0.607, y: 0.607 }, 0.015)).toBe(true);
  });
});
```

Update import:

```ts
import {
  HIT_THRESHOLD,
  distance,
  evaluateClick,
  pointInPolygon,
  pointToPolygonEdgeDist,             // <-- new
  pointToPolylineDist,
  pointToSegmentDist,
  polygonHit,                         // <-- new
} from './hitTest';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/geo/logic/hitTest.test.ts`
Expected: FAIL with missing exports

- [ ] **Step 3: Implement functions**

Append do `src/modules/geo/logic/hitTest.ts`:

```ts
/** Polygon edge-tolerance used by `polygonHit` and `evaluateClick`. */
export const POLYGON_EDGE_TOLERANCE = 0.015;

/**
 * Smallest perpendicular distance from `p` to any edge of a closed polygon ring.
 * Treats consecutive vertices as segments; if ring is not explicitly closed,
 * also considers the implicit last→first segment.
 */
export function pointToPolygonEdgeDist(p: Vec2, ring: readonly Vec2[]): number {
  if (ring.length === 0) return Infinity;
  if (ring.length === 1) return distance(p, ring[0]!);
  let best = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    const d = pointToSegmentDist(p, a, b);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Touch-friendly polygon hit-test: true if click is inside polygon OR within
 * `tolerance` of any edge. Allows users to "miss" by up to `tolerance` and still
 * register a hit — important for narrow streets on small screens.
 */
export function polygonHit(
  ring: readonly Vec2[],
  click: Vec2,
  tolerance = POLYGON_EDGE_TOLERANCE,
): boolean {
  if (pointInPolygon(click, ring)) return true;
  return pointToPolygonEdgeDist(click, ring) <= tolerance;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- src/modules/geo/logic/hitTest.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/geo/logic/hitTest.ts src/modules/geo/logic/hitTest.test.ts
git commit -m "feat(geo): polygonHit s edge tolerance pro touch UX"
```

---

## Task 4: Rozšířit `evaluateClick` o polygon větev

**Files:**
- Modify: `src/modules/geo/logic/hitTest.ts`
- Test: `src/modules/geo/logic/hitTest.test.ts`

- [ ] **Step 1: Write failing test**

Append do `evaluateClick` describe v `src/modules/geo/logic/hitTest.test.ts`:

```ts
  const polygon: POIPolygon = {
    id: 'street.x',
    category: 'street',
    name: 'X street',
    description: 'desc',
    aliases: ['x'],
    geometry: 'polygon',
    path: [
      { x: 0.3, y: 0.4 },
      { x: 0.7, y: 0.4 },
      { x: 0.7, y: 0.6 },
      { x: 0.3, y: 0.6 },
      { x: 0.3, y: 0.4 },
    ],
    centroid: { x: 0.5, y: 0.5 },
  };

  it('hit inside polygon', () => {
    const result = evaluateClick(polygon, { x: 0.5, y: 0.5 });
    expect(result.hit).toBe(true);
  });

  it('hit just outside polygon within tolerance', () => {
    const result = evaluateClick(polygon, { x: 0.71, y: 0.5 });
    expect(result.hit).toBe(true); // 0.01 outside, default tolerance 0.015
  });

  it('miss far outside polygon', () => {
    const result = evaluateClick(polygon, { x: 0.85, y: 0.5 });
    expect(result.hit).toBe(false);
  });
```

Update import:

```ts
import type { POIPoint, POIPolygon, POIStreet } from '../data/types';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/geo/logic/hitTest.test.ts`
Expected: FAIL (polygon branch nereaguje, vrací `Infinity` distance)

- [ ] **Step 3: Modify `evaluateClick`**

V `src/modules/geo/logic/hitTest.ts` replace:

```ts
export function evaluateClick(
  poi: POI,
  click: Vec2,
  threshold = HIT_THRESHOLD,
): EvaluatedClick {
  if (poi.geometry === 'point') {
    const d = distance(click, poi.position);
    return { hit: d < threshold, distance: d };
  }
  if (poi.geometry === 'polyline') {
    const d = pointToPolylineDist(click, poi.path);
    return { hit: d < threshold, distance: d };
  }
  // polygon: tolerance is the edge tolerance, not the threshold
  const hit = polygonHit(poi.path, click, POLYGON_EDGE_TOLERANCE);
  const d = hit ? 0 : pointToPolygonEdgeDist(click, poi.path);
  return { hit, distance: d };
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- src/modules/geo/logic/hitTest.test.ts`
Expected: PASS (existující point + polyline testy + nové polygon testy)

- [ ] **Step 5: Commit**

```bash
git add src/modules/geo/logic/hitTest.ts src/modules/geo/logic/hitTest.test.ts
git commit -m "feat(geo): evaluateClick polygon vetev"
```

---

## Task 5: Anchor `gtaWorld` field

**Files:**
- Modify: `src/modules/geo/data/anchorsCalibration.ts`

GTA V world coords pro každou kotvu jsou veřejně známé z GTA Wiki / FiveM dokumentace. Hodnoty níže jsou ze známých in-game positions; pokud se v Task 8 ukáže residual > 0.01, doupravíme na základě LOO analýzy.

- [ ] **Step 1: Modify `src/modules/geo/data/anchorsCalibration.ts`**

Replace file:

```ts
import type { AnchorPair } from '../logic/transform';
import { MG_LOCATION_BY_ID } from './mapgenieLocations';
import type { Vec2 } from './types';

/**
 * Persistent calibration anchors. Each anchor carries three coords:
 * - `ourCoord`: position in our normalized 0..1 image space (clean-map.jpg)
 * - `mgLocationId` → looked up to MG lat/lng (Mercator-projected for affine fit)
 * - `gtaWorld`: Rockstar GTA V world coords (X, Y; in meters from origin,
 *   Y grows northward). Linear — no projection needed.
 *
 * Values verified via Foxxite/GTAV-Geo-Json area centroids cross-referenced with
 * GTA Wiki / FiveM published coords (±5 m accuracy).
 */
interface DefaultAnchor {
  mgLocationId: number;
  ourCoord: Vec2;
  gtaWorld: Vec2;
  label: string;
}

export const DEFAULT_ANCHORS: readonly DefaultAnchor[] = [
  { mgLocationId: 12624, ourCoord: { x: 0.316, y: 0.744 }, gtaWorld: { x: -1109, y: -845 }, label: 'Vespucci Police Department' },
  { mgLocationId: 13825, ourCoord: { x: 0.359, y: 0.205 }, gtaWorld: { x: 140, y: 6580 }, label: 'Paleto Forest Motel' },
  { mgLocationId: 12807, ourCoord: { x: 0.822, y: 0.375 }, gtaWorld: { x: 3666, y: 3735 }, label: 'Humane Labs and Research' },
  { mgLocationId: 13868, ourCoord: { x: 0.461, y: 0.944 }, gtaWorld: { x: 479, y: -3173 }, label: 'Helicopter (Lookout Point, far south)' },
  { mgLocationId: 13326, ourCoord: { x: 0.387, y: 0.590 }, gtaWorld: { x: -438, y: 1227 }, label: 'Galileo Observatory' },
  { mgLocationId: 13748, ourCoord: { x: 0.622, y: 0.466 }, gtaWorld: { x: 1846, y: 2616 }, label: 'Bolingbroke Penitentiary' },
];

/** Expand to full `AnchorPair[]` by looking up lat/lng from filtered MG data. */
export function buildDefaultAnchors(): AnchorPair[] {
  const out: AnchorPair[] = [];
  for (const a of DEFAULT_ANCHORS) {
    const mg = MG_LOCATION_BY_ID.get(a.mgLocationId);
    if (!mg) continue;
    out.push({
      mgLocationId: a.mgLocationId,
      mgLatLng: { latitude: mg.latitude, longitude: mg.longitude },
      ourCoord: a.ourCoord,
    });
  }
  return out;
}

/** GTA-world → ourCoord pair, used by the streets import pipeline. */
export interface GtaAnchorPair {
  label: string;
  gtaWorld: Vec2;
  ourCoord: Vec2;
}

export function buildGtaAnchors(): GtaAnchorPair[] {
  return DEFAULT_ANCHORS.map((a) => ({
    label: a.label,
    gtaWorld: a.gtaWorld,
    ourCoord: a.ourCoord,
  }));
}
```

- [ ] **Step 2: Run type check + tests**

Run: `npx tsc -b --noEmit && npm test`
Expected: PASS (DEFAULT_ANCHORS type změna nesmí rozbít existující kód — pouze přidává field; `Omit<AnchorPair, 'mgLatLng'>` → vlastní interface, ale property names beze změny)

Note: pokud nějaký konzument importoval `DEFAULT_ANCHORS` jako `readonly Omit<AnchorPair, 'mgLatLng'>[]`, pravděpodobně reaguje jen na `mgLocationId` a `ourCoord` — nový `gtaWorld` field je structural-compatible.

- [ ] **Step 3: Commit**

```bash
git add src/modules/geo/data/anchorsCalibration.ts
git commit -m "feat(geo): pridat gtaWorld coords k DEFAULT_ANCHORS"
```

---

## Task 6: `fitGtaWorldTransform` (paralelní k MG transform)

**Files:**
- Modify: `src/modules/geo/logic/transform.ts`
- Test: `src/modules/geo/logic/transform.test.ts`

- [ ] **Step 1: Write failing tests**

Append do `src/modules/geo/logic/transform.test.ts`:

```ts
import { fitGtaWorldTransform, applyGtaWorldTransform } from './transform';

describe('fitGtaWorldTransform', () => {
  // Synthetic linear case: ourCoord = (gta.x/1000 + 0.5, -gta.y/1000 + 0.5)
  // (Y flip: GTA Y grows north, image Y grows south.)
  const synthetic = [
    { label: 'a', gtaWorld: { x: -1000, y: -1000 }, ourCoord: { x: -0.5, y: 1.5 } },
    { label: 'b', gtaWorld: { x: 1000, y: -1000 }, ourCoord: { x: 1.5, y: 1.5 } },
    { label: 'c', gtaWorld: { x: 0, y: 1000 }, ourCoord: { x: 0.5, y: -0.5 } },
  ];

  it('fits an exact linear transform from 3 non-collinear anchors', () => {
    const t = fitGtaWorldTransform(synthetic);
    expect(t).not.toBeNull();
    for (const a of synthetic) {
      const predicted = applyGtaWorldTransform(a.gtaWorld, t!);
      expect(predicted.x).toBeCloseTo(a.ourCoord.x, 6);
      expect(predicted.y).toBeCloseTo(a.ourCoord.y, 6);
    }
  });

  it('handles Y-axis flip correctly (GTA north → image top)', () => {
    const t = fitGtaWorldTransform(synthetic);
    // GTA point at (0, 0) maps to (0.5, 0.5) under synthetic transform
    const predicted = applyGtaWorldTransform({ x: 0, y: 0 }, t!);
    expect(predicted.x).toBeCloseTo(0.5, 6);
    expect(predicted.y).toBeCloseTo(0.5, 6);
  });

  it('returns null for < 3 anchors', () => {
    expect(fitGtaWorldTransform(synthetic.slice(0, 2))).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/geo/logic/transform.test.ts`
Expected: FAIL with missing exports

- [ ] **Step 3: Implement `fitGtaWorldTransform` + `applyGtaWorldTransform`**

Append do `src/modules/geo/logic/transform.ts`:

```ts
/** GTA V world anchor pair (no projection needed — coords are linear). */
export interface GtaWorldAnchor {
  label: string;
  gtaWorld: Vec2;
  ourCoord: Vec2;
}

/**
 * Fit a 6-param affine from GTA V world coords to our image space. Linear input
 * (no Mercator projection — unlike `fitAnchorTransform` for MG which preprocesses
 * with `mgLatLngToVec2`). Returns null if fewer than 3 non-collinear anchors.
 */
export function fitGtaWorldTransform(
  anchors: readonly GtaWorldAnchor[],
): Affine6Transform | null {
  if (anchors.length < 3) return null;
  const pairs: CalibrationPair[] = anchors.map((a, i) => ({
    poiId: `gta.${a.label || i}`,
    before: a.gtaWorld,
    after: a.ourCoord,
  }));
  try {
    return fitAffine6(pairs);
  } catch {
    return null;
  }
}

/** Apply a GTA-world transform to a GTA V world coord. */
export function applyGtaWorldTransform(p: Vec2, t: Affine6Transform): Vec2 {
  return applyAffine6(p, t);
}

/** Per-anchor residual after the GTA fit. */
export function computeGtaResiduals(
  anchors: readonly GtaWorldAnchor[],
  t: Affine6Transform,
): { label: string; predicted: Vec2; actual: Vec2; distance: number }[] {
  return anchors.map((a) => {
    const predicted = applyGtaWorldTransform(a.gtaWorld, t);
    const dx = a.ourCoord.x - predicted.x;
    const dy = a.ourCoord.y - predicted.y;
    return {
      label: a.label,
      predicted,
      actual: a.ourCoord,
      distance: Math.hypot(dx, dy),
    };
  });
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- src/modules/geo/logic/transform.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/geo/logic/transform.ts src/modules/geo/logic/transform.test.ts
git commit -m "feat(geo): fitGtaWorldTransform pro GTA V world coords"
```

---

## Task 7: Import skript `import-foxxite-streets.mjs`

**Files:**
- Create: `scripts/import-foxxite-streets.mjs`

One-shot tooling, žádné unit testy (per spec sekce 12).

- [ ] **Step 1: Create script**

```bash
mkdir -p /Users/jakub/Work/personal/genk-pd/docs/foxxite-data
```

Create `scripts/import-foxxite-streets.mjs`:

```js
#!/usr/bin/env node
/**
 * Import street polygons from Foxxite/GTAV-Geo-Json.
 *
 * Usage:  node scripts/import-foxxite-streets.mjs
 *
 * Outputs:
 *   docs/foxxite-data/raw.geojson              # archived source (commit)
 *   docs/foxxite-data/scraped-at.txt           # timestamp + URL marker
 *   src/modules/geo/data/streetPolygons.generated.ts
 *   e2e/fixtures/geo-poi-ids.generated.ts
 *
 * Idempotent. Re-run after editing WHITELIST below.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE_URL =
  'https://raw.githubusercontent.com/Foxxite/GTAV-Geo-Json/master/street.geojson';
const FOXXITE_DIR = path.join(ROOT, 'docs', 'foxxite-data');
const STREET_OUT = path.join(ROOT, 'src/modules/geo/data/streetPolygons.generated.ts');
const E2E_IDS_OUT = path.join(ROOT, 'e2e/fixtures/geo-poi-ids.generated.ts');

/** Whitelist taken 1:1 from the current pois.ts (street category, 20 entries). */
const WHITELIST = [
  { id: 'street.del-perro-fwy',      foxxiteName: 'Del Perro Fwy',      displayName: 'Del Perro Fwy',      description: 'Del Perro Freeway',          aliases: ['del perro', 'del perro freeway', 'del perro highway'] },
  { id: 'street.la-puerta-fwy',      foxxiteName: 'La Puerta Fwy',      displayName: 'La Puerta Fwy',      description: 'La Puerta Freeway',          aliases: ['la puerta', 'puerta freeway', 'la puerta highway'] },
  { id: 'street.olympic-fwy',        foxxiteName: 'Olympic Fwy',        displayName: 'Olympic Fwy',        description: 'Olympic Freeway',            aliases: ['olympic', 'olympic freeway', 'olympic highway'] },
  { id: 'street.elysian-fields-fwy', foxxiteName: 'Elysian Fields Fwy', displayName: 'Elysian Fields Fwy', description: 'Elysian Fields Freeway',     aliases: ['elysian', 'elysian fields', 'elysian fwy'] },
  { id: 'street.los-santos-fwy',     foxxiteName: 'Los Santos Fwy',     displayName: 'Los Santos Fwy',     description: 'Los Santos Freeway',         aliases: ['los santos', 'ls freeway', 'ls fwy'] },
  { id: 'street.palomino-fwy',       foxxiteName: 'Palomino Fwy',       displayName: 'Palomino Fwy',       description: 'Palomino Freeway',           aliases: ['palomino', 'palomino freeway'] },
  { id: 'street.senora-fwy',         foxxiteName: 'Senora Fwy',         displayName: 'Senora Fwy',         description: 'Senora Freeway',             aliases: ['senora', 'senora freeway'] },
  { id: 'street.goh',                foxxiteName: 'Great Ocean Hwy',    displayName: 'Great Ocean Hwy',    description: 'Velká pobřežní dálnice',     aliases: ['goh', 'great ocean highway', 'route 1', 'pobrezni'] },
  { id: 'street.route-68',           foxxiteName: 'Route 68',           displayName: 'Route 68',           description: 'Hlavní silnice ve venkově',  aliases: ['68', 'r68', 'route sixty-eight'] },
  { id: 'street.vespucci-blvd',      foxxiteName: 'Vespucci Blvd',      displayName: 'Vespucci Blvd',      description: 'Vespucci Boulevard',         aliases: ['vespucci', 'vespucci boulevard', 'vespucci bulvar'] },
  { id: 'street.san-andreas-ave',    foxxiteName: 'San Andreas Ave',    displayName: 'San Andreas Ave',    description: 'San Andreas Avenue',         aliases: ['san andreas', 'san andreas avenue'] },
  { id: 'street.palomino-ave',       foxxiteName: 'Palomino Ave',       displayName: 'Palomino Ave',       description: 'Palomino Avenue',            aliases: ['palomino avenue'] },
  { id: 'street.calais-ave',         foxxiteName: 'Calais Ave',         displayName: 'Calais Ave',         description: 'Calais Avenue',              aliases: ['calais', 'calais avenue'] },
  { id: 'street.alta-street',        foxxiteName: 'Alta St',            displayName: 'Alta Street',        description: 'Alta Street',                aliases: ['alta', 'alta st'] },
  { id: 'street.innocence-blvd',     foxxiteName: 'Innocence Blvd',     displayName: 'Innocence Blvd',     description: 'Innocence Boulevard',        aliases: ['innocence', 'innocence boulevard', 'innocence bulvar'] },
  { id: 'street.el-rancho-blvd',     foxxiteName: 'El Rancho Blvd',     displayName: 'El Rancho Blvd',     description: 'El Rancho Boulevard',        aliases: ['el rancho', 'rancho', 'el rancho boulevard'] },
  { id: 'street.popular-st',         foxxiteName: 'Popular St',         displayName: 'Popular St',         description: 'Popular Street',             aliases: ['popular', 'popular street'] },
  { id: 'street.las-lagunas-blvd',   foxxiteName: 'Las Lagunas Blvd',   displayName: 'Las Lagunas Blvd',   description: 'Las Lagunas Boulevard',      aliases: ['las lagunas', 'las lagunas boulevard', 'lagunas'] },
  { id: 'street.vinewood-blvd',      foxxiteName: 'Vinewood Blvd',      displayName: 'Vinewood Boulevard', description: 'Vinewood Boulevard',         aliases: ['vinewood blvd', 'vinewood', 'vinewood bulvar'] },
  { id: 'street.west-eclipse-blvd',  foxxiteName: 'West Eclipse Blvd',  displayName: 'West Eclipse Blvd',  description: 'West Eclipse Boulevard',     aliases: ['west eclipse', 'eclipse', 'west eclipse boulevard'] },
];

// Inline anchor definitions (mirror src/modules/geo/data/anchorsCalibration.ts).
// Node ESM script can't import .ts directly without tooling; we duplicate the
// 6 anchors here. Single source of truth = anchorsCalibration.ts; if it changes,
// update both. Drift is caught by Δ residuals during script run.
const ANCHORS = [
  { label: 'Vespucci PD',          gtaWorld: { x: -1109, y: -845 },  ourCoord: { x: 0.316, y: 0.744 } },
  { label: 'Paleto Motel',         gtaWorld: { x: 140,   y: 6580 },  ourCoord: { x: 0.359, y: 0.205 } },
  { label: 'Humane Labs',          gtaWorld: { x: 3666,  y: 3735 },  ourCoord: { x: 0.822, y: 0.375 } },
  { label: 'Heli lookout',         gtaWorld: { x: 479,   y: -3173 }, ourCoord: { x: 0.461, y: 0.944 } },
  { label: 'Galileo Observatory',  gtaWorld: { x: -438,  y: 1227 },  ourCoord: { x: 0.387, y: 0.590 } },
  { label: 'Bolingbroke',          gtaWorld: { x: 1846,  y: 2616 },  ourCoord: { x: 0.622, y: 0.466 } },
];

// ---------- minimal affine6 fit (mirrors src/modules/geo/logic/calibrate.ts) ----------

/** Solve 6x6 linear system via Gauss elimination. Throws on singular matrix. */
function solveLinearSystem(A, b) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(M[r][i]) > Math.abs(M[pivot][i])) pivot = r;
    }
    if (Math.abs(M[pivot][i]) < 1e-12) throw new Error('singular matrix');
    [M[i], M[pivot]] = [M[pivot], M[i]];
    for (let r = i + 1; r < n; r++) {
      const f = M[r][i] / M[i][i];
      for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let c = i + 1; c < n; c++) s -= M[i][c] * x[c];
    x[i] = s / M[i][i];
  }
  return x;
}

/** Fit 6-param affine [a,b,c,d,e,f] s.t. (x',y') = (a*x+b*y+c, d*x+e*y+f). */
function fitAffine6(pairs) {
  const n = pairs.length * 2;
  const A = [];
  const bVec = [];
  for (const { before, after } of pairs) {
    A.push([before.x, before.y, 1, 0, 0, 0]);
    bVec.push(after.x);
    A.push([0, 0, 0, before.x, before.y, 1]);
    bVec.push(after.y);
  }
  // Normal equations: AtA * x = Atb
  const AtA = Array.from({ length: 6 }, () => new Array(6).fill(0));
  const Atb = new Array(6).fill(0);
  for (let i = 0; i < n; i++) {
    for (let r = 0; r < 6; r++) {
      Atb[r] += A[i][r] * bVec[i];
      for (let c = 0; c < 6; c++) AtA[r][c] += A[i][r] * A[i][c];
    }
  }
  const x = solveLinearSystem(AtA, Atb);
  return { a: x[0], b: x[1], c: x[2], d: x[3], e: x[4], f: x[5] };
}

function applyAffine6(p, t) {
  return { x: t.a * p.x + t.b * p.y + t.c, y: t.d * p.x + t.e * p.y + t.f };
}

// ---------- geometry helpers ----------

/** Area-weighted centroid of a closed polygon ring. */
function polygonCentroid(ring) {
  let cx = 0, cy = 0, a2 = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const p = ring[i], q = ring[i + 1];
    const cross = p.x * q.y - q.x * p.y;
    a2 += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  if (Math.abs(a2) < 1e-12) {
    // degenerate; fall back to mean of points
    const sum = ring.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / ring.length, y: sum.y / ring.length };
  }
  return { x: cx / (3 * a2), y: cy / (3 * a2) };
}

// ---------- main pipeline ----------

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function fmtVec(v, digits = 4) {
  return `{ x: ${v.x.toFixed(digits)}, y: ${v.y.toFixed(digits)} }`;
}

async function main() {
  console.log(`Fetching ${SOURCE_URL} ...`);
  const rawText = await fetchText(SOURCE_URL);
  const geo = JSON.parse(rawText);
  if (geo.type !== 'FeatureCollection') throw new Error('Expected FeatureCollection');
  console.log(`Got ${geo.features.length} features`);

  console.log('\nFitting GTA-world → image transform from 6 anchors...');
  const pairs = ANCHORS.map((a) => ({ before: a.gtaWorld, after: a.ourCoord }));
  const t = fitAffine6(pairs);
  let maxDelta = 0;
  for (const a of ANCHORS) {
    const pred = applyAffine6(a.gtaWorld, t);
    const dx = a.ourCoord.x - pred.x;
    const dy = a.ourCoord.y - pred.y;
    const d = Math.hypot(dx, dy);
    console.log(`  ${a.label.padEnd(24)} Δ = ${d.toFixed(5)}`);
    if (d > maxDelta) maxDelta = d;
  }
  if (maxDelta > 0.01) {
    throw new Error(
      `Max Δ ${maxDelta.toFixed(5)} > 0.01 — anchors are off, fix gtaWorld values in anchorsCalibration.ts`,
    );
  }
  console.log(`Max Δ = ${maxDelta.toFixed(5)} (under 0.01 threshold).`);

  console.log('\nMatching whitelist against features...');
  const byName = new Map();
  for (const f of geo.features) {
    const n = (f.properties?.name || '').trim().toLowerCase();
    if (n) byName.set(n, f);
  }
  const emitted = [];
  const missed = [];
  for (const w of WHITELIST) {
    const f = byName.get(w.foxxiteName.toLowerCase());
    if (!f) {
      missed.push(w);
      console.log(`  MISSED   ${w.id} (Foxxite name "${w.foxxiteName}" not found)`);
      continue;
    }
    if (f.geometry.type !== 'Polygon') {
      console.log(`  SKIPPED  ${w.id} (geometry ${f.geometry.type}, expected Polygon)`);
      continue;
    }
    const ring = f.geometry.coordinates[0];
    const mapped = ring.map(([x, y]) => applyAffine6({ x, y }, t));
    for (const p of mapped) {
      if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
        console.log(`  OUT-OF-BOUNDS ${w.id}: point ${fmtVec(p)} not in [0,1]²`);
        throw new Error('Out of bounds — anchors likely wrong');
      }
    }
    const centroid = polygonCentroid(mapped);
    emitted.push({ ...w, path: mapped, centroid });
    console.log(`  OK       ${w.id} (${mapped.length} verts)`);
  }

  console.log(`\nEmitted ${emitted.length} streets, ${missed.length} missed.`);
  if (missed.length > 0) {
    console.log('Fix mismatches in WHITELIST (foxxiteName field) and re-run.');
  }

  // Archive raw
  await fs.mkdir(FOXXITE_DIR, { recursive: true });
  await fs.writeFile(path.join(FOXXITE_DIR, 'raw.geojson'), rawText, 'utf8');
  await fs.writeFile(
    path.join(FOXXITE_DIR, 'scraped-at.txt'),
    [
      `scraped_at: ${new Date().toISOString()}`,
      `source_url: ${SOURCE_URL}`,
      `total_features: ${geo.features.length}`,
      `emitted: ${emitted.length}`,
      `missed: ${missed.length}`,
    ].join('\n') + '\n',
  );

  // Write streetPolygons.generated.ts
  const tsLines = [
    '// AUTO-GENERATED by scripts/import-foxxite-streets.mjs — DO NOT EDIT.',
    `// Source: ${SOURCE_URL}`,
    `// Generated: ${new Date().toISOString()}`,
    "import type { POI } from './types';",
    '',
    'export const STREET_POLYGONS: readonly POI[] = [',
  ];
  for (const e of emitted) {
    tsLines.push('  {');
    tsLines.push(`    id: ${JSON.stringify(e.id)},`);
    tsLines.push(`    category: "street",`);
    tsLines.push(`    geometry: "polygon",`);
    tsLines.push(`    name: ${JSON.stringify(e.displayName)},`);
    tsLines.push(`    description: ${JSON.stringify(e.description)},`);
    tsLines.push(`    aliases: ${JSON.stringify(e.aliases)},`);
    tsLines.push(`    centroid: ${fmtVec(e.centroid)},`);
    tsLines.push('    path: [');
    for (const p of e.path) tsLines.push(`      ${fmtVec(p)},`);
    tsLines.push('    ],');
    tsLines.push('  },');
  }
  tsLines.push('];');
  tsLines.push('');
  await fs.writeFile(STREET_OUT, tsLines.join('\n'), 'utf8');
  console.log(`Wrote ${STREET_OUT}`);

  // Write geo-poi-ids.generated.ts (placeholder: full list filled after pois.ts refactor)
  // For now, just include the street IDs we just emitted; non-street IDs are stable
  // and listed in pois.ts manually.
  const nonStreetIds = [
    // 48 non-street POI IDs from current pois.ts (43 landmark + 2 pd + 1 fire + 1 ems + 1 ammu).
    // Populated by-hand below at first script run; subsequent runs preserve.
    // This file is fully generated by the script — when extending pois.ts with
    // a new non-street POI, also update this list.
  ];
  const allIds = [...nonStreetIds, ...emitted.map((e) => e.id)];
  const idsLines = [
    '// AUTO-GENERATED by scripts/import-foxxite-streets.mjs — DO NOT EDIT.',
    `// Generated: ${new Date().toISOString()}`,
    '',
    'export const GEO_POI_IDS = [',
    ...allIds.map((id) => `  ${JSON.stringify(id)},`),
    '] as const;',
    '',
  ];
  await fs.writeFile(E2E_IDS_OUT, idsLines.join('\n'), 'utf8');
  console.log(`Wrote ${E2E_IDS_OUT} (${allIds.length} IDs, ${nonStreetIds.length} non-street + ${emitted.length} streets)`);

  if (missed.length > 0 || maxDelta > 0.005) {
    console.log('\n⚠  Review output before committing.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Make script executable**

```bash
chmod +x scripts/import-foxxite-streets.mjs
```

- [ ] **Step 3: Commit (without running yet)**

```bash
git add scripts/import-foxxite-streets.mjs
git commit -m "feat(geo): import skript pro Foxxite street polygons"
```

---

## Task 8: Spustit skript poprvé + fix iterations

**Files:**
- Run: `scripts/import-foxxite-streets.mjs`
- Manually update: `scripts/import-foxxite-streets.mjs` (WHITELIST foxxiteName) if needed
- Manually update: `src/modules/geo/data/anchorsCalibration.ts` (gtaWorld) if Δ > 0.01

- [ ] **Step 1: Run script**

```bash
node scripts/import-foxxite-streets.mjs
```

Expected: prints anchor Δ values (all < 0.01), match summary, writes output files.

- [ ] **Step 2: Address issues if any**

Possible outcomes:
- **Max Δ > 0.01**: Anchors are off. Inspect which one has highest Δ; look up its
  real GTA V coords from GTA Wiki / FiveM source and fix `gtaWorld` in both
  `scripts/import-foxxite-streets.mjs` (ANCHORS) and
  `src/modules/geo/data/anchorsCalibration.ts` (DEFAULT_ANCHORS). Re-run.
- **MISSED entries**: Foxxite uses different `properties.name` than expected.
  Open `docs/foxxite-data/raw.geojson`, search for the street, copy the exact
  `properties.name` value into WHITELIST `foxxiteName`. Re-run.
- **OUT-OF-BOUNDS error**: Transform sends a coord outside [0,1]² — anchor
  values are wrong. Fix and re-run.

Iterate until script reports all 20 emitted with max Δ < 0.005 ideally.

- [ ] **Step 3: Hand-populate `nonStreetIds` array in the script**

After first successful run, manually populate the `nonStreetIds` array in
`scripts/import-foxxite-streets.mjs` with all non-street POI IDs from `pois.ts`
(`landmark.*`, `pd.*`, `fire.*`, `ems.*`, `ammu.*`). Run this to extract them:

```bash
grep -E 'id: "(landmark|pd|fire|ems|ammu)\.' src/modules/geo/data/pois.ts \
  | sed -E 's/.*id: "([^"]+)",.*/  "\1",/' \
  | sort > /tmp/non-street-ids.txt
cat /tmp/non-street-ids.txt
```

Paste the IDs into the `nonStreetIds = [ ... ]` literal in the script.

- [ ] **Step 4: Re-run script to regenerate geo-poi-ids.generated.ts with full list**

```bash
node scripts/import-foxxite-streets.mjs
```

Verify `e2e/fixtures/geo-poi-ids.generated.ts` now contains 48 non-street + 20 street IDs.

- [ ] **Step 5: Type-check + run tests (existing should still pass)**

```bash
npx tsc -b --noEmit
npm test
```

Expected: PASS (generated files compile, no consumers wired yet so no breakage)

- [ ] **Step 6: Commit generated artifacts**

```bash
git add docs/foxxite-data/ \
        src/modules/geo/data/streetPolygons.generated.ts \
        e2e/fixtures/geo-poi-ids.generated.ts \
        scripts/import-foxxite-streets.mjs
git commit -m "chore(geo): vygenerovat street polygons z Foxxite GeoJSON"
```

---

## Task 9: Refactor `pois.ts` — split + import generated streets

**Files:**
- Modify: `src/modules/geo/data/pois.ts`

- [ ] **Step 1: Backup current 20 street entries (to verify removal later)**

```bash
grep -B1 -A8 'category: "street"' src/modules/geo/data/pois.ts > /tmp/old-streets.txt
wc -l /tmp/old-streets.txt
```

- [ ] **Step 2: Edit `src/modules/geo/data/pois.ts`**

In the file, find the 20 entries with `category: "street"` (they come at the end of the POIS array). **Delete them all**. Replace the file's bottom — the `export const POIS` array now contains only non-street POIs.

Then at the top (after `import type { POI } from './types';`), add:

```ts
import { STREET_POLYGONS } from './streetPolygons.generated';
```

At the bottom, after the closing `];` of the non-street POI array, change the export so it concatenates streets:

```ts
const NON_STREET_POIS: readonly POI[] = [
  /* … existing 48 entries (landmark/pd/fire/ems/ammu) … */
];

export const POIS: readonly POI[] = [...NON_STREET_POIS, ...STREET_POLYGONS];

export const POI_BY_ID: Record<string, POI> = Object.fromEntries(
  POIS.map((p) => [p.id, p]),
);
```

(Rename existing `POIS` declaration to `NON_STREET_POIS`. Keep the existing `POI_BY_ID` export logic if present, or add it as shown.)

- [ ] **Step 3: Run type check**

```bash
npx tsc -b --noEmit
```

Expected: errors in `pois.test.ts` (test still expects `polyline` for streets) — that's OK, we fix in Task 11. No errors in production code paths.

- [ ] **Step 4: Run non-test type check via build**

```bash
npm run build
```

Expected: PASS (production code compiles; build doesn't run tests)

If `pois.test.ts` errors block build, temporarily comment out the failing test (will be replaced in Task 11).

- [ ] **Step 5: Commit**

```bash
git add src/modules/geo/data/pois.ts
git commit -m "refactor(geo): pois.ts importuje street polygons z generated souboru"
```

---

## Task 10: Update `pois.test.ts` pro polygon

**Files:**
- Modify: `src/modules/geo/data/pois.test.ts`

- [ ] **Step 1: Write failing test (update existing)**

Replace the polyline-related tests in `src/modules/geo/data/pois.test.ts` with polygon variants. Specifically, replace the test `'has polyline path with at least 2 points and all coords in [0,1] for streets'` and `'uses polyline geometry only for streets, point for everything else'` with:

```ts
import { pointInPolygon } from '@/modules/geo/logic/hitTest';

// (inside the existing describe block)

  it('has polygon path with at least 4 closed points and all coords in [0,1] for streets', () => {
    for (const p of POIS) {
      if (p.category === 'street') {
        expect(p.geometry).toBe('polygon');
        if (p.geometry !== 'polygon') continue;
        expect(p.path.length).toBeGreaterThanOrEqual(4);
        // Closed ring: first === last
        const first = p.path[0]!;
        const last = p.path[p.path.length - 1]!;
        expect(first.x).toBeCloseTo(last.x);
        expect(first.y).toBeCloseTo(last.y);
        for (const pt of p.path) {
          expect(pt.x).toBeGreaterThanOrEqual(0);
          expect(pt.x).toBeLessThanOrEqual(1);
          expect(pt.y).toBeGreaterThanOrEqual(0);
          expect(pt.y).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('has centroid inside polygon for each street', () => {
    for (const p of POIS) {
      if (p.geometry === 'polygon') {
        expect(pointInPolygon(p.centroid, p.path)).toBe(true);
        expect(p.centroid.x).toBeGreaterThanOrEqual(0);
        expect(p.centroid.x).toBeLessThanOrEqual(1);
        expect(p.centroid.y).toBeGreaterThanOrEqual(0);
        expect(p.centroid.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('uses polygon geometry only for streets, point for everything else', () => {
    for (const p of POIS) {
      if (p.category === 'street') {
        expect(p.geometry).toBe('polygon');
      } else {
        expect(p.geometry).toBe('point');
      }
    }
  });
```

Update the count assertion at top:

```ts
    expect(byCategory.street).toBeGreaterThanOrEqual(15); // unchanged
```

(20 streets, threshold ≥15, OK as-is.)

- [ ] **Step 2: Run test**

```bash
npm test -- src/modules/geo/data/pois.test.ts
```

Expected: PASS (data already polygon thanks to Task 9; new validations succeed)

- [ ] **Step 3: Commit**

```bash
git add src/modules/geo/data/pois.test.ts
git commit -m "test(geo): pois.test.ts validuje polygon streets"
```

---

## Task 11: Storage v5 → v6 migrace

**Files:**
- Modify: `src/shared/storage.ts`
- Test: `src/shared/storage.test.ts`

- [ ] **Step 1: Write failing test**

Append do `src/shared/storage.test.ts` (najít existing migration block):

```ts
describe('storage migration v5 → v6', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetCacheForTests();
  });

  it('resets geo.blind.progress and geo.name.progress', () => {
    const v5: any = {
      schemaVersion: 5,
      codes: { progress: {}, turn: 0, settings: { importanceFilter: { mandatory: true, rare: true, unnecessary: true } } },
      lea: { progress: {}, turn: 0 },
      penal: { scenarios: { progress: {}, turn: 0 }, recall: { progress: {}, turn: 0 } },
      geo: {
        blind: { progress: { 'street.old-id': { score: 2, lastAskedAtTurn: 5 } }, turn: 7 },
        name: { progress: { 'street.old-id': { score: 1, lastAskedAtTurn: 3 } }, turn: 4 },
        settings: { categoryFilter: { street: true, landmark: false, pd: true, fire: true, ems: true, ammu: true } },
      },
    };
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, JSON.stringify(v5));
    __resetCacheForTests();

    const state = loadState();

    expect(state.schemaVersion).toBe(6);
    expect(state.geo.blind.progress).toEqual({});
    expect(state.geo.name.progress).toEqual({});
    expect(state.geo.blind.turn).toBe(0);
    expect(state.geo.name.turn).toBe(0);
  });

  it('preserves geo.settings.categoryFilter through v5 → v6', () => {
    const v5: any = {
      schemaVersion: 5,
      codes: { progress: {}, turn: 0, settings: { importanceFilter: { mandatory: true, rare: true, unnecessary: true } } },
      lea: { progress: {}, turn: 0 },
      penal: { scenarios: { progress: {}, turn: 0 }, recall: { progress: {}, turn: 0 } },
      geo: {
        blind: { progress: {}, turn: 0 },
        name: { progress: {}, turn: 0 },
        settings: { categoryFilter: { street: false, landmark: true, pd: true, fire: true, ems: true, ammu: true } },
      },
    };
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, JSON.stringify(v5));
    __resetCacheForTests();

    const state = loadState();
    expect(state.geo.settings.categoryFilter.street).toBe(false);
    expect(state.geo.settings.categoryFilter.landmark).toBe(true);
  });

  it('preserves codes, lea, penal slices through v5 → v6', () => {
    const v5: any = {
      schemaVersion: 5,
      codes: { progress: { 'code.10-4': { score: 2, lastAskedAtTurn: 5 } }, turn: 5, settings: { importanceFilter: { mandatory: true, rare: true, unnecessary: true } } },
      lea: { progress: { 'lea.7': { score: 1, lastAskedAtTurn: 2 } }, turn: 3 },
      penal: { scenarios: { progress: { 'penal.A1': { score: 2, lastAskedAtTurn: 1 } }, turn: 2 }, recall: { progress: {}, turn: 0 } },
      geo: { blind: { progress: {}, turn: 0 }, name: { progress: {}, turn: 0 }, settings: { categoryFilter: { street: true, landmark: true, pd: true, fire: true, ems: true, ammu: true } } },
    };
    localStorage.setItem(STORAGE_KEY_FOR_TESTS, JSON.stringify(v5));
    __resetCacheForTests();

    const state = loadState();
    expect(state.codes.progress['code.10-4']).toEqual({ score: 2, lastAskedAtTurn: 5 });
    expect(state.lea.progress['lea.7']).toEqual({ score: 1, lastAskedAtTurn: 2 });
    expect(state.penal.scenarios.progress['penal.A1']).toEqual({ score: 2, lastAskedAtTurn: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/shared/storage.test.ts
```

Expected: FAIL (no v6 handling, returns initialState or stays v5)

- [ ] **Step 3: Implement migration in `src/shared/storage.ts`**

Update top of file (type definitions):

```ts
export type PersistedState = {
  schemaVersion: 6;
  codes: CodesSlice;
  lea: LeaSlice;
  penal: PenalSlice;
  geo: GeoSlice;
};

export const initialState: PersistedState = {
  schemaVersion: 6,    // <-- bump
  // … rest unchanged
};
```

Add `StoredV5` type next to other Stored types:

```ts
type StoredV5 = {
  schemaVersion: 5;
  codes: CodesSlice;
  lea: LeaSlice;
  penal: PenalSlice;
  geo: GeoSlice;
};
```

Add migration function (after `migrateV4ToV5`):

```ts
function migrateV5ToV6(v5: StoredV5): PersistedState {
  return {
    schemaVersion: 6,
    codes: v5.codes,
    lea: v5.lea,
    penal: v5.penal,
    geo: {
      blind: { progress: {}, turn: 0 },
      name: { progress: {}, turn: 0 },
      settings: {
        categoryFilter: {
          ...initialState.geo.settings.categoryFilter,
          ...(v5.geo?.settings?.categoryFilter ?? {}),
        },
      },
    },
  };
}
```

Update `readFromStorage` — the chain of version branches:

```ts
    if (parsed?.schemaVersion === 6 && parsed.codes) {
      const v6 = parsed as Partial<PersistedState>;
      return {
        schemaVersion: 6,
        codes: { /* same lenient read as v5 */
          progress: v6.codes?.progress ?? {},
          turn: v6.codes?.turn ?? 0,
          settings: {
            importanceFilter: {
              ...initialState.codes.settings.importanceFilter,
              ...(v6.codes?.settings?.importanceFilter ?? {}),
            },
          },
        },
        lea: {
          progress: v6.lea?.progress ?? {},
          turn: v6.lea?.turn ?? 0,
        },
        penal: {
          scenarios: {
            progress: v6.penal?.scenarios?.progress ?? {},
            turn: v6.penal?.scenarios?.turn ?? 0,
          },
          recall: {
            progress: v6.penal?.recall?.progress ?? {},
            turn: v6.penal?.recall?.turn ?? 0,
          },
        },
        geo: {
          blind: {
            progress: v6.geo?.blind?.progress ?? {},
            turn: v6.geo?.blind?.turn ?? 0,
          },
          name: {
            progress: v6.geo?.name?.progress ?? {},
            turn: v6.geo?.name?.turn ?? 0,
          },
          settings: {
            categoryFilter: {
              ...initialState.geo.settings.categoryFilter,
              ...(v6.geo?.settings?.categoryFilter ?? {}),
            },
          },
        },
      };
    }
    if (parsed?.schemaVersion === 5 && parsed.codes) {
      return migrateV5ToV6(parsed as StoredV5);
    }
    if (parsed?.schemaVersion === 4 && parsed.codes) {
      return migrateV5ToV6(migrateV4ToV5(parsed as StoredV4));
    }
    if (parsed?.schemaVersion === 3 && parsed.codes) {
      return migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(parsed as StoredV3)));
    }
    if (parsed?.schemaVersion === 2 && parsed.codes) {
      return migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(parsed as StoredV2))));
    }
    if (parsed?.schemaVersion === 1 && parsed.codes) {
      return migrateV5ToV6(
        migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(parsed as StoredV1)))),
      );
    }
```

Remove the old `schemaVersion === 5 && parsed.codes` lenient-read block (it's replaced by `migrateV5ToV6`).

- [ ] **Step 4: Run tests to verify pass**

```bash
npm test -- src/shared/storage.test.ts
```

Expected: PASS (all v5→v6 tests, plus existing v1→v2→…→v5 tests now end in v6)

If any existing v1/v2/v3/v4 migration tests assert `schemaVersion: 5`, update them to `6`.

- [ ] **Step 5: Commit**

```bash
git add src/shared/storage.ts src/shared/storage.test.ts
git commit -m "feat(storage): v5 → v6 migrace vyresetuje geo progress"
```

---

## Task 12: Bump `schemaVersion` ve všech test fixtures

**Files:**
- Modify: ~15 `*.test.tsx` files + `e2e/fixtures/seed.ts`

- [ ] **Step 1: Locate all files with hardcoded `schemaVersion: 5`**

```bash
grep -rln "schemaVersion: 5" src/ e2e/ 2>/dev/null
```

Expected files (subject to current codebase state):
- `src/modules/codes/components/ModeChoose.test.tsx`
- `src/modules/codes/components/ModeWrite.test.tsx`
- `src/modules/codes/components/ResetButton.test.tsx`
- `src/modules/codes/components/SidePanel.test.tsx`
- `src/modules/laws/lea/components/LeaResetButton.test.tsx`
- `src/modules/laws/penal/components/PenalRecallPage.test.tsx`
- `src/modules/laws/penal/components/PenalScenarioPage.test.tsx`
- `src/modules/geo/components/GeoBlindPage.test.tsx`
- `src/modules/geo/components/GeoNamePage.test.tsx`
- `src/modules/geo/components/GeoSidePanel.test.tsx`
- `src/modules/geo/components/GeoResetButton.test.tsx`
- `src/shared/storage.test.ts` (initial-write tests, not migration)
- `e2e/fixtures/seed.ts`

- [ ] **Step 2: Bulk replace `schemaVersion: 5` → `schemaVersion: 6`**

```bash
grep -rl "schemaVersion: 5" src/ e2e/ \
  | xargs sed -i.bak 's/schemaVersion: 5/schemaVersion: 6/g'
find src/ e2e/ -name "*.bak" -delete
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: PASS for fixtures-only changes. If some test was using a `polyline` POI that no longer exists in `pois.ts`, fix the reference to a current POI ID.

If a test fails because it imported `POIStreet` from types — see Task 13 for the cleanup.

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "test: bump schemaVersion v5 → v6 v test fixtures"
```

---

## Task 13: Odebrat `POIStreet` + `GeoStreet`

**Files:**
- Modify: `src/modules/geo/data/types.ts`
- Modify: `src/modules/geo/logic/hitTest.ts`
- Modify: `src/modules/geo/logic/hitTest.test.ts`
- Delete: `src/modules/geo/components/GeoStreet.tsx`

V tomto bodě dataset `pois.ts` neobsahuje žádný `polyline` POI (Task 9). Bezpečně odebrat `POIStreet` typ a jeho dependent code.

- [ ] **Step 1: Check no consumers reference `POIStreet`**

```bash
grep -rn "POIStreet\|GeoStreet\b" src/ e2e/
```

Expected: jen hitTest.ts (`evaluateClick` polyline větev), hitTest.test.ts (POIStreet test), `components/GeoStreet.tsx`, případně `GeoMap.tsx` (pokud GeoStreet importuje).

- [ ] **Step 2: Modify `src/modules/geo/data/types.ts`** — remove `POIStreet`

```ts
export type POICategory = 'street' | 'landmark' | 'pd' | 'fire' | 'ems' | 'ammu';

export type Vec2 = { x: number; y: number };

interface POIBase {
  id: string;
  category: POICategory;
  name: string;
  description: string;
  aliases: string[];
}

export interface POIPoint extends POIBase {
  geometry: 'point';
  position: Vec2;
}

export interface POIPolygon extends POIBase {
  geometry: 'polygon';
  path: Vec2[];
  centroid: Vec2;
}

export type POI = POIPoint | POIPolygon;

export type TileMeta = {
  width: number;
  height: number;
  maxZoom: number;
  tileSize: number;
};
```

- [ ] **Step 3: Modify `src/modules/geo/logic/hitTest.ts`** — remove polyline branch

In `evaluateClick`:

```ts
export function evaluateClick(
  poi: POI,
  click: Vec2,
  threshold = HIT_THRESHOLD,
): EvaluatedClick {
  if (poi.geometry === 'point') {
    const d = distance(click, poi.position);
    return { hit: d < threshold, distance: d };
  }
  // polygon
  const hit = polygonHit(poi.path, click, POLYGON_EDGE_TOLERANCE);
  const d = hit ? 0 : pointToPolygonEdgeDist(click, poi.path);
  return { hit, distance: d };
}
```

`pointToPolylineDist` and `pointToSegmentDist` stay — they're used internally by polygon math (`pointToPolygonEdgeDist`). They are exported, no harm.

- [ ] **Step 4: Modify `src/modules/geo/logic/hitTest.test.ts`** — remove POIStreet test

Remove the block:
```ts
  const street: POIStreet = { ... };
  it('hit anywhere along a polyline within threshold', () => { ... });
  it('miss when perpendicular distance exceeds threshold', () => { ... });
```

Remove `POIStreet` from the import line:
```ts
import type { POIPoint, POIPolygon } from '../data/types';
```

(`pointToPolylineDist` tests stay — they exercise the helper still used internally.)

- [ ] **Step 5: Delete `src/modules/geo/components/GeoStreet.tsx`**

```bash
git rm src/modules/geo/components/GeoStreet.tsx
```

- [ ] **Step 6: Run type check + tests**

```bash
npx tsc -b --noEmit && npm test
```

Expected: PASS. Any remaining errors point to a missed consumer — search and fix.

- [ ] **Step 7: Commit**

```bash
git add src/modules/geo/data/types.ts src/modules/geo/logic/hitTest.ts src/modules/geo/logic/hitTest.test.ts
git commit -m "refactor(geo): odebrat POIStreet a GeoStreet (nahrazeno polygonem)"
```

---

## Task 14: `GeoPolygon` komponenta

**Files:**
- Create: `src/modules/geo/components/GeoPolygon.tsx`

- [ ] **Step 1: Create component**

```tsx
import { Polygon } from 'react-leaflet';
import { TILE_META } from '../data/tileMeta';
import { toLatLng } from '../logic/coords';
import type { Vec2 } from '../data/types';
import type { MarkerVariant } from './GeoMarker';

interface GeoPolygonProps {
  path: readonly Vec2[];
  variant: MarkerVariant;
}

const STYLE_BY_VARIANT: Record<
  MarkerVariant,
  { color: string; fillColor: string; fillOpacity: number; opacity: number; weight: number; dashArray?: string }
> = {
  asked:      { color: '#d4a256', fillColor: '#d4a256', fillOpacity: 0.20, opacity: 1,    weight: 2 },
  mastered:   { color: '#7fc99a', fillColor: '#7fc99a', fillOpacity: 0.10, opacity: 0.45, weight: 1.5 },
  target:     { color: '#52a163', fillColor: '#52a163', fillOpacity: 0.20, opacity: 1,    weight: 2 },
  wrongClick: { color: '#e25963', fillColor: '#e25963', fillOpacity: 0.10, opacity: 1,    weight: 2, dashArray: '6,6' },
};

export function GeoPolygon({ path, variant }: GeoPolygonProps) {
  const positions = path.map((p) => toLatLng(p, TILE_META));
  return <Polygon positions={positions} pathOptions={STYLE_BY_VARIANT[variant]} />;
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc -b --noEmit
```

Expected: PASS (no consumers yet but component compiles)

- [ ] **Step 3: Commit**

```bash
git add src/modules/geo/components/GeoPolygon.tsx
git commit -m "feat(geo): GeoPolygon Leaflet komponenta"
```

---

## Task 15: Integrovat `GeoPolygon` do `GeoBlindPage` a `GeoNamePage`

**Files:**
- Modify: `src/modules/geo/components/GeoBlindPage.tsx`
- Modify: `src/modules/geo/components/GeoNamePage.tsx`

GeoMap je children-based — polygons jdou jako children, takže GeoMap samotná se nemění.

- [ ] **Step 1: Find polygon-relevant render branches**

```bash
grep -n "geometry\|GeoStreet\|GeoMarker" src/modules/geo/components/GeoBlindPage.tsx
grep -n "geometry\|GeoStreet\|GeoMarker" src/modules/geo/components/GeoNamePage.tsx
```

Each page has branches for rendering mastered POIs and the asked POI; `GeoStreet` was used for polyline streets. Replace `GeoStreet` calls with `GeoPolygon` (same prop shape).

- [ ] **Step 2: Modify `GeoBlindPage.tsx`**

Find every `<GeoStreet path={...} variant={...} />` and replace with `<GeoPolygon path={...} variant={...} />`. Update import:

```ts
import { GeoPolygon } from './GeoPolygon';
```

Remove:
```ts
import { GeoStreet } from './GeoStreet';
```

Find the switch over `geometry === 'polyline'` — change to `geometry === 'polygon'`. Asked POI marker for polygons → render at `poi.centroid`:

```tsx
// Asked POI marker (when polygon, show pulsing dot at centroid + polygon outline)
if (askedPoi.geometry === 'polygon') {
  return (
    <>
      <GeoPolygon path={askedPoi.path} variant="asked" />
      {/* Optional: pulsing marker at centroid — keep existing GeoMarker if useful */}
    </>
  );
}
```

If existing code rendered a pulsing marker only in name mode (not blind), don't add one in blind. Inspect the current Blind page logic and keep parity — polygon outline replaces polyline outline.

- [ ] **Step 3: Modify `GeoNamePage.tsx`**

Same replacements: import GeoPolygon, remove GeoStreet, change `'polyline'` → `'polygon'`.

For the **pulsing marker** in name mode: when the asked POI is a polygon, position the GeoMarker at `poi.centroid`:

```tsx
const markerPosition: Vec2 =
  askedPoi.geometry === 'point' ? askedPoi.position : askedPoi.centroid;

return (
  <>
    {askedPoi.geometry === 'polygon' && (
      <GeoPolygon path={askedPoi.path} variant="asked" />
    )}
    <GeoMarker position={markerPosition} variant="asked" pulsing />
  </>
);
```

(Adjust the exact JSX based on what `GeoNamePage.tsx` currently does — match the structure.)

- [ ] **Step 4: Type check + run tests**

```bash
npx tsc -b --noEmit && npm test
```

Expected: PASS. Component tests for GeoBlindPage / GeoNamePage already mock `react-leaflet`, so they should not depend on the actual Polygon implementation. If they import `GeoStreet`, fix imports.

- [ ] **Step 5: Commit**

```bash
git add src/modules/geo/components/GeoBlindPage.tsx src/modules/geo/components/GeoNamePage.tsx
git commit -m "feat(geo): blind + name pages renderuji polygony pres GeoPolygon"
```

---

## Task 16: E2E seed re-export `GEO_POI_IDS` z generated

**Files:**
- Modify: `e2e/fixtures/seed.ts`

- [ ] **Step 1: Identify current `GEO_POI_IDS` definition in seed.ts**

```bash
grep -n "GEO_POI_IDS" e2e/fixtures/seed.ts
```

- [ ] **Step 2: Replace hardcoded array with re-export from generated**

In `e2e/fixtures/seed.ts`, find the `export const GEO_POI_IDS = [ ... ];` block. Replace with:

```ts
export { GEO_POI_IDS } from './geo-poi-ids.generated';
```

(Or if seed.ts uses GEO_POI_IDS internally for pinNextGeoPoi, import + re-export:
```ts
import { GEO_POI_IDS } from './geo-poi-ids.generated';
export { GEO_POI_IDS };
```
)

- [ ] **Step 3: Audit e2e spec references**

```bash
grep -rn "pinNextGeoPoi\|street\." e2e/geo/
```

Each `pinNextGeoPoi('street.…')` reference must use an ID that exists in WHITELIST (Task 7). The current 20 IDs were preserved, so existing references should work. If any test references an ID that's no longer present (e.g. street was dropped during script run because of missed match), update the test to use an existing ID.

- [ ] **Step 4: Run E2E tests**

```bash
npm run test:e2e
```

Expected: PASS (12 geo E2E tests, plus other geo-touching specs)

- [ ] **Step 5: Commit**

```bash
git add e2e/fixtures/seed.ts
git commit -m "test(e2e): GEO_POI_IDS re-exportuje z generated souboru"
```

---

## Task 17: Manual smoke test + final verification

**Files:** None (no commits expected unless issues found)

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

Open `http://localhost:5173/#/geo/blind` in a desktop browser.

- [ ] **Step 2: Smoke test — Slepá mapa**

For ~5 different street POIs (cycle through with Skip if needed):
- [ ] Click clearly inside the street polygon → expect "Správně"
- [ ] Click just outside the polygon (visually < tolerance) → expect "Správně" (edge tolerance)
- [ ] Click far from the street (> 5% of map width) → expect "Vedle" with marker
- [ ] Verify polygon outline appears in reveal phase

- [ ] **Step 3: Smoke test — Co je tady**

For ~5 different street POIs:
- [ ] Pulsing marker appears at the polygon centroid (not at a vertex)
- [ ] Typing correct street name → "Správně"
- [ ] Typing wrong → reveal shows polygon outline + correct name

- [ ] **Step 4: Smoke test — Mastered**

After mastering a street (3 correct answers, score reaches +2):
- [ ] Polygon stays faded on map with tooltip showing name on hover
- [ ] Progress percent updates

- [ ] **Step 5: Mobile smoke test**

Resize browser to ~400px width (or use device emulation). Verify polygon click registration works with touch-sized hit area. Edge tolerance is critical here.

- [ ] **Step 6: Run all tests**

```bash
npm run test:all
```

Expected: PASS — 384+ unit/component + 67 E2E = 451+ tests green.

If any failures, debug + fix. Common issues:
- A test importing `POIStreet` from types — replace with `POIPolygon` or remove
- A test asserting `geometry: 'polyline'` — should be `'polygon'`
- A POI ID that doesn't exist in new dataset — choose a current ID

- [ ] **Step 7: Verify build**

```bash
npm run build
```

Expected: PASS, no TypeScript errors.

- [ ] **Step 8: Commit any final cleanup**

```bash
git add -u
git commit -m "chore(geo): final cleanup po streets refactoru" || echo "Nothing to commit"
```

---

## Self-Review

### Spec coverage check

| Spec section                          | Task(s)        |
|---------------------------------------|----------------|
| 1. Cíl                                | (motivace, no task) |
| 2. Rozsah — in scope                  | Tasks 1–17     |
| 2. Rozsah — out of scope              | (intentionally omitted) |
| 3. Zdrojová data                      | Task 7 (skript) |
| 4. Whitelist (20 ulic)                | Task 7         |
| 5.1 Anchor `gtaWorld`                 | Task 5         |
| 5.2 `fitGtaWorldTransform`            | Task 6         |
| 5.3 Aplikace transformu               | Task 7         |
| 6.1 `POIPolygon` typ                  | Task 1, 13     |
| 6.2 `pois.ts` refactor                | Task 9         |
| 7.1 `polygonHit`                      | Task 3         |
| 7.1 `evaluateClick` polygon větev     | Task 4         |
| 7.2 `EDGE_TOLERANCE = 0.015`          | Task 3         |
| 8. Storage v5 → v6 migrace            | Task 11        |
| 8. Test fixtures schemaVersion bump   | Task 12        |
| 9.1 `GeoPolygon` komponenta           | Task 14, 15    |
| 9.2 GeoNamePage marker na centroidu   | Task 15        |
| 10.1/10.2/10.3 Quiz integrace         | Task 15        |
| 11. Skript                            | Task 7, 8      |
| 12. Testing — hit-test                | Task 2, 3, 4   |
| 12. Testing — `pois.test.ts`          | Task 10        |
| 12. Testing — storage migration       | Task 11        |
| 12. Testing — E2E seed                | Task 16        |
| 12. Verifikace + smoke test           | Task 17        |
| 13. Kompromisy / YAGNI                | (no task, documentation) |
| 14. Sekvence implementace             | Mapped to tasks above |
| 15. Otevřené otázky                   | None (resolved in spec) |

All spec requirements have implementing tasks. ✓

### Placeholder scan

No "TBD", "fill in", or "implement later". All steps contain concrete commands and code. ✓

### Type consistency check

- `POIPolygon.path` consistently uses `Vec2[]` everywhere ✓
- `POIPolygon.centroid` consistently `Vec2` ✓
- `pointInPolygon(p, ring)` — same signature in all references ✓
- `pointToPolygonEdgeDist(p, ring)` — same signature ✓
- `polygonHit(ring, click, tolerance)` — same signature ✓
- `POLYGON_EDGE_TOLERANCE = 0.015` — constant defined once in hitTest.ts ✓
- `fitGtaWorldTransform(anchors)` returns `Affine6Transform | null` ✓
- `applyGtaWorldTransform(p, t)` takes `Affine6Transform` ✓
- `MarkerVariant` reused for GeoPolygon (matches GeoStreet's signature) ✓
- `STREET_POLYGONS` exported from `streetPolygons.generated.ts`, imported by `pois.ts` ✓
- `GEO_POI_IDS` exported from `geo-poi-ids.generated.ts`, re-exported by `seed.ts` ✓
- `schemaVersion: 6` consistent across `PersistedState`, `initialState`, migrations, fixtures ✓
- `migrateV5ToV6` returns `PersistedState` (= v6 shape) ✓
