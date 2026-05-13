import { Polygon } from 'react-leaflet';
import { TILE_META } from '../data/tileMeta';
import { toLatLng } from '../logic/coords';
import type { Vec2 } from '../data/types';
import type { MarkerVariant } from './GeoMarker';

interface GeoPolygonProps {
  path: readonly Vec2[];
  variant: MarkerVariant;
}

const STYLE_BY_VARIANT: Record<
  MarkerVariant,
  { color: string; fillColor: string; fillOpacity: number; opacity: number; weight: number; dashArray?: string }
> = {
  asked:      { color: '#d4a256', fillColor: '#d4a256', fillOpacity: 0.20, opacity: 1,    weight: 2 },
  mastered:   { color: '#7fc99a', fillColor: '#7fc99a', fillOpacity: 0.10, opacity: 0.45, weight: 1.5 },
  target:     { color: '#52a163', fillColor: '#52a163', fillOpacity: 0.20, opacity: 1,    weight: 2 },
  wrongClick: { color: '#e25963', fillColor: '#e25963', fillOpacity: 0.10, opacity: 1,    weight: 2, dashArray: '6,6' },
};

export function GeoPolygon({ path, variant }: GeoPolygonProps) {
  const positions = path.map((p) => toLatLng(p, TILE_META));
  return <Polygon positions={positions} pathOptions={STYLE_BY_VARIANT[variant]} />;
}
