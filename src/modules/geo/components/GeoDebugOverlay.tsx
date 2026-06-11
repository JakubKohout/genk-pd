import { Polyline, Popup, useMapEvents } from 'react-leaflet';
import { STREETS } from '../data/streets.generated';
import { TILE_META } from '../data/tileMeta';
import { fromLatLng, toLatLng } from '../logic/coords';
import { POLYLINE_HIT_TOLERANCE, pointToPolylineDist } from '../logic/hitTest';

interface Props {
  enabled: boolean;
  /** When set, the matching street is highlighted red and `hit/miss` is logged. */
  currentPoiId?: string | null;
}

/**
 * Diagnostic overlay for click-on-street validation. Press `D` to toggle.
 *
 * Renders every street centerline from `streets.generated.ts` so we can see
 * whether the paths sit on top of the satellite asphalt. The current quiz
 * target (if any) is highlighted red. Every map click is also logged as a
 * normalized `Vec2` ready to paste into hitTest.streets.test.ts fixtures.
 *
 * Coordinate conversion: normalized `Vec2 {x, y}` → Leaflet `[lat, lng]`
 *   lat = y * TILE_META.height    (12288 source pixels)
 *   lng = x * TILE_META.width     (8192 source pixels)
 * via `toLatLng`. Inverse via `fromLatLng`. NOTE the axis swap — Leaflet uses
 * `[lat, lng]` but our Vec2 is `[x, y]`, where x is the horizontal axis (= lng
 * after scaling). The two are interleaved deliberately in coords.ts.
 */
export function GeoDebugOverlay({ enabled, currentPoiId }: Props) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      const v = fromLatLng(e.latlng, TILE_META);
      // Distance to every street centerline so the diagnostic message names
      // the nearest one (and whether it counts as a hit) regardless of
      // `currentPoiId`.
      let nearestName: string | null = null;
      let nearestDist = Infinity;
      for (const poi of STREETS) {
        if (poi.geometry !== 'polyline') continue;
        const d = pointToPolylineDist(v, poi.path);
        if (d < nearestDist) {
          nearestDist = d;
          nearestName = poi.name;
        }
      }
      const coord = `{ x: ${v.x.toFixed(4)}, y: ${v.y.toFixed(4)} }`;
      const hitMsg =
        nearestName === null
          ? 'no streets loaded'
          : `nearest "${nearestName}" dist=${nearestDist.toFixed(4)} (${
              nearestDist <= POLYLINE_HIT_TOLERANCE ? 'hit' : 'miss'
            })`;
      // eslint-disable-next-line no-console
      console.log(`[geo-debug] click ${coord} — ${hitMsg}`);
    },
  });

  if (!enabled) return null;

  return (
    <>
      {STREETS.map((poi) => {
        if (poi.geometry !== 'polyline') return null;
        const isCurrent = poi.id === currentPoiId;
        const positions = poi.path.map((v) => toLatLng(v, TILE_META));
        return (
          <Polyline
            key={poi.id}
            positions={positions}
            pathOptions={{
              color: isCurrent ? 'rgba(255, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.5)',
              weight: isCurrent ? 4 : 2,
              // Default true; written explicitly so polyline clicks still
              // bubble up to MapClickCapture and the quiz can evaluate them.
              bubblingMouseEvents: true,
            }}
          >
            <Popup>{poi.name}</Popup>
          </Polyline>
        );
      })}
    </>
  );
}
