import { Polyline } from 'react-leaflet';
import { TILE_META } from '../data/tileMeta';
import { toLatLng } from '../logic/coords';
import type { Vec2 } from '../data/types';
import type { MarkerVariant } from './GeoMarker';

interface GeoPolylineProps {
  path: readonly Vec2[];
  variant: MarkerVariant;
}

const STYLE_BY_VARIANT: Record<
  MarkerVariant,
  { color: string; opacity: number; weight: number; dashArray?: string }
> = {
  asked:      { color: '#d4a256', weight: 5, opacity: 0.95 },
  mastered:   { color: '#7fc99a', weight: 4, opacity: 0.45 },
  target:     { color: '#52a163', weight: 5, opacity: 0.95 },
  wrongClick: { color: '#e25963', weight: 4, opacity: 0.95, dashArray: '6,6' },
};

export function GeoPolyline({ path, variant }: GeoPolylineProps) {
  const positions = path.map((p) => toLatLng(p, TILE_META));
  return <Polyline positions={positions} pathOptions={STYLE_BY_VARIANT[variant]} />;
}
