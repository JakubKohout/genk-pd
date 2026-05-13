import { useEffect, useState } from 'react';
import { POIS } from '../data/pois';
import { isGeoComplete, pickNextPoi } from '../state/selection';
import { useGeoNameProgress } from '../state/useGeoProgress';
import { useGeoSettings } from '../state/useGeoSettings';
import { useMediaQuery } from '@/shared/useMediaQuery';
import { GeoMap } from './GeoMap';
import { GeoMarker } from './GeoMarker';
import { GeoStreet } from './GeoStreet';
import { GeoSidePanel } from './GeoSidePanel';
import { GeoMobilePanel } from './GeoMobilePanel';
import { GeoResetButton } from './GeoResetButton';
import { GeoAnswerInput } from './GeoAnswerInput';
import type { POI } from '../data/types';
import { trackGeoAnswered, trackGeoCompleted, trackQuestionSkipped } from '@/shared/analytics';

type Phase = 'answering' | 'revealed';

export function GeoNamePage() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const name = useGeoNameProgress();
  const { categoryFilter, setCategory } = useGeoSettings();

  const [current, setCurrent] = useState<POI | null>(null);
  const [phase, setPhase] = useState<Phase>('answering');
  const [hardMode, setHardMode] = useState(false);
  const [feedback, setFeedback] = useState<{ matched: POI | null; raw: string } | null>(null);
  const [completionTracked, setCompletionTracked] = useState(false);

  useEffect(() => {
    if (current !== null) return;
    if (phase !== 'answering') return;
    const next = pickNextPoi({ progress: name.progress, turn: name.turn }, POIS, categoryFilter);
    setCurrent(next);
  }, [current, phase, name.progress, name.turn, categoryFilter]);

  const isComplete = isGeoComplete(
    { progress: name.progress, turn: name.turn },
    POIS,
    categoryFilter,
  );

  useEffect(() => {
    if (isComplete && !current && !completionTracked) {
      trackGeoCompleted({ mode: 'name' });
      setCompletionTracked(true);
    }
    if (!isComplete && completionTracked) {
      setCompletionTracked(false);
    }
  }, [isComplete, current, completionTracked]);

  const masteredPois = POIS.filter(
    (p) => categoryFilter[p.category] && (name.progress[p.id]?.score ?? 0) >= 2,
  );

  if (isComplete && !current) {
    return (
      <div className="geo-page">
        <div className="space-y-4">
          <div className="card congrats p-6 sm:p-8" data-testid="geo-name-congrats">
            <h2>Hotovo!</h2>
            <p>Pojmenoval jsi všechno na mapě. Žádné neznámé místo neexistuje.</p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                name.reset();
                setCompletionTracked(false);
              }}
            >
              Začít znovu
            </button>
          </div>
          <div className="flex justify-end">
            <GeoResetButton mode="name" />
          </div>
        </div>
        {isDesktop ? (
          <GeoSidePanel
            mode="name"
            pois={POIS}
            progress={name.progress}
            filter={categoryFilter}
            onSetCategory={setCategory}
          />
        ) : (
          <GeoMobilePanel
            mode="name"
            pois={POIS}
            progress={name.progress}
            filter={categoryFilter}
            onSetCategory={setCategory}
          />
        )}
      </div>
    );
  }

  if (!current) return null;

  const handleSubmit = (raw: string, matched: POI | null) => {
    setFeedback({ matched, raw });
    setPhase('revealed');
    const success = matched?.id === current.id;
    name.recordSubmit(current.id, { perfect: success });
    trackGeoAnswered({ mode: 'name', success, poi_id: current.id });
  };

  const handleNext = () => {
    setFeedback(null);
    setPhase('answering');
    setCurrent(null);
  };

  const handleSkip = () => {
    if (!current) return;
    name.recordSkip(current.id);
    trackQuestionSkipped({ module: 'geo-name', question_id: current.id });
    setFeedback(null);
    setPhase('answering');
    setCurrent(null);
  };

  const success = feedback?.matched?.id === current.id;

  return (
    <div className="geo-page">
      <div className="space-y-4">
        <div className="geo-prompt" data-testid="geo-name-prompt">
          <span className="geo-prompt__name">Co je tady?</span>
          <div className="geo-prompt__description">
            Marker na mapě bliká. Napiš název dole.
          </div>
        </div>

        <GeoMap>
          {masteredPois
            .filter((p) => p.id !== current.id)
            .map((p) =>
              p.geometry === 'point' ? (
                <GeoMarker
                  key={p.id}
                  position={p.position}
                  variant="mastered"
                  label={p.name}
                  poiId={p.id}
                />
              ) : (
                <GeoStreet key={p.id} path={p.path} variant="mastered" />
              ),
            )}
          {/* Asked POI: shown without label until reveal */}
          {current.geometry === 'point' ? (
            <GeoMarker
              position={current.position}
              variant={phase === 'revealed' ? (success ? 'target' : 'wrongClick') : 'asked'}
              label={phase === 'revealed' ? current.name : undefined}
              poiId={current.id}
            />
          ) : (
            <GeoStreet
              path={current.path}
              variant={phase === 'revealed' ? (success ? 'target' : 'wrongClick') : 'asked'}
            />
          )}
        </GeoMap>

        {phase === 'answering' ? (
          <GeoAnswerInput
            pool={POIS}
            target={current}
            disabled={false}
            disableSuggestions={hardMode}
            onSubmit={handleSubmit}
          />
        ) : (
          <div
            className={`geo-feedback ${success ? 'geo-feedback--hit' : 'geo-feedback--miss'}`}
            data-testid="geo-name-feedback"
            data-hit={success ? 'true' : 'false'}
          >
            {success ? (
              <>
                <strong>Správně:</strong> {current.name} —{' '}
                <span className="text-sasp-ink-dim">{current.description}</span>
              </>
            ) : (
              <>
                <strong>Tohle je {current.name}.</strong>{' '}
                <span className="text-sasp-ink-dim">{current.description}</span>
              </>
            )}
          </div>
        )}

        <div className="submit-footer submit-footer--split">
          <label className="flex items-center gap-2 text-xs text-sasp-ink-dim">
            <input
              type="checkbox"
              checked={hardMode}
              onChange={(e) => setHardMode(e.target.checked)}
              data-testid="geo-hard-mode"
              className="accent-sasp-tan"
              disabled={phase !== 'answering'}
            />
            Hard mode (bez nápovědy)
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSkip}
              data-testid="geo-name-skip"
            >
              Přeskočit otázku
            </button>
            {phase === 'revealed' && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleNext}
                data-testid="geo-name-next"
              >
                Další otázka
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <GeoResetButton mode="name" />
        </div>
      </div>

      {isDesktop ? (
        <GeoSidePanel
          mode="name"
          pois={POIS}
          progress={name.progress}
          filter={categoryFilter}
          onSetCategory={setCategory}
          currentId={current.id}
        />
      ) : (
        <GeoMobilePanel
          mode="name"
          pois={POIS}
          progress={name.progress}
          filter={categoryFilter}
          onSetCategory={setCategory}
          currentId={current.id}
        />
      )}
    </div>
  );
}
