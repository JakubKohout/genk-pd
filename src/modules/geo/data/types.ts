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

export type POI = POIPoint | POIStreet;

export type TileMeta = {
  width: number;
  height: number;
  maxZoom: number;
  tileSize: number;
};
