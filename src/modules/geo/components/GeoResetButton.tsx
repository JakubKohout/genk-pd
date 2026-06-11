import { useState } from 'react';
import { useGeoBlindProgress, useGeoNameProgress } from '../state/useGeoProgress';
import { trackProgressReset } from '@/shared/analytics';

interface Props {
  mode: 'blind' | 'name';
}

export function GeoResetButton({ mode }: Props) {
  const blind = useGeoBlindProgress();
  const name = useGeoNameProgress();
  const reset = mode === 'blind' ? blind.reset : name.reset;
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div
        role="alertdialog"
        aria-label="Potvrzení resetu"
        className="rounded border border-sasp-red/60 bg-sasp-red/10 p-3 text-sm"
        data-testid={`geo-${mode}-reset-confirm`}
      >
        <p className="mb-2 text-sasp-ink">
          Opravdu vyresetovat veškerý progress v tomto režimu? Tato akce je nevratná.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setConfirming(false)}
            data-testid={`geo-${mode}-reset-cancel`}
          >
            Zrušit
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              trackProgressReset({ module: mode === 'blind' ? 'geo-blind' : 'geo-name' });
              reset();
              setConfirming(false);
            }}
            data-testid={`geo-${mode}-reset-confirm-yes`}
          >
            Resetovat
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="btn-danger"
      onClick={() => setConfirming(true)}
      data-testid={`geo-${mode}-reset-button`}
    >
      Vyresetovat progress
    </button>
  );
}
