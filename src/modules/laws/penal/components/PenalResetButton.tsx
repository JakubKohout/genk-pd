import { useState } from 'react';
import { trackProgressReset } from '@/shared/analytics';

interface Props {
  module: 'penal-scenario' | 'penal-recall';
  testIdPrefix: string;
  onReset: () => void;
}

export function PenalResetButton({ module, testIdPrefix, onReset }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div
        role="alertdialog"
        aria-label="Potvrzení resetu"
        className="rounded border border-sasp-red/60 bg-sasp-red/10 p-3 text-sm"
        data-testid={`${testIdPrefix}-reset-confirm`}
      >
        <p className="mb-2 text-sasp-ink">
          Opravdu vyresetovat veškerý progress této sekce? Tato akce je nevratná.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setConfirming(false)}
            data-testid={`${testIdPrefix}-reset-cancel`}
          >
            Zrušit
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              trackProgressReset({ module });
              onReset();
              setConfirming(false);
            }}
            data-testid={`${testIdPrefix}-reset-confirm-yes`}
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
      data-testid={`${testIdPrefix}-reset-button`}
    >
      Vyresetovat progress
    </button>
  );
}
