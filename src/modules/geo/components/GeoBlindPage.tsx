import { useEffect, useState } from 'react';
import { POIS } from '../data/pois';
import { evaluateClick } from '../logic/hitTest';
import { isGeoComplete, pickNextPoi } from '../state/selection';
import { useGeoBlindProgress } from '../state/useGeoProgress';
import { useGeoDebugMode } from '../state/useGeoDebugMode';
import { useGeoSettings } from '../state/useGeoSettings';
import { useMediaQuery } from '@/shared/useMediaQuery';
import { GeoMap } from './GeoMap';
import { GeoMarker } from './GeoMarker';
import { GeoPolyline } from './GeoPolyline';
import { GeoSidePanel } from './GeoSidePanel';
import { GeoMobilePanel } from './GeoMobilePanel';
import { GeoResetButton } from './GeoResetButton';
import { GeoDebugOverlay } from './GeoDebugOverlay';
import type { POI, Vec2 } from '../data/types';
import { trackGeoAnswered, trackGeoCompleted, trackQuestionSkipped } from '@/shared/analytics';

type Phase = 'answering' | 'revealed';

const CATEGORY_LABEL: Record<POI['category'], string> = {
  street: 'ULICE',
  highway: 'DÁLNICE',
  city: 'BOD VE MĚSTĚ',
  state: 'BOD VE STÁTĚ',
};

export function GeoBlindPage() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const blind = useGeoBlindProgress();
  const { categoryFilter, setCategory } = useGeoSettings();
  const debug = useGeoDebugMode();

  const [current, setCurrent] = useState<POI | null>(null);
  const [phase, setPhase] = useState<Phase>('answering');
  const [userClick, setUserClick] = useState<Vec2 | null>(null);
  const [hit, setHit] = useState<boolean | null>(null);
  const [completionTracked, setCompletionTracked] = useState(false);

  useEffect(() => {
    if (current !== null) return;
    if (phase !== 'answering') return;
    const next = pickNextPoi({ progress: blind.progress, turn: blind.turn }, POIS, categoryFilter);
    setCurrent(next);
  }, [current, phase, blind.progress, blind.turn, categoryFilter]);

  const isComplete = isGeoComplete(
    { progress: blind.progress, turn: blind.turn },
    POIS,
    categoryFilter,
  );

  useEffect(() => {
    if (isComplete && !current && !completionTracked) {
      trackGeoCompleted({ mode: 'blind' });
      setCompletionTracked(true);
    }
    if (!isComplete && completionTracked) {
      setCompletionTracked(false);
    }
  }, [isComplete, current, completionTracked]);

  const masteredPois = POIS.filter(
    (p) => categoryFilter[p.category] && (blind.progress[p.id]?.score ?? 0) >= 2,
  );

  if (isComplete && !current) {
    return (
      <div className="geo-page">
        <div className="space-y-4">
          <div className="card congrats p-6 sm:p-8" data-testid="geo-blind-congrats">
            <h2>Hotovo!</h2>
            <p>Všechny zájmové body jsi v slepé mapě zvládl. Mapa je tvoje.</p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                blind.reset();
                setCompletionTracked(false);
              }}
            >
              Začít znovu
            </button>
          </div>
          <div className="flex justify-end">
            <GeoResetButton mode="blind" />
          </div>
        </div>
        {isDesktop ? (
          <GeoSidePanel
            mode="blind"
            pois={POIS}
            progress={blind.progress}
            filter={categoryFilter}
            onSetCategory={setCategory}
          />
        ) : (
          <GeoMobilePanel
            mode="blind"
            pois={POIS}
            progress={blind.progress}
            filter={categoryFilter}
            onSetCategory={setCategory}
          />
        )}
      </div>
    );
  }

  if (!current) return null;

  const handleMapClick = (point: Vec2) => {
    if (phase !== 'answering') return;
    const result = evaluateClick(current, point);
    setUserClick(point);
    setHit(result.hit);
    setPhase('revealed');
    blind.recordSubmit(current.id, { perfect: result.hit });
    trackGeoAnswered({ mode: 'blind', success: result.hit, poi_id: current.id });
  };

  const handleNext = () => {
    setUserClick(null);
    setHit(null);
    setPhase('answering');
    setCurrent(null);
  };

  const handleSkip = () => {
    if (!current) return;
    blind.recordSkip(current.id);
    trackQuestionSkipped({ module: 'geo-blind', question_id: current.id });
    setUserClick(null);
    setHit(null);
    setPhase('answering');
    setCurrent(null);
  };

  return (
    <div className="geo-page">
      <div className="space-y-4">
        <div className="geo-prompt" data-testid="geo-blind-prompt">
          <span>Klikni na </span>
          <span className="geo-prompt__name">{current.name}</span>
          <span className="geo-prompt__category">{CATEGORY_LABEL[current.category]}</span>
          <div className="geo-prompt__description">{current.description}</div>
        </div>

        <GeoMap onMapClick={phase === 'answering' ? handleMapClick : undefined}>
          {masteredPois
            .filter((p) => p.id !== current.id)
            .map((p) => {
              if (p.geometry === 'point') {
                return (
                  <GeoMarker
                    key={p.id}
                    position={p.position}
                    variant="mastered"
                    label={p.name}
                    poiId={p.id}
                  />
                );
              }
              return <GeoPolyline key={p.id} path={p.path} variant="mastered" />;
            })}
          {phase === 'revealed' &&
            (current.geometry === 'point' ? (
              <GeoMarker
                position={current.position}
                variant="target"
                label={current.name}
                poiId={current.id}
              />
            ) : (
              <GeoPolyline path={current.path} variant="target" />
            ))}
          {phase === 'revealed' && userClick && hit === false && (
            <GeoMarker position={userClick} variant="wrongClick" />
          )}
          <GeoDebugOverlay enabled={debug} currentPoiId={current.id} />
        </GeoMap>

        {phase === 'revealed' && (
          <div
            className={`geo-feedback ${hit ? 'geo-feedback--hit' : 'geo-feedback--miss'}`}
            data-testid="geo-blind-feedback"
            data-hit={hit ? 'true' : 'false'}
          >
            {hit ? (
              <>
                <strong>Trefa!</strong> {current.name} —{' '}
                <span className="text-sasp-ink-dim">{current.description}</span>
              </>
            ) : (
              <>
                <strong>Mimo.</strong> {current.name} —{' '}
                <span className="text-sasp-ink-dim">{current.description}</span>
              </>
            )}
          </div>
        )}

        <div className="submit-footer submit-footer--end">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleSkip}
            data-testid="geo-blind-skip"
          >
            Přeskočit otázku
          </button>
          {phase === 'revealed' && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleNext}
              data-testid="geo-blind-next"
            >
              Další otázka
            </button>
          )}
        </div>

        <div className="flex justify-end">
          <GeoResetButton mode="blind" />
        </div>
      </div>

      {isDesktop ? (
        <GeoSidePanel
          mode="blind"
          pois={POIS}
          progress={blind.progress}
          filter={categoryFilter}
          onSetCategory={setCategory}
          currentId={current.id}
        />
      ) : (
        <GeoMobilePanel
          mode="blind"
          pois={POIS}
          progress={blind.progress}
          filter={categoryFilter}
          onSetCategory={setCategory}
          currentId={current.id}
        />
      )}
    </div>
  );
}
