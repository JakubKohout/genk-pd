import type { TileMeta, Vec2 } from '../data/types';

/**
 * Convert normalized 0..1 coords to Leaflet CRS.Simple LatLng tuple [y, x] in source-pixel
 * units. CRS.Simple uses [y, x] where y grows downward when bounds are [[0,0], [height, width]].
 */
export function toLatLng(p: Vec2, meta: TileMeta): [number, number] {
  return [p.y * meta.height, p.x * meta.width];
}

/** Inverse of toLatLng — convert a Leaflet LatLng-like {lat, lng} back to 0..1 coords. */
export function fromLatLng(latlng: { lat: number; lng: number }, meta: TileMeta): Vec2 {
  return {
    x: latlng.lng / meta.width,
    y: latlng.lat / meta.height,
  };
}
