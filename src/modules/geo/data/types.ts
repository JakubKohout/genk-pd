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

export interface POIPolyline extends POIBase {
  geometry: 'polyline';
  /** Open path (centerline). First and last point are distinct. ≥2 points. */
  path: Vec2[];
  /** Pre-computed arc-length midpoint in [0,1]². Used as label position. */
  centroid: Vec2;
}

export type POI = POIPoint | POIPolyline;

export type TileMeta = {
  width: number;
  height: number;
  maxZoom: number;
  tileSize: number;
};
