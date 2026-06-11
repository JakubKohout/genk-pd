import { useMemo, useState } from 'react';
import { divIcon, type LeafletEvent } from 'leaflet';
import { Marker, Polyline, Tooltip } from 'react-leaflet';
import {
  RAW_STREETS,
  AREAS,
  AREA_BY_NAME,
} from '../../data/foxxiteSource.generated';
import {
  DEFAULT_STREET_ANCHORS,
  type StreetAnchorSeed,
} from '../../data/streetAnchorDefaults';
import { TILE_META } from '../../data/tileMeta';
import { fromLatLng, toLatLng } from '../../logic/coords';
import {
  polygonToCenterline,
  polylineCentroid,
  formatCoord,
} from '../../logic/calibrate';
import { gtaToNorm } from '../../logic/gtaProjection';
import { GeoMap } from '../GeoMap';
import type { Vec2 } from '../../data/types';

/**
 * Street recalibration tab. Backing math is the canonical uniform projection
 * (`gtaToNorm` from `gtaProjection.ts`) — the same that drives
 * `scripts/import-foxxite-streets.mjs`. Anchors are advisory landmarks the
 * user can verify visually (drag to fine-tune a particular spot if its
 * predicted position is off). They do NOT drive a TPS re-fit; streets always
 * re-derive from the linear projection so the tab's preview matches
 * `streets.generated.ts` 1:1.
 */

type ActiveAnchor = StreetAnchorSeed;

export function StreetAnchorsTab() {
  const [anchors, setAnchors] = useState<ActiveAnchor[]>(() =>
    DEFAULT_STREET_ANCHORS.map((a) => ({ ...a })),
  );
  const [pendingAreaName, setPendingAreaName] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [copied, setCopied] = useState(false);

  const moveAnchor = (id: string, pos: Vec2) => {
    setAnchors((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ourCoord: pos } : a)),
    );
  };

  const deleteAnchor = (id: string) => {
    setAnchors((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleMapClick = (point: Vec2) => {
    if (!pendingAreaName) return;
    const area = AREA_BY_NAME.get(pendingAreaName);
    if (!area) return;
    const id = `area:${pendingAreaName}`;
    setAnchors((prev) => {
      const without = prev.filter((a) => a.id !== id);
      return [
        ...without,
        {
          id,
          areaName: pendingAreaName,
          label: pendingAreaName,
          hint: '(přidáno za běhu)',
          gtaWorld: area.gtaCentroid,
          ourCoord: point,
        },
      ];
    });
    setSelectedId(id);
    setPendingAreaName('');
  };

  const resetDefaults = () => {
    setAnchors(DEFAULT_STREET_ANCHORS.map((a) => ({ ...a })));
    setSelectedId(null);
    setPendingAreaName('');
  };

  const availableAreas = useMemo(() => {
    const usedNames = new Set(
      anchors.map((a) => a.areaName).filter(Boolean) as string[],
    );
    return AREAS.filter((a) => !usedNames.has(a.name))
      .map((a) => a.name)
      .sort();
  }, [anchors]);

  // Streets via uniform projection — same math as the build-time import script.
  const polylines = useMemo(() => {
    return RAW_STREETS.map((s) => {
      const centerlineGta = polygonToCenterline(s.gtaRing);
      const path = centerlineGta.map(gtaToNorm);
      const centroid = polylineCentroid(path);
      return { ...s, path, centroid };
    });
  }, []);

  const selectedOutline = useMemo(() => {
    if (!selectedId) return null;
    const anchor = anchors.find((a) => a.id === selectedId);
    if (!anchor?.areaName) return null;
    const area = AREA_BY_NAME.get(anchor.areaName);
    if (!area) return null;
    return area.gtaRing.map(gtaToNorm);
  }, [anchors, selectedId]);

  const ghostOutline = useMemo(() => {
    if (!pendingAreaName) return null;
    const area = AREA_BY_NAME.get(pendingAreaName);
    if (!area) return null;
    return area.gtaRing.map(gtaToNorm);
  }, [pendingAreaName]);

  // Distance between each anchor's expected position (gtaToNorm) and its user-
  // set ourCoord. Big delta = user moved the anchor off the canonical position;
  // useful if the underlying map has slightly different bounds than the GTA
  // standard. Otherwise the delta should be 0.
  const anchorDeltas = useMemo(() => {
    return anchors.map((a) => {
      const expected = gtaToNorm(a.gtaWorld);
      const dx = a.ourCoord.x - expected.x;
      const dy = a.ourCoord.y - expected.y;
      return { id: a.id, delta: Math.hypot(dx, dy) };
    });
  }, [anchors]);

  const tsOutput = useMemo(() => {
    const lines: string[] = [];
    lines.push('// AUTO-GENERATED via /geo/calibrate → Kalibrace ulic — paste over');
    lines.push('// src/modules/geo/data/streets.generated.ts content (keep header).');
    lines.push(`// Generated: ${new Date().toISOString()}`);
    lines.push("import type { POI } from './types';");
    lines.push('');
    lines.push('export const STREETS: readonly POI[] = [');
    for (const e of polylines) {
      const fmt = (v: Vec2) =>
        `{ x: ${formatCoord(v.x)}, y: ${formatCoord(v.y)} }`;
      lines.push('  {');
      lines.push(`    id: ${JSON.stringify(e.id)},`);
      lines.push('    category: "street",');
      lines.push('    geometry: "polyline",');
      lines.push(`    name: ${JSON.stringify(e.displayName)},`);
      lines.push(`    description: ${JSON.stringify(e.description)},`);
      lines.push(`    aliases: ${JSON.stringify(e.aliases)},`);
      lines.push(`    centroid: ${fmt(e.centroid)},`);
      lines.push('    path: [');
      for (const p of e.path) lines.push(`      ${fmt(p)},`);
      lines.push('    ],');
      lines.push('  },');
    }
    lines.push('];');
    lines.push('');
    return lines.join('\n');
  }, [polylines]);

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

  const selectedAnchor = anchors.find((a) => a.id === selectedId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-sasp-ink-dim">
        Editor pro vizuální verifikaci anchorů a silnic.{' '}
        <span className="text-sasp-tan">Zelené čáry</span> = silnice z Foxxite,
        promítnuté přes <strong>uniform GTA-world projekci</strong>
        {' '}
        (žádný TPS — přesně jak je vidí <code>streets.generated.ts</code>).
        Anchory drag pro ověření, že landmark sedí na satelitu — pokud Δ je
        mizivá, mapa je správně kalibrovaná.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        <aside className="card p-3 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sasp-tan">
              Anchory ({anchors.length})
            </h3>
            <button
              type="button"
              className="text-xs text-sasp-ink-dim hover:text-sasp-ink underline"
              onClick={resetDefaults}
              data-testid="street-anchors-reset"
            >
              Reset na defaultní
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs text-sasp-ink-dim">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="accent-sasp-tan"
            />
            Zobrazit labely u markerů
          </label>

          <ul
            className="space-y-1 max-h-[360px] overflow-y-auto pr-1"
            data-testid="street-anchors-list"
          >
            {anchors.map((a) => {
              const isSelected = a.id === selectedId;
              const delta = anchorDeltas.find((d) => d.id === a.id)?.delta ?? 0;
              const deltaClass =
                delta < 0.005 ? 'text-sasp-tan' : delta < 0.02 ? 'text-yellow-300' : 'text-sasp-red';
              return (
                <li
                  key={a.id}
                  className={[
                    'border rounded p-2 cursor-pointer text-xs space-y-0.5',
                    isSelected
                      ? 'border-sasp-tan bg-sasp-tan/10'
                      : 'border-sasp-navy-light/40 hover:border-sasp-navy-light',
                  ].join(' ')}
                  onClick={() => setSelectedId(a.id)}
                >
                  <div className="flex items-center gap-2">
                    <strong className="flex-1 text-sasp-ink">{a.label}</strong>
                    <span className={`font-mono ${deltaClass}`}>
                      Δ {delta.toFixed(3)}
                    </span>
                    <button
                      type="button"
                      className="text-sasp-red hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAnchor(a.id);
                      }}
                      title="Smazat anchor"
                    >
                      ×
                    </button>
                  </div>
                  <div className="text-sasp-ink-dim leading-tight">
                    {a.hint}
                  </div>
                </li>
              );
            })}
          </ul>

          <details>
            <summary className="cursor-pointer text-xs text-sasp-tan">
              + Přidat anchor z Foxxite areas
            </summary>
            <div className="mt-2 space-y-1">
              <select
                value={pendingAreaName}
                onChange={(e) => setPendingAreaName(e.target.value)}
                className="answer-input text-sm w-full"
                data-testid="street-anchors-area-select"
              >
                <option value="">— vyber area —</option>
                {availableAreas.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {pendingAreaName && (
                <span className="text-xs text-sasp-tan block">
                  Klikni na mapě → umístíš „{pendingAreaName}"
                </span>
              )}
            </div>
          </details>

          <button
            type="button"
            className="btn-primary w-full"
            onClick={handleCopy}
            data-testid="street-anchors-copy"
          >
            {copied ? '✓ Zkopírováno' : 'Zkopírovat TS výstup'}
          </button>
        </aside>

        <div className="space-y-2">
          {selectedAnchor && (
            <div className="card p-2 text-xs flex items-baseline gap-2">
              <span className="text-sasp-tan font-medium">
                Vybraný anchor: {selectedAnchor.label}
              </span>
              <span className="text-sasp-ink-dim flex-1">
                {selectedAnchor.hint}
              </span>
            </div>
          )}
          <GeoMap onMapClick={pendingAreaName ? handleMapClick : undefined}>
            {selectedOutline && selectedOutline.length >= 3 && (
              <Polyline
                positions={[...selectedOutline, selectedOutline[0]!].map((pt) =>
                  toLatLng(pt, TILE_META),
                )}
                pathOptions={{
                  color: '#d4a256',
                  weight: 2,
                  opacity: 0.85,
                  dashArray: '4 4',
                }}
              />
            )}
            {ghostOutline && ghostOutline.length >= 3 && (
              <Polyline
                positions={[...ghostOutline, ghostOutline[0]!].map((pt) =>
                  toLatLng(pt, TILE_META),
                )}
                pathOptions={{
                  color: '#52a163',
                  weight: 2,
                  opacity: 0.9,
                  dashArray: '2 4',
                }}
              />
            )}
            {anchors.map((a) => (
              <AnchorMarker
                key={a.id}
                anchor={a}
                showLabel={showLabels}
                selected={a.id === selectedId}
                onSelect={() => setSelectedId(a.id)}
                onMove={moveAnchor}
              />
            ))}
            {polylines.map((p) => (
              <Polyline
                key={p.id}
                positions={p.path.map((pt) => toLatLng(pt, TILE_META))}
                pathOptions={{ color: '#52a163', weight: 4, opacity: 0.85 }}
              >
                <Tooltip direction="center" sticky opacity={0.85}>
                  {p.displayName}
                </Tooltip>
              </Polyline>
            ))}
          </GeoMap>
        </div>
      </div>

      <details className="card p-3">
        <summary className="cursor-pointer text-sm font-medium text-sasp-tan">
          Výstup TS ({polylines.length} silnic — paste do{' '}
          <code>streets.generated.ts</code>)
        </summary>
        <textarea
          className="w-full mt-3 bg-sasp-bg/60 border border-sasp-navy-light rounded p-2 text-xs font-mono text-sasp-ink"
          rows={18}
          readOnly
          value={tsOutput}
          data-testid="street-anchors-output"
          onFocus={(e) => e.currentTarget.select()}
        />
      </details>
    </div>
  );
}

interface AnchorMarkerProps {
  anchor: ActiveAnchor;
  showLabel: boolean;
  selected: boolean;
  onSelect: () => void;
  onMove: (id: string, pos: Vec2) => void;
}

function AnchorMarker({ anchor, showLabel, selected, onSelect, onMove }: AnchorMarkerProps) {
  const cls = selected
    ? 'geo-vertex-handle geo-vertex-handle--selected'
    : 'geo-vertex-handle';
  const icon = divIcon({
    html: `<div class="${cls}" data-anchor="${anchor.id}"></div>`,
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
  return (
    <Marker
      position={toLatLng(anchor.ourCoord, TILE_META)}
      icon={icon}
      draggable
      eventHandlers={{
        click: onSelect,
        dragstart: onSelect,
        dragend: (e: LeafletEvent) => {
          const m = e.target as { getLatLng: () => { lat: number; lng: number } };
          onMove(anchor.id, fromLatLng(m.getLatLng(), TILE_META));
        },
      }}
    >
      {showLabel && (
        <Tooltip
          permanent
          direction="right"
          offset={[8, 0]}
          opacity={selected ? 1 : 0.7}
          className="geo-marker-tooltip geo-marker-tooltip--target"
        >
          {anchor.label}
        </Tooltip>
      )}
    </Marker>
  );
}
