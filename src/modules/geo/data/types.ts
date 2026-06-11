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

export interface POIPolygon extends POIBase {
  geometry: 'polygon';
  /**
   * Polygon ring(s) in normalized 0..1 coords. First ring is outer boundary,
   * subsequent rings are holes. Each ring is closed: first === last vertex.
   * A street may be represented by multiple disjoint polygons — see callers
   * that handle MultiPolygon input by flattening into multiple POIPolygon
   * entries OR by using multiple top-level rings (we choose the former; one
   * POI = one polygon).
   */
  rings: Vec2[][];
  /** Mean of outer-ring vertices in [0,1]². Used as label / camera target. */
  centroid: Vec2;
}

export type POI = POIPoint | POIPolyline | POIPolygon;

export type TileMeta = {
  width: number;
  height: number;
  maxZoom: number;
  tileSize: number;
};
