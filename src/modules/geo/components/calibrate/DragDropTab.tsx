import { useMemo, useState } from 'react';
import { divIcon, type LeafletEvent, type LeafletMouseEvent } from 'leaflet';
import { Marker, Polyline, Tooltip } from 'react-leaflet';
import { POIS } from '../../data/pois';
import { TILE_META } from '../../data/tileMeta';
import { fromLatLng, toLatLng } from '../../logic/coords';
import { formatPoisTs, polylineCentroid } from '../../logic/calibrate';
import { pointToSegmentDist } from '../../logic/hitTest';
import { GeoMap } from '../GeoMap';
import type { POI, Vec2 } from '../../data/types';

/**
 * Per-POI drag-and-drop editor. Points = draggable markers. Polylines (streets) =
 * Leaflet Polyline + per-node draggable handles. Click on the polyline body
 * inserts a new node at the projection point; double-click on a node deletes it
 * (min 2 nodes). Centroid recomputes as arc-length midpoint on every edit.
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

  const updatePolylineNode = (id: string, index: number, pos: Vec2) => {
    setPois((prev) =>
      prev.map((p) => {
        if (p.id !== id || p.geometry !== 'polyline') return p;
        const path = p.path.map((pt, i) => (i === index ? pos : pt));
        return { ...p, path, centroid: polylineCentroid(path) };
      }),
    );
  };

  const insertPolylineNode = (id: string, click: Vec2) => {
    setPois((prev) =>
      prev.map((p) => {
        if (p.id !== id || p.geometry !== 'polyline') return p;
        // Find the segment closest to the click, insert node at projection.
        let bestSeg = 0;
        let bestDist = Infinity;
        for (let i = 0; i < p.path.length - 1; i++) {
          const d = pointToSegmentDist(click, p.path[i]!, p.path[i + 1]!);
          if (d < bestDist) {
            bestDist = d;
            bestSeg = i;
          }
        }
        const path = [...p.path];
        path.splice(bestSeg + 1, 0, click);
        return { ...p, path, centroid: polylineCentroid(path) };
      }),
    );
  };

  const deletePolylineNode = (id: string, index: number) => {
    setPois((prev) =>
      prev.map((p) => {
        if (p.id !== id || p.geometry !== 'polyline') return p;
        if (p.path.length <= 2) return p; // keep min 2 nodes
        const path = p.path.filter((_, i) => i !== index);
        return { ...p, path, centroid: polylineCentroid(path) };
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
        Body se táhnou přímo. <strong>Polyline</strong> (ulice) má každý uzel jako
        oranžový handle — <strong>drag</strong> uzel přesune, <strong>klik na čáru</strong>{' '}
        vloží nový uzel na pozici kliku, <strong>dvojklik na uzel</strong> ho smaže
        (min 2 uzly). Až bude vše umístěné, zkopíruj výstup dole a paste do{' '}
        <code>src/modules/geo/data/pois.ts</code> (pro body) nebo přepiš obsah{' '}
        <code>streets.generated.ts</code> (pro ulice).
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
        {pois.map((poi) => {
          if (poi.geometry === 'point') {
            return (
              <DraggablePoint
                key={poi.id}
                poi={poi}
                selected={selectedId === poi.id}
                onSelect={() => setSelectedId(poi.id)}
                onMove={updatePoint}
              />
            );
          }
          if (poi.geometry === 'polyline') {
            return (
              <DraggablePolyline
                key={poi.id}
                poi={poi}
                selected={selectedId === poi.id}
                onSelect={() => setSelectedId(poi.id)}
                onMoveNode={updatePolylineNode}
                onInsertNode={insertPolylineNode}
                onDeleteNode={deletePolylineNode}
              />
            );
          }
          // poi.geometry === 'polygon' — no in-place editor yet; rings are
          // sourced from Foxxite GeoJSON via the import script, not hand-drawn.
          return null;
        })}
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
  onMoveNode: (id: string, index: number, pos: Vec2) => void;
  onInsertNode: (id: string, click: Vec2) => void;
  onDeleteNode: (id: string, index: number) => void;
}

function DraggablePolyline({
  poi,
  selected,
  onSelect,
  onMoveNode,
  onInsertNode,
  onDeleteNode,
}: DraggablePolylineProps) {
  const positions = poi.path.map((p) => toLatLng(p, TILE_META));
  return (
    <>
      <Polyline
        positions={positions}
        pathOptions={{
          color: selected ? '#d4a256' : '#7fc99a',
          weight: selected ? 5 : 3.5,
          opacity: selected ? 1 : 0.7,
        }}
        eventHandlers={{
          click: (e: LeafletMouseEvent) => {
            onSelect();
            const click = fromLatLng(e.latlng, TILE_META);
            onInsertNode(poi.id, click);
          },
        }}
      >
        <Tooltip
          direction="center"
          opacity={selected ? 1 : 0.75}
          className="geo-marker-tooltip geo-marker-tooltip--target"
          sticky
        >
          {poi.name}
        </Tooltip>
      </Polyline>
      {poi.path.map((pt, idx) => (
        <NodeHandle
          key={`${poi.id}-${idx}`}
          poiId={poi.id}
          index={idx}
          position={pt}
          selected={selected}
          canDelete={poi.path.length > 2}
          onSelect={onSelect}
          onMove={onMoveNode}
          onDelete={onDeleteNode}
        />
      ))}
    </>
  );
}

interface NodeHandleProps {
  poiId: string;
  index: number;
  position: Vec2;
  selected: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onMove: (id: string, index: number, pos: Vec2) => void;
  onDelete: (id: string, index: number) => void;
}

function NodeHandle({
  poiId,
  index,
  position,
  selected,
  canDelete,
  onSelect,
  onMove,
  onDelete,
}: NodeHandleProps) {
  const cls = selected ? 'geo-vertex-handle geo-vertex-handle--selected' : 'geo-vertex-handle';
  const icon = divIcon({
    html: `<div class="${cls}" data-poi-id="${poiId}" data-vertex-idx="${index}"></div>`,
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
          onMove(poiId, index, pos);
        },
        dblclick: () => {
          if (canDelete) onDelete(poiId, index);
        },
      }}
    />
  );
}
