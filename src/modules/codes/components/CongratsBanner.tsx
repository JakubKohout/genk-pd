import { useEffect } from 'react';
import { ResetButton } from './ResetButton';
import { useSettings } from '../state/useSettings';
import { trackEvent } from '@/shared/analytics';

export function CongratsBanner() {
  const { importanceFilter, setImportance } = useSettings();
  const allOn =
    importanceFilter.mandatory && importanceFilter.rare && importanceFilter.unnecessary;

  useEffect(() => {
    trackEvent('complete', allOn ? 'all' : 'partial');
  }, [allOn]);

  return (
    <div
      data-testid="congrats-banner"
      className="card animate-gold-pulse border-sasp-gold p-8 text-center"
    >
      <h2 className="mb-3 font-serif text-3xl text-sasp-gold">Gratulujeme!</h2>
      <p className="mx-auto mb-6 max-w-md text-sasp-ink-dim">
        Všechny kódy v aktuálním filtru zvládáte na +3.
        {allOn ? ' Trénink je u konce — pokud chcete pokračovat, vyresetujte progres.' : ' Můžete rozšířit filtr o další kategorie nebo vyresetovat progres.'}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {!importanceFilter.rare && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setImportance('rare', true)}
          >
            + Zařadit „Zřídka"
          </button>
        )}
        {!importanceFilter.unnecessary && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setImportance('unnecessary', true)}
          >
            + Zařadit „Nepotřebný"
          </button>
        )}
        <ResetButton />
      </div>
    </div>
  );
}
