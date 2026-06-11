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
    name: 'pos · Del Perro Fwy · střed dálnice u maríny',
    streetId: 'highway.del-perro-fwy',
    click: { x: 0.44, y: 0.664 },
    expected: true,
    note: 'Klikni doprostřed asfaltu Del Perro Fwy severně od Little Seoul.',
  },
  {
    name: 'pos · Olympic Fwy · estakáda nad Pillbox',
    streetId: 'highway.olympic-fwy',
    click: { x: 0.48, y: 0.714 },
    expected: true,
    note: 'Klikni na estakádu Olympic Fwy (Route 22) nad downtown.',
  },
  {
    name: 'pos · Los Santos Fwy · severní úsek',
    streetId: 'highway.los-santos-fwy',
    click: { x: 0.56, y: 0.618 },
    expected: true,
    note: 'Klikni na asfalt Los Santos Fwy u Vinewoodu.',
  },
  {
    name: 'pos · Great Ocean Hwy · pobřežní zatáčka u Chumash',
    streetId: 'highway.goh',
    click: { x: 0.115, y: 0.51 },
    expected: true,
    note: 'Klikni na asfalt Great Ocean Hwy v zatáčce u Chumash / North Chumash.',
  },
  {
    name: 'pos · Route 68 · střed venkovského úseku',
    streetId: 'highway.route-68',
    click: { x: 0.449, y: 0.414 },
    expected: true,
    note: 'Klikni doprostřed Route 68 u Harmony.',
  },
  {
    name: 'pos · Vinewood Blvd · ve Vinewoodu',
    streetId: 'street.vinewood-blvd',
    click: { x: 0.499, y: 0.613 },
    expected: true,
    note: 'Klikni na Vinewood Blvd ve Vinewoodu.',
  },
  {
    name: 'pos · Vespucci Blvd · v downtownu',
    streetId: 'street.vespucci-blvd',
    click: { x: 0.46, y: 0.695 },
    expected: true,
    note: 'Klikni na asfalt Vespucci Blvd v downtownu (u LSC Sheriff).',
  },
  {
    name: 'pos · Calais Ave · podél kanálu',
    streetId: 'street.calais-ave',
    click: { x: 0.399, y: 0.6975 },
    expected: true,
    note: 'Klikni na Calais Ave podél kanálu západně od downtownu.',
  },

  // --- NEGATIVE (4) ---
  {
    name: 'neg · klik na Pacifik západně od Vespucci · NE Del Perro Fwy',
    streetId: 'highway.del-perro-fwy',
    click: { x: 0.12, y: 0.73 },
    expected: false,
    note: 'Klikni do oceánu západně od Vespucci pláže. Nesmí to být hit pro Del Perro Fwy.',
  },
  {
    name: 'neg · klik na Olympic Fwy · NE Los Santos Fwy (sousední dálnice)',
    streetId: 'highway.los-santos-fwy',
    click: { x: 0.46, y: 0.711 },
    expected: false,
    note: 'Klikni doprostřed Olympic Fwy. Testuje, že sousední dálnice se nepřekrývají.',
  },
  {
    name: 'neg · klik do pouště u Sandy · NE Route 68',
    streetId: 'highway.route-68',
    click: { x: 0.6, y: 0.39 },
    expected: false,
    note: 'Klikni do pouštního terénu vedle Route 68 (mimo silnici).',
  },
  {
    name: 'neg · klik na osu Vinewood Blvd · NE Calais Ave',
    streetId: 'street.calais-ave',
    click: { x: 0.499, y: 0.613 },
    expected: false,
    note: 'Klikni přímo na osu Vinewood Blvd. Test rozlišuje, že to není Calais Ave.',
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
        `TODO: doplň click souřadnice (${c.note}). Zapni DEBUG (klávesa D), klikni v UI, zkopíruj { x, y } z console.`,
      );
    }
    const result = evaluateClick(poi!, c.click);
    expect(result.hit).toBe(c.expected);
  });
});
