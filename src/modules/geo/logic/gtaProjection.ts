import type { Vec2 } from '../data/types';

/**
 * GTA-world → normalized image-space projection for `docs/clean-map.jpg`.
 *
 * Mirrors the constants documented in `scripts/extract-minimap.py` (the
 * deterministic source of the map): 8192×12288 px stitch of Rockstar native
 * minimap textures, uniform linear projection at 1.024 px/m.
 *
 *   1.024 px/m × 8000 m = 8192 px  ✓
 *   1.024 px/m × 12000 m = 12288 px ✓
 *
 * Use this everywhere GTA-world coords get plotted on the map: streets import
 * pipeline, anchor calibration, POI position derivations, calibrator UI.
 */
export const GTA_BOUNDS = {
  xMin: -4000,
  xMax: 4000,
  yMin: -4000,
  yMax: 8000,
  width: 8000,
  height: 12000,
} as const;

export function gtaToNorm(p: Vec2): Vec2 {
  return {
    x: (p.x - GTA_BOUNDS.xMin) / GTA_BOUNDS.width,
    y: (GTA_BOUNDS.yMax - p.y) / GTA_BOUNDS.height,
  };
}

export function normToGta(p: Vec2): Vec2 {
  return {
    x: p.x * GTA_BOUNDS.width + GTA_BOUNDS.xMin,
    y: GTA_BOUNDS.yMax - p.y * GTA_BOUNDS.height,
  };
}
