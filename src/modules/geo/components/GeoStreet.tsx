import { Polyline } from 'react-leaflet';
import { TILE_META } from '../data/tileMeta';
import { toLatLng } from '../logic/coords';
import type { Vec2 } from '../data/types';
import type { MarkerVariant } from './GeoMarker';

interface GeoStreetProps {
  path: readonly Vec2[];
  variant: MarkerVariant;
}

const STROKE_BY_VARIANT: Record<
  MarkerVariant,
  { color: string; opacity: number; weight: number; dashArray?: string }
> = {
  asked: { color: '#d4a256', opacity: 1, weight: 6 },
  mastered: { color: '#7fc99a', opacity: 0.45, weight: 4 },
  target: { color: '#52a163', opacity: 1, weight: 6 },
  wrongClick: { color: '#e25963', opacity: 1, weight: 4, dashArray: '6,6' },
};

export function GeoStreet({ path, variant }: GeoStreetProps) {
  const positions = path.map((p) => toLatLng(p, TILE_META));
  return <Polyline positions={positions} pathOptions={STROKE_BY_VARIANT[variant]} />;
}
