export type POICategory = 'street' | 'highway' | 'city' | 'state';

/** Click-tolerance tier for point POIs. Omitted = 'medium'. See SIZE_THRESHOLDS. */
export type POISize = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

export type Vec2 = { x: number; y: number };

interface POIBase {
  id: string;
  category: POICategory;
  name: string;
  description: string;
  aliases: string[];
  /** Larger sprawling places (airport, docks, towns) get a bigger hit radius;
   * pinpoint buildings a smaller one. Only meaningful for point POIs. */
  size?: POISize;
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
