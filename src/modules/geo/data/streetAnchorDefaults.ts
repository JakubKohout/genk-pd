import type { Vec2 } from './types';

/**
 * Precise point-landmark anchors for street recalibration. Unlike fuzzy
 * neighborhood centroids, every anchor here is a **visually distinct, narrow
 * feature** on `clean-map.jpg` that the user can pinpoint exactly. `gtaWorld`
 * values are Foxxite area centroids for tight areas (single venue / complex /
 * landmark) — accurate to the size of the feature itself.
 *
 * `ourCoord` is `gtaToNorm(gtaWorld)` using the canonical uniform projection
 * (`src/modules/geo/logic/gtaProjection.ts`). Recompute via that helper if
 * you change `gtaWorld`. Anchors land where they belong on `clean-map.jpg` —
 * drag them only if your particular map crop differs.
 *
 * Edit live in `/geo/calibrate` → tab „Kalibrace ulic"; the tab starts from
 * these defaults. To add more anchors after-the-fact, use the dropdown there.
 */
export interface StreetAnchorSeed {
  /** Stable identifier (used as React key + dedup key when adding). */
  id: string;
  /** Foxxite area name; if omitted, anchor is purely gtaWorld-driven. */
  areaName?: string;
  /** Short label rendered in the marker tooltip + anchor list. */
  label: string;
  /** What to look for on the rendered map — guides the user to the exact pixel. */
  hint: string;
  gtaWorld: Vec2;
  ourCoord: Vec2;
}

export const DEFAULT_STREET_ANCHORS: readonly StreetAnchorSeed[] = [
  // --- South Los Santos (dense, many landmarks) ---
  {
    id: 'lsia',
    areaName: 'Los Santos International Airport',
    label: 'LSIA',
    hint: 'letiště s dvěma paralelními runways — umísti střed komplexu',
    gtaWorld: { x: -1170, y: -2772 },
    ourCoord: { x: 0.3538, y: 0.8977 },
  },
  {
    id: 'port',
    areaName: 'Port of South Los Santos',
    label: 'Port of South LS',
    hint: 'přístav s kontejnery, jihovýchodně od letiště',
    gtaWorld: { x: -156, y: -2146 },
    ourCoord: { x: 0.4805, y: 0.8455 },
  },
  {
    id: 'maze-bank-arena',
    areaName: 'Maze Bank Arena',
    label: 'Maze Bank Arena',
    hint: 'velký bílý kruhový stadion v jižním LS — klikni do středu kruhu',
    gtaWorld: { x: -290, y: -1963 },
    ourCoord: { x: 0.4638, y: 0.8303 },
  },
  {
    id: 'legion-square',
    areaName: 'Legion Square',
    label: 'Legion Square',
    hint: 'malé downtown náměstí pod hlavními mrakodrapy',
    gtaWorld: { x: 200, y: -928 },
    ourCoord: { x: 0.5250, y: 0.7440 },
  },
  {
    id: 'pillbox-hill',
    areaName: 'Pillbox Hill',
    label: 'Pillbox Hill',
    hint: 'shluk mrakodrapů (Maze Bank Tower, Pillbox Medical) — střed downtown',
    gtaWorld: { x: -40, y: -862 },
    ourCoord: { x: 0.4950, y: 0.7385 },
  },
  {
    id: 'vespucci-canals',
    areaName: 'Vespucci Canals',
    label: 'Vespucci Canals',
    hint: 'mřížka kanálů u Vespucci Beach — viditelná jako modré linie',
    gtaWorld: { x: -1052, y: -1057 },
    ourCoord: { x: 0.3685, y: 0.7548 },
  },

  // --- Central / Vinewood ---
  {
    id: 'vinewood-racetrack',
    areaName: 'Vinewood Racetrack',
    label: 'Vinewood Racetrack',
    hint: 'oválný závodní okruh severovýchodně od centra LS',
    gtaWorld: { x: 1149, y: 146 },
    ourCoord: { x: 0.6436, y: 0.6545 },
  },
  {
    id: 'golf',
    areaName: 'GWC and Golfing Society',
    label: 'Golf hřiště',
    hint: 'velké zelené golfové hřiště v Richman',
    gtaWorld: { x: -1202, y: 165 },
    ourCoord: { x: 0.3498, y: 0.6529 },
  },

  // --- West coast / Pacific Bluffs / Banham ---
  {
    id: 'fort-zancudo',
    areaName: 'Fort Zancudo',
    label: 'Fort Zancudo',
    hint: 'vojenská základna se zelenou rolovací drahou — střed runway',
    gtaWorld: { x: -2075, y: 3093 },
    ourCoord: { x: 0.2406, y: 0.4089 },
  },
  {
    id: 'lago-zancudo',
    areaName: 'Lago Zancudo',
    label: 'Lago Zancudo',
    hint: 'malé jezírko severozápadně od Fort Zancudo',
    gtaWorld: { x: -2409, y: 2654 },
    ourCoord: { x: 0.1989, y: 0.4455 },
  },

  // --- East / Blaine County ---
  {
    id: 'veznice',
    areaName: 'Bolingbroke Penitentiary',
    label: 'Bolingbroke vězení',
    hint: 'čtvercový vězeňský komplex v Tataviam Mountains',
    gtaWorld: { x: 1728, y: 2602 },
    ourCoord: { x: 0.7160, y: 0.4498 },
  },
  {
    id: 'power-station',
    areaName: 'Palmer-Taylor Power Station',
    label: 'Power Station',
    hint: 'velký industriální komplex elektrárny na východním pobřeží',
    gtaWorld: { x: 2737, y: 1515 },
    ourCoord: { x: 0.8421, y: 0.5404 },
  },
  {
    id: 'wind-farm',
    areaName: 'Ron Alternates Wind Farm',
    label: 'Větrná farma',
    hint: 'shluk větrných turbín jihozápadně od power station',
    gtaWorld: { x: 2480, y: 1994 },
    ourCoord: { x: 0.8100, y: 0.5005 },
  },
  {
    id: 'humane-labs',
    areaName: 'Humane Labs and Research',
    label: 'Humane Labs',
    hint: 'oplocený vědecký komplex na východním pobřeží',
    gtaWorld: { x: 3530, y: 3705 },
    ourCoord: { x: 0.9413, y: 0.3579 },
  },
  {
    id: 'davis-quartz',
    areaName: 'Davis Quartz',
    label: 'Davis Quartz (lom)',
    hint: 'velký šedý kamenolom severovýchodně od LS',
    gtaWorld: { x: 2903, y: 2726 },
    ourCoord: { x: 0.8629, y: 0.4395 },
  },
  {
    id: 'el-gordo',
    areaName: 'El Gordo Lighthouse',
    label: 'El Gordo Lighthouse',
    hint: 'osamělý maják na severovýchodním cípu pobřeží',
    gtaWorld: { x: 3460, y: 5165 },
    ourCoord: { x: 0.9325, y: 0.2363 },
  },
  {
    id: 'redwood-lights',
    areaName: 'Redwood Lights Track',
    label: 'Redwood Lights Track',
    hint: 'malý oválný závodní okruh u Grand Senora Desert',
    gtaWorld: { x: 1030, y: 2300 },
    ourCoord: { x: 0.6288, y: 0.4750 },
  },

  // --- North (Blaine wilderness) ---
  {
    id: 'stab-city',
    areaName: 'Stab City',
    label: 'Stab City',
    hint: 'malá biker komunita s karavany severovýchodně od Sandy Shores',
    gtaWorld: { x: 81, y: 3702 },
    ourCoord: { x: 0.5101, y: 0.3582 },
  },
  {
    id: 'calafia',
    areaName: 'Calafia Bridge',
    label: 'Calafia Bridge',
    hint: 'železniční most přes řeku Zancudo, severozápadně od Paleto',
    gtaWorld: { x: -165, y: 4245 },
    ourCoord: { x: 0.4794, y: 0.3129 },
  },
];
