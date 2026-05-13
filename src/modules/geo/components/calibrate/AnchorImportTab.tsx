import { useMemo, useState } from 'react';
import { divIcon, type LeafletEvent } from 'leaflet';
import { Marker, Tooltip } from 'react-leaflet';
import {
  MG_LOCATIONS,
  MG_LOCATION_BY_ID,
  type MapGenieLocation,
} from '../../data/mapgenieLocations';
import { buildDefaultAnchors } from '../../data/anchorsCalibration';
import { TILE_META } from '../../data/tileMeta';
import { fromLatLng, toLatLng } from '../../logic/coords';
import {
  applyMgTransform,
  computeLooResiduals,
  computeResiduals,
  fitAnchorTransformMode,
  type AnchorPair,
  type TransformMode,
} from '../../logic/transform';
import { formatCoord } from '../../logic/calibrate';
import { GeoMap } from '../GeoMap';
import type { Vec2 } from '../../data/types';

/**
 * Anchor calibration + bulk-import tab.
 *
 * Workflow:
 *   1. Pick a Map Genie location from the searchable list.
 *   2. Click on the map at the spot that location is in real life.
 *   3. After ≥3 anchor pairs, an affine transform is fitted (Map Genie lat/lng
 *      → our 0..1 coords). Residuals shown for sanity check.
 *   4. Filter the MG list by category, select which locations to import.
 *   5. "Generate POIs TS" outputs paste-ready entries for `pois.ts`.
 *
 * Czech names + final aliases are still curated manually via `docs/poi-mapping.md`;
 * this tab emits MG title + a slug ID. Refine before pasting.
 */
export function AnchorImportTab() {
  const [search, setSearch] = useState('');
  const [pendingMgId, setPendingMgId] = useState<number | null>(null);
  const [anchors, setAnchors] = useState<AnchorPair[]>(() => buildDefaultAnchors());
  const [selectedForImport, setSelectedForImport] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const [previewAll, setPreviewAll] = useState(false);
  const [mode, setMode] = useState<TransformMode>('auto');

  const filteredMg = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MG_LOCATIONS;
    return MG_LOCATIONS.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.category_title?.toLowerCase().includes(q),
    );
  }, [search]);

  const transform = useMemo(
    () => fitAnchorTransformMode(anchors, mode),
    [anchors, mode],
  );

  const looResiduals = useMemo(
    () => computeLooResiduals(anchors, mode),
    [anchors, mode],
  );

  const residuals = useMemo(
    () => (transform ? computeResiduals(anchors, transform) : []),
    [transform, anchors],
  );

  const handleMapClick = (point: Vec2) => {
    if (pendingMgId === null) return;
    const mg = MG_LOCATION_BY_ID.get(pendingMgId);
    if (!mg) return;
    setAnchors((prev) => {
      const without = prev.filter((a) => a.mgLocationId !== pendingMgId);
      return [
        ...without,
        {
          mgLocationId: pendingMgId,
          mgLatLng: { latitude: mg.latitude, longitude: mg.longitude },
          ourCoord: point,
        },
      ];
    });
    setPendingMgId(null);
  };

  const moveAnchor = (id: number, pos: Vec2) => {
    setAnchors((prev) =>
      prev.map((a) => (a.mgLocationId === id ? { ...a, ourCoord: pos } : a)),
    );
  };

  const deleteAnchor = (id: number) => {
    setAnchors((prev) => prev.filter((a) => a.mgLocationId !== id));
  };

  const toggleImportSelection = (id: number) => {
    setSelectedForImport((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllInCategory = (catTitle: string | null) => {
    setSelectedForImport((prev) => {
      const next = new Set(prev);
      for (const l of filteredMg) {
        if (l.category_title === catTitle) next.add(l.id);
      }
      return next;
    });
  };

  const tsOutput = useMemo(() => {
    if (!transform || selectedForImport.size === 0) return '';
    const out: string[] = [];
    for (const id of selectedForImport) {
      const mg = MG_LOCATION_BY_ID.get(id);
      if (!mg) continue;
      const pos = applyMgTransform(mg, transform);
      const slug = slugify(mg.title);
      const cat = mgCategoryToOurs(mg.category_title);
      out.push('  {');
      out.push(`    id: ${JSON.stringify(`${cat}.${slug}`)},`);
      out.push(`    category: ${JSON.stringify(cat)},`);
      out.push(`    geometry: "point",`);
      out.push(
        `    position: { x: ${formatCoord(pos.x)}, y: ${formatCoord(pos.y)} },`,
      );
      out.push(`    name: ${JSON.stringify(mg.title)},`);
      out.push(`    description: ${JSON.stringify(mg.title)},`);
      out.push(`    aliases: ${JSON.stringify([mg.title.toLowerCase()])},`);
      out.push('  },');
    }
    return out.join('\n');
  }, [transform, selectedForImport]);

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
        Pro každý dobře známý landmark vyber jeho Map Genie záznam vlevo a klikni
        na mapě, kde je. Po 3+ kotvách se fit affine transformace; pak vyber
        kategorie / lokace dole vpravo a vygeneruj TS literál pro paste do{' '}
        <code>pois.ts</code>. České názvy a aliasy doplň ručně podle{' '}
        <code>docs/poi-mapping.md</code>.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <aside className="card p-3 flex flex-col gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase text-sasp-ink-dim">Hledat MG</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="title nebo kategorie"
              className="answer-input"
              data-testid="anchor-search"
            />
          </label>
          <div
            className="overflow-y-auto max-h-[480px] flex flex-col gap-1"
            data-testid="anchor-mg-list"
          >
            {filteredMg.slice(0, 100).map((l) => {
              const anchored = anchors.find((a) => a.mgLocationId === l.id);
              const pending = pendingMgId === l.id;
              const selected = selectedForImport.has(l.id);
              return (
                <div
                  key={l.id}
                  className={[
                    'rounded border px-2 py-1.5 text-xs flex items-center gap-2',
                    pending
                      ? 'border-sasp-tan bg-sasp-tan/10'
                      : anchored
                        ? 'border-emerald-500/60 bg-emerald-500/10'
                        : 'border-sasp-navy-light',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleImportSelection(l.id)}
                    data-testid={`anchor-import-${l.id}`}
                    className="accent-sasp-tan"
                    title="Zahrnout do exportu"
                  />
                  <button
                    type="button"
                    onClick={() => setPendingMgId(l.id)}
                    className="flex-1 text-left truncate"
                    title={l.title}
                  >
                    <span className="block truncate">{l.title}</span>
                    <span className="block text-[10px] text-sasp-ink-dim">
                      {l.category_title}
                    </span>
                  </button>
                  {anchored && <span aria-hidden>✓</span>}
                </div>
              );
            })}
            {filteredMg.length > 100 && (
              <span className="text-xs text-sasp-ink-dim italic px-2 py-1">
                + {filteredMg.length - 100} dalších (zúžit hledání)
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            {[
              'Police Station',
              'Hospital',
              'Building',
              'Mountain Peak',
              'Lookout Point',
              'Fire Station',
              'Ammu-Nation',
            ].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => selectAllInCategory(cat)}
                className="rounded border border-sasp-navy-light px-1.5 py-0.5"
              >
                + {cat}
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-3">
          {pendingMgId !== null && (
            <div className="card p-3 text-sm bg-sasp-tan/10 border-sasp-tan">
              Klikni na mapě, kde leží{' '}
              <strong>{MG_LOCATION_BY_ID.get(pendingMgId)?.title}</strong>.
              <button
                type="button"
                onClick={() => setPendingMgId(null)}
                className="ml-3 text-xs underline"
              >
                zrušit
              </button>
            </div>
          )}

          <GeoMap onMapClick={handleMapClick}>
            {anchors.map((a) => (
              <AnchorMarker
                key={a.mgLocationId}
                anchor={a}
                onMove={moveAnchor}
              />
            ))}
            {transform &&
              (previewAll
                ? MG_LOCATIONS
                : [...selectedForImport]
                    .map((id) => MG_LOCATION_BY_ID.get(id))
                    .filter((m): m is MapGenieLocation => Boolean(m))
              ).map((mg) => {
                if (anchors.some((a) => a.mgLocationId === mg.id)) return null;
                const pos = applyMgTransform(mg, transform);
                return <PreviewMarker key={mg.id} title={mg.title} position={pos} />;
              })}
          </GeoMap>

          {anchors.length > 0 && (
            <div className="card p-3 space-y-2 text-xs">
              <h3 className="text-sm font-medium text-sasp-tan">
                Kotvy ({anchors.length}) — tahej markery nebo edituj zde
              </h3>
              {anchors.length === 3 && mode !== 'tps' && (
                <div className="rounded border border-sasp-tan/60 bg-sasp-tan/10 px-2 py-1.5 text-sasp-tan">
                  <strong>Pozor:</strong> 3 kotvy + 6-param ={' '}
                  <strong>perfect fit (Δ=0) bez kontroly</strong>. Přidej 4.–5.
                  kotvu pro skutečnou validaci.
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sasp-ink-dim">Model:</span>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as TransformMode)}
                  className="answer-input text-xs py-0.5"
                  data-testid="anchor-mode"
                >
                  <option value="auto">auto (4 → 6-param)</option>
                  <option value="affine6">6-param affine</option>
                  <option value="tps">TPS (přesná interpolace)</option>
                </select>
                <span className="text-[10px] text-sasp-ink-dim italic">
                  {mode === 'tps'
                    ? 'TPS prochází přesně všemi kotvami (Δ=0). Sleduj Δ LOO níže.'
                    : 'Δ = residual po least-squares fit. Δ LOO = leave-one-out (vyhoď kotvu, fit ostatních, predict ji zpět) — vyšší LOO = outlier.'}
                </span>
              </div>
              <p className="text-sasp-ink-dim">
                Marker na mapě je <strong>tažitelný</strong>. "re-pick" zruší
                kotvu a další klik na mapu ji přemístí.
              </p>
              <ul className="space-y-1">
                {anchors.map((a) => {
                  const mg = MG_LOCATION_BY_ID.get(a.mgLocationId);
                  const r = residuals.find((x) => x.mgLocationId === a.mgLocationId);
                  const loo = looResiduals?.find(
                    (x) => x.mgLocationId === a.mgLocationId,
                  );
                  return (
                    <li
                      key={a.mgLocationId}
                      className="flex items-center gap-2 border-b border-sasp-navy-light pb-1"
                    >
                      <span className="flex-1 truncate font-mono">
                        ⚓ {mg?.title}
                      </span>
                      <span className="font-mono text-[10px] text-sasp-ink-dim">
                        x={a.ourCoord.x.toFixed(3)} y={a.ourCoord.y.toFixed(3)}
                      </span>
                      {r && (
                        <span
                          className={[
                            'font-mono text-[10px]',
                            r.distance > 0.02
                              ? 'text-sasp-red'
                              : r.distance > 0.01
                                ? 'text-sasp-tan'
                                : 'text-emerald-400',
                          ].join(' ')}
                          title={`fit residual: dx=${r.dx.toFixed(4)} dy=${r.dy.toFixed(4)}`}
                        >
                          Δ {r.distance.toFixed(4)}
                        </span>
                      )}
                      {loo && (
                        <span
                          className={[
                            'font-mono text-[10px]',
                            loo.distance > 0.04
                              ? 'text-sasp-red'
                              : loo.distance > 0.02
                                ? 'text-sasp-tan'
                                : 'text-emerald-400',
                          ].join(' ')}
                          title={`leave-one-out: kotva by byla predikována na (${loo.predicted.x.toFixed(3)}, ${loo.predicted.y.toFixed(3)}) místo (${loo.actual.x.toFixed(3)}, ${loo.actual.y.toFixed(3)})`}
                        >
                          LOO {loo.distance.toFixed(4)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPendingMgId(a.mgLocationId)}
                        className="text-sasp-tan hover:underline"
                      >
                        re-pick
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAnchor(a.mgLocationId)}
                        className="text-sasp-red hover:underline"
                      >
                        smazat
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {transform ? (
            <details className="card p-3 text-xs">
              <summary className="cursor-pointer text-sasp-tan">
                {transform.kind === 'tps'
                  ? 'TPS interpolation'
                  : transform.kind === 'affine6'
                    ? '6-param affine'
                    : '4-param affine'}{' '}
                — {anchors.length} kotev, max fit residual{' '}
                {residuals.length
                  ? Math.max(...residuals.map((r) => r.distance)).toFixed(4)
                  : '—'}
                {looResiduals
                  ? `, max LOO ${Math.max(...looResiduals.map((r) => r.distance)).toFixed(4)}`
                  : ''}
              </summary>
              <pre className="mt-2 font-mono">
                {transform.kind === 'tps'
                  ? `TPS s ${transform.t.controlPoints.length} kontrolními body — interpoluje exaktně, ne jako lineární vzorec.`
                  : transform.kind === 'affine6'
                    ? `x_new = ${transform.t.m00.toFixed(6)} * lng + ${transform.t.m01.toFixed(6)} * lat + ${transform.t.m02.toFixed(6)}\n` +
                      `y_new = ${transform.t.m10.toFixed(6)} * lng + ${transform.t.m11.toFixed(6)} * lat + ${transform.t.m12.toFixed(6)}`
                    : `x_new = ${transform.t.ax.toFixed(6)} * lng + ${transform.t.bx.toFixed(6)}\n` +
                      `y_new = ${transform.t.ay.toFixed(6)} * lat + ${transform.t.by.toFixed(6)}`}
              </pre>
            </details>
          ) : (
            <p className="text-xs text-sasp-ink-dim italic">
              Přidej alespoň 2 kotvy pro odhad transformace.
            </p>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setAnchors(buildDefaultAnchors())}
              title="Vrátí 6 kalibrovaných kotev z anchorsCalibration.ts"
            >
              Reset na defaultní kotvy
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setAnchors([])}
              title="Vyprázdní seznam kotev"
            >
              Smazat všechny
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSelectedForImport(new Set())}
            >
              Reset výběru
            </button>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={previewAll}
                onChange={(e) => setPreviewAll(e.target.checked)}
                className="accent-sasp-tan"
                disabled={!transform}
              />
              Preview všech {MG_LOCATIONS.length} MG na mapě
            </label>
            <button
              type="button"
              className="btn-primary"
              disabled={!tsOutput}
              onClick={handleCopy}
            >
              {copied ? '✓ Zkopírováno' : `Zkopírovat TS (${selectedForImport.size})`}
            </button>
          </div>

          {tsOutput && (
            <details className="card p-4" open>
              <summary className="cursor-pointer text-sm font-medium text-sasp-tan">
                Výstup — vlož do <code>pois.ts</code>
              </summary>
              <textarea
                className="w-full mt-3 bg-sasp-bg/60 border border-sasp-navy-light rounded p-2 text-xs font-mono text-sasp-ink"
                rows={15}
                readOnly
                value={tsOutput}
                data-testid="anchor-output"
                onFocus={(e) => e.currentTarget.select()}
              />
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

function AnchorMarker({
  anchor,
  onMove,
}: {
  anchor: AnchorPair;
  onMove: (id: number, pos: Vec2) => void;
}) {
  const mg = MG_LOCATION_BY_ID.get(anchor.mgLocationId);
  const icon = divIcon({
    html: '<div class="geo-marker geo-marker--asked"><span class="geo-marker__dot"></span></div>',
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
  return (
    <Marker
      position={toLatLng(anchor.ourCoord, TILE_META)}
      icon={icon}
      draggable
      eventHandlers={{
        dragend: (e: LeafletEvent) => {
          const m = e.target as { getLatLng: () => { lat: number; lng: number } };
          onMove(anchor.mgLocationId, fromLatLng(m.getLatLng(), TILE_META));
        },
      }}
    >
      <Tooltip permanent direction="right" offset={[10, 0]}>
        ⚓ {mg?.title}
      </Tooltip>
    </Marker>
  );
}

function PreviewMarker({ title, position }: { title: string; position: Vec2 }) {
  const icon = divIcon({
    html: '<div class="geo-marker geo-marker--target" style="width: 12px; height: 12px;"><span class="geo-marker__dot" style="width: 6px; height: 6px;"></span></div>',
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
  return (
    <Marker position={toLatLng(position, TILE_META)} icon={icon}>
      <Tooltip direction="right" offset={[8, 0]} opacity={0.85}>
        {title}
      </Tooltip>
    </Marker>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mgCategoryToOurs(catTitle: string | null): string {
  switch (catTitle) {
    case 'Police Station':
      return 'pd';
    case 'Fire Station':
      return 'fire';
    case 'Hospital':
      return 'ems';
    case 'Ammu-Nation':
      return 'ammu';
    default:
      return 'landmark';
  }
}

export type { MapGenieLocation };
