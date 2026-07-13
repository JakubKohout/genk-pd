/**
 * Real-coordinate click validation fixtures for street centerlines.
 *
 * Streets are polyline centerlines hand-traced from the satellite art
 * (docs/clean-map.jpg — see streets.generated.ts header); a click hits when
 * its perpendicular distance to the path is ≤ POLYLINE_HIT_TOLERANCE
 * (0.015 ≈ 120 m). Each case below was verified visually against the art:
 * positive clicks sit on the drawn asphalt near the centerline, negative
 * clicks on water / desert / a neighbouring street.
 *
 * To re-harvest a click after retuning street paths: `npm run dev`, open
 * /geo/blind, press `D` (debug overlay) and copy the logged `{ x, y }`.
 *
 * Coords are normalized in [0, 1] over the 8192×12288 satellite image.
 * Convention: Vec2 `{x, y}` where x = lng / TILE_META.width, y = lat / TILE_META.height.
 */
import { describe, expect, it } from 'vitest';
import { POI_BY_ID } from '../data/pois';
import { evaluateClick } from './hitTest';
import type { Vec2 } from '../data/types';

interface StreetClickCase {
  name: string;
  streetId: keyof typeof POI_BY_ID;
  /** Normalized [0,1] click coords, harvested against the satellite art. */
  click: Vec2 | null;
  /** True if the click should be classified as on `streetId`. */
  expected: boolean;
  /** Free-text hint for the human re-harvesting the click. */
  note: string;
}

// 8 positive + 4 negative = 12 cases.
const CASES: readonly StreetClickCase[] = [
  // --- POSITIVE (8) ---
  {
    name: 'pos · Del Perro Fwy · middle of the freeway near the marina',
    streetId: 'highway.del-perro-fwy',
    click: { x: 0.44, y: 0.664 },
    expected: true,
    note: 'Click the middle of the Del Perro Fwy asphalt north of Little Seoul.',
  },
  {
    name: 'pos · Olympic Fwy · overpass above Pillbox',
    streetId: 'highway.olympic-fwy',
    click: { x: 0.48, y: 0.714 },
    expected: true,
    note: 'Click the Olympic Fwy overpass (Route 22) above downtown.',
  },
  {
    name: 'pos · Los Santos Fwy · northern stretch',
    streetId: 'highway.los-santos-fwy',
    click: { x: 0.56, y: 0.618 },
    expected: true,
    note: 'Click the Los Santos Fwy asphalt near Vinewood.',
  },
  {
    name: 'pos · Great Ocean Hwy · coastal bend near Chumash',
    streetId: 'highway.goh',
    click: { x: 0.115, y: 0.51 },
    expected: true,
    note: 'Click the Great Ocean Hwy asphalt at the bend near Chumash / North Chumash.',
  },
  {
    name: 'pos · Route 68 · middle of the rural stretch',
    streetId: 'highway.route-68',
    click: { x: 0.449, y: 0.414 },
    expected: true,
    note: 'Click the middle of Route 68 near Harmony.',
  },
  {
    name: 'pos · Vinewood Blvd · in Vinewood',
    streetId: 'street.vinewood-blvd',
    click: { x: 0.499, y: 0.613 },
    expected: true,
    note: 'Click Vinewood Blvd in Vinewood.',
  },
  {
    name: 'pos · Vespucci Blvd · in downtown',
    streetId: 'street.vespucci-blvd',
    click: { x: 0.46, y: 0.695 },
    expected: true,
    note: 'Click the Vespucci Blvd asphalt in downtown (near LSC Sheriff).',
  },
  {
    name: 'pos · Calais Ave · along the canal',
    streetId: 'street.calais-ave',
    click: { x: 0.399, y: 0.6975 },
    expected: true,
    note: 'Click Calais Ave along the canal west of downtown.',
  },

  // --- NEGATIVE (4) ---
  {
    name: 'neg · click on the Pacific west of Vespucci · NOT Del Perro Fwy',
    streetId: 'highway.del-perro-fwy',
    click: { x: 0.12, y: 0.73 },
    expected: false,
    note: 'Click the ocean west of Vespucci beach. Must not be a hit for Del Perro Fwy.',
  },
  {
    name: 'neg · click on Olympic Fwy · NOT Los Santos Fwy (neighbouring freeway)',
    streetId: 'highway.los-santos-fwy',
    click: { x: 0.46, y: 0.711 },
    expected: false,
    note: 'Click the middle of Olympic Fwy. Tests that neighbouring freeways do not overlap.',
  },
  {
    name: 'neg · click in the desert near Sandy · NOT Route 68',
    streetId: 'highway.route-68',
    click: { x: 0.6, y: 0.39 },
    expected: false,
    note: 'Click desert terrain next to Route 68 (off the road).',
  },
  {
    name: 'neg · click on the Vinewood Blvd axis · NOT Calais Ave',
    streetId: 'street.calais-ave',
    click: { x: 0.499, y: 0.613 },
    expected: false,
    note: 'Click directly on the Vinewood Blvd axis. Tests that it is distinguished from Calais Ave.',
  },
];

describe('street click validation — real fixtures (verified against satellite art)', () => {
  it('has exactly 8 positive and 4 negative cases', () => {
    const positives = CASES.filter((c) => c.expected).length;
    const negatives = CASES.filter((c) => !c.expected).length;
    expect(positives).toBe(8);
    expect(negatives).toBe(4);
  });

  it.each(CASES)('$name', (c) => {
    const poi = POI_BY_ID[c.streetId];
    expect(poi).toBeDefined();
    if (!c.click) {
      throw new Error(
        `TODO: fill in click coordinates (${c.note}). Enable DEBUG (key D), click in the UI, copy { x, y } from the console.`,
      );
    }
    const result = evaluateClick(poi!, c.click);
    expect(result.hit).toBe(c.expected);
  });
});
