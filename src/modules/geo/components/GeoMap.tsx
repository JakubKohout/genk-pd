import L, { CRS, type LatLngBoundsExpression } from 'leaflet';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import type { ReactNode } from 'react';
import { TILE_META } from '../data/tileMeta';
import { fromLatLng } from '../logic/coords';
import type { Vec2 } from '../data/types';

const bounds: LatLngBoundsExpression = [
  [0, 0],
  [TILE_META.height, TILE_META.width],
];

// CRS.Simple defaults to 1 source-pixel = 1 leaflet-unit at zoom 0, which would
// require 32x48 tiles to cover our 8192x12288 source map at z=0. Our tile script
// instead generates a pyramid where z=MAX_ZOOM is native pixel (8192x12288 →
// 32x48 tiles) and z=0 is the whole map downscaled into a 4x6 grid. Override
// the CRS transformation so source coords map by `factor = 1 / 2^MAX_ZOOM` at
// z=0; Leaflet then doubles per zoom and at z=MAX_ZOOM the factor reaches 1.
const FACTOR = 1 / Math.pow(2, TILE_META.maxZoom);
const geoCrs = L.extend({}, CRS.Simple, {
  transformation: new L.Transformation(FACTOR, 0, FACTOR, 0),
});

interface GeoMapProps {
  /** When set, captures map clicks and reports normalized coords. */
  onMapClick?: (point: Vec2) => void;
  children?: ReactNode;
  /** Optional className applied to the wrapping div. */
  className?: string;
}

export function GeoMap({ onMapClick, children, className }: GeoMapProps) {
  return (
    <div
      className={['geo-map-shell', className].filter(Boolean).join(' ')}
      data-testid="geo-map"
    >
      <MapContainer
        crs={geoCrs}
        bounds={bounds}
        maxBounds={bounds}
        maxBoundsViscosity={0.7}
        minZoom={0}
        maxZoom={TILE_META.maxZoom}
        zoom={0}
        attributionControl={false}
        style={{ width: '100%', height: '100%', background: '#0e3245' }}
      >
        <TileLayer
          url="/tiles/{z}/{x}/{y}.jpg"
          tileSize={TILE_META.tileSize}
          noWrap
          bounds={bounds}
          maxNativeZoom={TILE_META.maxZoom}
          maxZoom={TILE_META.maxZoom}
          minZoom={0}
        />
        {onMapClick && <MapClickCapture onMapClick={onMapClick} />}
        {children}
      </MapContainer>
    </div>
  );
}

function MapClickCapture({ onMapClick }: { onMapClick: (p: Vec2) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(fromLatLng(e.latlng, TILE_META));
    },
  });
  return null;
}
