import { useMemo, useState } from 'react';
import { divIcon, type LeafletEvent } from 'leaflet';
import { Marker, Polyline, Tooltip } from 'react-leaflet';
import { TILE_META } from '../../data/tileMeta';
import { fromLatLng, toLatLng } from '../../logic/coords';
import { formatPoisTs } from '../../logic/calibrate';
import { GeoMap } from '../GeoMap';
import type { POI, POICategory, Vec2 } from '../../data/types';

type Geometry = 'point' | 'polyline';

interface Draft {
  id: string;
  name: string;
  description: string;
  aliasesRaw: string;
  category: POICategory;
  geometry: Geometry;
}

const EMPTY_DRAFT: Draft = {
  id: '',
  name: '',
  description: '',
  aliasesRaw: '',
  category: 'landmark',
  geometry: 'point',
};

/**
 * Free-form POI editor. Fill the form on the left, click on the map to place
 * a point or to add polyline nodes. Existing markers/nodes are draggable.
 * Output is appended to a list; "Copy TS" emits paste-ready entries.
 */
export function AddPoiTab() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [placingPoint, setPlacingPoint] = useState<Vec2 | null>(null);
  const [placingPath, setPlacingPath] = useState<Vec2[]>([]);
  const [added, setAdded] = useState<POI[]>([]);
  const [copied, setCopied] = useState(false);

  const canAdd =
    draft.id.trim().length > 0 &&
    draft.name.trim().length > 0 &&
    ((draft.geometry === 'point' && placingPoint) ||
      (draft.geometry === 'polyline' && placingPath.length >= 2));

  const handleMapClick = (point: Vec2) => {
    if (draft.geometry === 'point') {
      setPlacingPoint(point);
    } else {
      setPlacingPath((prev) => [...prev, point]);
    }
  };

  const handleAdd = () => {
    if (!canAdd) return;
    const aliases = draft.aliasesRaw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);
    const base = {
      id: draft.id.trim(),
      category: draft.category,
      name: draft.name.trim(),
      description: draft.description.trim(),
      aliases,
    };
    const poi: POI =
      draft.geometry === 'point'
        ? { ...base, geometry: 'point', position: placingPoint! }
        : { ...base, geometry: 'polyline', path: placingPath };
    setAdded((prev) => [...prev, poi]);
    setDraft(EMPTY_DRAFT);
    setPlacingPoint(null);
    setPlacingPath([]);
  };

  const deleteAdded = (id: string) => {
    setAdded((prev) => prev.filter((p) => p.id !== id));
  };

  const movePoint = (id: string, pos: Vec2) => {
    setAdded((prev) =>
      prev.map((p) =>
        p.id === id && p.geometry === 'point' ? { ...p, position: pos } : p,
      ),
    );
  };

  const movePathNode = (id: string, idx: number, pos: Vec2) => {
    setAdded((prev) =>
      prev.map((p) => {
        if (p.id !== id || p.geometry !== 'polyline') return p;
        return { ...p, path: p.path.map((pt, i) => (i === idx ? pos : pt)) };
      }),
    );
  };

  const tsOutput = useMemo(() => formatPoisTs(added), [added]);

  const handleCopy = async () => {
    if (!tsOutput) return;
    try {
      await navigator.clipboard.writeText(tsOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-sasp-ink-dim">
        Vyplň formulář, klikni na mapě a vytvoříš nový POI. Pro polyline klikej
        více míst po sobě (každý klik = nový uzel cesty). Po přidání ho najdeš
        v seznamu dole — markery / uzly jsou tažitelné.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <aside className="card p-3 space-y-2 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-sasp-ink-dim">ID</span>
            <input
              type="text"
              value={draft.id}
              onChange={(e) => setDraft({ ...draft, id: e.target.value })}
              placeholder="street.olympic-fwy"
              className="answer-input"
              data-testid="add-poi-id"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-sasp-ink-dim">Název (CZ)</span>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="answer-input"
              data-testid="add-poi-name"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-sasp-ink-dim">Popis</span>
            <input
              type="text"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="answer-input"
              data-testid="add-poi-description"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-sasp-ink-dim">
              Aliasy (oddělené čárkou)
            </span>
            <input
              type="text"
              value={draft.aliasesRaw}
              onChange={(e) => setDraft({ ...draft, aliasesRaw: e.target.value })}
              placeholder="olympic, olympic freeway"
              className="answer-input"
              data-testid="add-poi-aliases"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-sasp-ink-dim">Kategorie</span>
            <select
              value={draft.category}
              onChange={(e) =>
                setDraft({ ...draft, category: e.target.value as POICategory })
              }
              className="answer-input"
              data-testid="add-poi-category"
            >
              <option value="landmark">landmark</option>
              <option value="pd">pd</option>
              <option value="fire">fire</option>
              <option value="ems">ems</option>
              <option value="ammu">ammu</option>
              <option value="street">street</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-sasp-ink-dim">Geometrie</span>
            <select
              value={draft.geometry}
              onChange={(e) => {
                setDraft({ ...draft, geometry: e.target.value as Geometry });
                setPlacingPoint(null);
                setPlacingPath([]);
              }}
              className="answer-input"
              data-testid="add-poi-geometry"
            >
              <option value="point">point (1 marker)</option>
              <option value="polyline">polyline (více nodů)</option>
            </select>
          </label>

          <div className="rounded bg-sasp-navy/30 px-2 py-1.5 text-xs">
            {draft.geometry === 'point'
              ? placingPoint
                ? `Bod: x=${placingPoint.x.toFixed(3)} y=${placingPoint.y.toFixed(3)}`
                : 'Klikni na mapě pro umístění.'
              : `Polyline: ${placingPath.length} uzlů` +
                (placingPath.length < 2 ? ' (potřebuješ ≥2)' : '')}
          </div>

          {draft.geometry === 'polyline' && placingPath.length > 0 && (
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => setPlacingPath((p) => p.slice(0, -1))}
            >
              Smazat poslední uzel
            </button>
          )}

          <button
            type="button"
            className="btn-primary w-full"
            disabled={!canAdd}
            onClick={handleAdd}
            data-testid="add-poi-submit"
          >
            Přidat POI
          </button>
        </aside>

        <div className="space-y-3">
          <GeoMap onMapClick={handleMapClick}>
            {placingPoint && (
              <PendingPointMarker
                position={placingPoint}
                label={draft.name || draft.id || '(nový bod)'}
                onMove={(pos) => setPlacingPoint(pos)}
              />
            )}
            {placingPath.length >= 2 && (
              <Polyline
                positions={placingPath.map((p) => toLatLng(p, TILE_META))}
                pathOptions={{ color: '#d4a256', weight: 4, opacity: 0.8, dashArray: '4 6' }}
              />
            )}
            {placingPath.map((pt, idx) => (
              <PendingPathNode
                key={idx}
                idx={idx}
                position={pt}
                onMove={(pos) =>
                  setPlacingPath((prev) => prev.map((p, i) => (i === idx ? pos : p)))
                }
              />
            ))}
            {added.map((poi) =>
              poi.geometry === 'point' ? (
                <AddedPoint key={poi.id} poi={poi} onMove={movePoint} />
              ) : (
                <AddedPolyline key={poi.id} poi={poi} onMove={movePathNode} />
              ),
            )}
          </GeoMap>

          {added.length > 0 && (
            <div className="card p-3 space-y-2">
              <h3 className="text-sm font-medium text-sasp-tan">
                Přidané POI ({added.length})
              </h3>
              <ul className="space-y-1 text-xs">
                {added.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <code className="flex-1 truncate">{p.id}</code>
                    <span className="text-sasp-ink-dim">{p.category}</span>
                    <span className="text-sasp-ink-dim">{p.geometry}</span>
                    <button
                      type="button"
                      className="text-sasp-red hover:underline"
                      onClick={() => deleteAdded(p.id)}
                    >
                      smazat
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="btn-primary"
                disabled={!tsOutput}
                onClick={handleCopy}
              >
                {copied ? '✓ Zkopírováno' : 'Zkopírovat TS'}
              </button>
              {tsOutput && (
                <details className="mt-2" open>
                  <summary className="cursor-pointer text-xs text-sasp-tan">
                    Výstup (paste do <code>pois.ts</code>)
                  </summary>
                  <textarea
                    className="w-full mt-2 bg-sasp-bg/60 border border-sasp-navy-light rounded p-2 text-xs font-mono text-sasp-ink"
                    rows={15}
                    readOnly
                    value={tsOutput}
                    data-testid="add-poi-output"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PendingPointMarker({
  position,
  label,
  onMove,
}: {
  position: Vec2;
  label: string;
  onMove: (pos: Vec2) => void;
}) {
  const icon = divIcon({
    html: '<div class="geo-marker geo-marker--asked"><span class="geo-marker__dot"></span></div>',
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
  return (
    <Marker
      position={toLatLng(position, TILE_META)}
      icon={icon}
      draggable
      eventHandlers={{
        dragend: (e: LeafletEvent) => {
          const m = e.target as { getLatLng: () => { lat: number; lng: number } };
          onMove(fromLatLng(m.getLatLng(), TILE_META));
        },
      }}
    >
      <Tooltip permanent direction="right" offset={[10, 0]}>
        {label}
      </Tooltip>
    </Marker>
  );
}

function PendingPathNode({
  idx,
  position,
  onMove,
}: {
  idx: number;
  position: Vec2;
  onMove: (pos: Vec2) => void;
}) {
  const icon = divIcon({
    html: `<div class="geo-marker geo-marker--asked" style="width: 10px; height: 10px;" data-idx="${idx}"><span class="geo-marker__dot" style="width: 8px; height: 8px;"></span></div>`,
    className: '',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
  return (
    <Marker
      position={toLatLng(position, TILE_META)}
      icon={icon}
      draggable
      eventHandlers={{
        dragend: (e: LeafletEvent) => {
          const m = e.target as { getLatLng: () => { lat: number; lng: number } };
          onMove(fromLatLng(m.getLatLng(), TILE_META));
        },
      }}
    />
  );
}

function AddedPoint({
  poi,
  onMove,
}: {
  poi: Extract<POI, { geometry: 'point' }>;
  onMove: (id: string, pos: Vec2) => void;
}) {
  const icon = divIcon({
    html: '<div class="geo-marker geo-marker--mastered"><span class="geo-marker__dot"></span></div>',
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
  return (
    <Marker
      position={toLatLng(poi.position, TILE_META)}
      icon={icon}
      draggable
      eventHandlers={{
        dragend: (e: LeafletEvent) => {
          const m = e.target as { getLatLng: () => { lat: number; lng: number } };
          onMove(poi.id, fromLatLng(m.getLatLng(), TILE_META));
        },
      }}
    >
      <Tooltip direction="right" offset={[10, 0]} opacity={0.85}>
        {poi.name}
      </Tooltip>
    </Marker>
  );
}

function AddedPolyline({
  poi,
  onMove,
}: {
  poi: Extract<POI, { geometry: 'polyline' }>;
  onMove: (id: string, idx: number, pos: Vec2) => void;
}) {
  const positions = poi.path.map((pt) => toLatLng(pt, TILE_META));
  const midIdx = Math.floor(poi.path.length / 2);
  return (
    <>
      <Polyline positions={positions} pathOptions={{ color: '#7fc99a', weight: 4, opacity: 0.6 }} />
      {poi.path.map((pt, idx) => {
        const icon = divIcon({
          html: `<div class="geo-marker geo-marker--mastered" style="width: 10px; height: 10px;"><span class="geo-marker__dot" style="width: 8px; height: 8px;"></span></div>`,
          className: '',
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        return (
          <Marker
            key={`${poi.id}-${idx}`}
            position={toLatLng(pt, TILE_META)}
            icon={icon}
            draggable
            eventHandlers={{
              dragend: (e: LeafletEvent) => {
                const m = e.target as { getLatLng: () => { lat: number; lng: number } };
                onMove(poi.id, idx, fromLatLng(m.getLatLng(), TILE_META));
              },
            }}
          >
            {idx === midIdx && (
              <Tooltip direction="right" offset={[8, 0]} opacity={0.75}>
                {poi.name}
              </Tooltip>
            )}
          </Marker>
        );
      })}
    </>
  );
}
