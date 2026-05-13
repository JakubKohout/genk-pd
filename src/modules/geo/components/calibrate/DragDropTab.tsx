import { useMemo, useState } from 'react';
import { divIcon, type LeafletEvent } from 'leaflet';
import { Marker, Polyline, Tooltip } from 'react-leaflet';
import { POIS } from '../../data/pois';
import { TILE_META } from '../../data/tileMeta';
import { fromLatLng, toLatLng } from '../../logic/coords';
import { formatPoisTs } from '../../logic/calibrate';
import { GeoMap } from '../GeoMap';
import type { POI, Vec2 } from '../../data/types';

/**
 * Per-POI drag-and-drop editor. Each point POI = draggable marker. Each polyline
 * POI = polyline + per-node draggable handles. On every drag, local state updates
 * and the TS literal output is regenerated for paste-back into pois.ts.
 */
export function DragDropTab() {
  const [pois, setPois] = useState<POI[]>(() => POIS.map((p) => structuredClone(p)));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const updatePoint = (id: string, pos: Vec2) => {
    setPois((prev) =>
      prev.map((p) => (p.id === id && p.geometry === 'point' ? { ...p, position: pos } : p)),
    );
  };

  const updatePathNode = (id: string, idx: number, pos: Vec2) => {
    setPois((prev) =>
      prev.map((p) => {
        if (p.id !== id || p.geometry !== 'polyline') return p;
        const newPath = p.path.map((pt, i) => (i === idx ? pos : pt));
        return { ...p, path: newPath };
      }),
    );
  };

  const resetAll = () => {
    setPois(POIS.map((p) => structuredClone(p)));
    setSelectedId(null);
  };

  const tsOutput = useMemo(() => formatPoisTs(pois), [pois]);

  const handleCopy = async () => {
    const full = `export const POIS: readonly POI[] = [\n${tsOutput}\n];`;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback: select textarea
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-sasp-ink-dim">
        Každý POI je <strong>tažitelný marker</strong>. Chyť ho a přesuň přímo na
        správné místo na mapě. Ulice mají na každém uzlu cesty malý oranžový
        marker, který lze taky tahat. Až bude vše umístěné, zkopíruj výstup dole
        a paste do <code>src/modules/geo/data/pois.ts</code>.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={resetAll}
          data-testid="geo-edit-reset"
        >
          Reset (načíst znovu z pois.ts)
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleCopy}
          data-testid="geo-edit-copy"
        >
          {copied ? '✓ Zkopírováno' : 'Zkopírovat výstup'}
        </button>
        <span className="text-xs text-sasp-ink-dim self-center">
          {pois.length} POI · vybráno:{' '}
          {selectedId ? <code>{selectedId}</code> : 'nic'}
        </span>
      </div>

      <GeoMap>
        {pois.map((poi) =>
          poi.geometry === 'point' ? (
            <DraggablePoint
              key={poi.id}
              poi={poi}
              selected={selectedId === poi.id}
              onSelect={() => setSelectedId(poi.id)}
              onMove={updatePoint}
            />
          ) : (
            <DraggablePolyline
              key={poi.id}
              poi={poi}
              selected={selectedId === poi.id}
              onSelect={() => setSelectedId(poi.id)}
              onMovePathNode={updatePathNode}
            />
          ),
        )}
      </GeoMap>

      <details className="card p-4" open>
        <summary className="cursor-pointer text-sm font-medium text-sasp-tan">
          Výstup — TS literál (paste do pois.ts)
        </summary>
        <textarea
          className="w-full mt-3 bg-sasp-bg/60 border border-sasp-navy-light rounded p-2 text-xs font-mono text-sasp-ink"
          rows={20}
          readOnly
          value={`export const POIS: readonly POI[] = [\n${tsOutput}\n];`}
          data-testid="geo-edit-output"
          onFocus={(e) => e.currentTarget.select()}
        />
      </details>
    </div>
  );
}

interface DraggablePointProps {
  poi: Extract<POI, { geometry: 'point' }>;
  selected: boolean;
  onSelect: () => void;
  onMove: (id: string, pos: Vec2) => void;
}

function DraggablePoint({ poi, selected, onSelect, onMove }: DraggablePointProps) {
  const cls = selected ? 'geo-marker geo-marker--asked' : 'geo-marker geo-marker--target';
  const icon = divIcon({
    html: `<div class="${cls}" data-poi-id="${poi.id}"><span class="geo-marker__dot"></span></div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
  return (
    <Marker
      position={toLatLng(poi.position, TILE_META)}
      icon={icon}
      draggable
      eventHandlers={{
        click: onSelect,
        dragstart: onSelect,
        dragend: (e: LeafletEvent) => {
          const m = e.target as { getLatLng: () => { lat: number; lng: number } };
          const pos = fromLatLng(m.getLatLng(), TILE_META);
          onMove(poi.id, pos);
        },
      }}
    >
      <Tooltip
        permanent
        direction="right"
        offset={[10, 0]}
        opacity={selected ? 1 : 0.85}
        className="geo-marker-tooltip geo-marker-tooltip--target"
      >
        {poi.name}
      </Tooltip>
    </Marker>
  );
}

interface DraggablePolylineProps {
  poi: Extract<POI, { geometry: 'polyline' }>;
  selected: boolean;
  onSelect: () => void;
  onMovePathNode: (id: string, idx: number, pos: Vec2) => void;
}

function DraggablePolyline({
  poi,
  selected,
  onSelect,
  onMovePathNode,
}: DraggablePolylineProps) {
  const positions = poi.path.map((pt) => toLatLng(pt, TILE_META));
  const midIdx = Math.floor(poi.path.length / 2);
  return (
    <>
      <Polyline
        positions={positions}
        pathOptions={{
          color: selected ? '#d4a256' : '#7fc99a',
          opacity: selected ? 1 : 0.6,
          weight: selected ? 6 : 4,
        }}
        eventHandlers={{ click: onSelect }}
      />
      {poi.path.map((pt, idx) => (
        <PathNodeMarker
          key={`${poi.id}-${idx}`}
          poiId={poi.id}
          idx={idx}
          position={pt}
          label={idx === midIdx ? poi.name : undefined}
          selected={selected}
          onSelect={onSelect}
          onMove={onMovePathNode}
        />
      ))}
    </>
  );
}

interface PathNodeMarkerProps {
  poiId: string;
  idx: number;
  position: Vec2;
  label?: string;
  selected: boolean;
  onSelect: () => void;
  onMove: (id: string, idx: number, pos: Vec2) => void;
}

function PathNodeMarker({
  poiId,
  idx,
  position,
  label,
  selected,
  onSelect,
  onMove,
}: PathNodeMarkerProps) {
  const cls = selected
    ? 'geo-marker geo-marker--asked'
    : 'geo-marker geo-marker--mastered';
  const icon = divIcon({
    html: `<div class="${cls}" data-poi-id="${poiId}" data-path-idx="${idx}" style="width: 10px; height: 10px;"><span class="geo-marker__dot" style="width: 8px; height: 8px;"></span></div>`,
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
        click: onSelect,
        dragstart: onSelect,
        dragend: (e: LeafletEvent) => {
          const m = e.target as { getLatLng: () => { lat: number; lng: number } };
          const pos = fromLatLng(m.getLatLng(), TILE_META);
          onMove(poiId, idx, pos);
        },
      }}
    >
      {label && (
        <Tooltip
          permanent
          direction="right"
          offset={[8, 0]}
          opacity={selected ? 1 : 0.75}
          className="geo-marker-tooltip"
        >
          {label}
        </Tooltip>
      )}
    </Marker>
  );
}
