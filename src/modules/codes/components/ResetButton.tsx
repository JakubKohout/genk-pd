import { useState } from 'react';
import { useCodeProgress } from '../state/useCodeProgress';
import { trackEvent } from '@/shared/analytics';

export function ResetButton() {
  const { reset } = useCodeProgress();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div
        role="alertdialog"
        aria-label="Potvrzení resetu"
        className="rounded border border-sasp-red/60 bg-sasp-red/10 p-3 text-sm"
        data-testid="reset-confirm"
      >
        <p className="mb-2 text-sasp-ink">
          Opravdu vyresetovat veškerý progress? Tato akce je nevratná.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setConfirming(false)}
            data-testid="reset-cancel"
          >
            Zrušit
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              trackEvent('reset');
              reset();
              setConfirming(false);
            }}
            data-testid="reset-confirm-yes"
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
      data-testid="reset-button"
    >
      Resetovat progres
    </button>
  );
}
