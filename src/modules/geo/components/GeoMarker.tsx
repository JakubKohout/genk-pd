import { divIcon } from 'leaflet';
import { Marker, Tooltip } from 'react-leaflet';
import { TILE_META } from '../data/tileMeta';
import { toLatLng } from '../logic/coords';
import type { Vec2 } from '../data/types';

export type MarkerVariant = 'asked' | 'mastered' | 'target' | 'wrongClick';

interface GeoMarkerProps {
  position: Vec2;
  variant: MarkerVariant;
  label?: string;
  poiId?: string;
}

const VARIANT_CLASS: Record<MarkerVariant, string> = {
  asked: 'geo-marker geo-marker--asked',
  mastered: 'geo-marker geo-marker--mastered',
  target: 'geo-marker geo-marker--target',
  wrongClick: 'geo-marker geo-marker--wrong',
};

export function GeoMarker({ position, variant, label, poiId }: GeoMarkerProps) {
  const html = `<div class="${VARIANT_CLASS[variant]}" data-variant="${variant}"${
    poiId ? ` data-poi-id="${poiId}"` : ''
  }><span class="geo-marker__dot"></span></div>`;
  const icon = divIcon({
    html,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
  return (
    <Marker position={toLatLng(position, TILE_META)} icon={icon} interactive={false}>
      {label && (
        <Tooltip
          permanent
          direction="right"
          offset={[10, 0]}
          opacity={variant === 'mastered' ? 0.7 : 1}
          className={`geo-marker-tooltip geo-marker-tooltip--${variant}`}
        >
          {label}
        </Tooltip>
      )}
    </Marker>
  );
}
