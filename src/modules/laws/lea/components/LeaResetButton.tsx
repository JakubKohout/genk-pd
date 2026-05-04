import { useState } from 'react';
import { useLeaProgress } from '../state/useLeaProgress';
import { trackProgressReset } from '@/shared/analytics';

export function LeaResetButton() {
  const { reset } = useLeaProgress();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div
        role="alertdialog"
        aria-label="Potvrzení resetu"
        className="rounded border border-sasp-red/60 bg-sasp-red/10 p-3 text-sm"
        data-testid="lea-reset-confirm"
      >
        <p className="mb-2 text-sasp-ink">
          Opravdu vyresetovat veškerý progress? Tato akce je nevratná.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setConfirming(false)}
            data-testid="lea-reset-cancel"
          >
            Zrušit
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              trackProgressReset({ module: 'lea' });
              reset();
              setConfirming(false);
            }}
            data-testid="lea-reset-confirm-yes"
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
      data-testid="lea-reset-button"
    >
      Vyresetovat progress
    </button>
  );
}
