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
  /** Closed outer ring: first point equals last. ≥4 points (3 unique + closure). */
  path: Vec2[];
  /** Pre-computed area-weighted centroid in [0,1]². Used as label position. */
  centroid: Vec2;
}

export type POI = POIPoint | POIPolygon;

export type TileMeta = {
  width: number;
  height: number;
  maxZoom: number;
  tileSize: number;
};
