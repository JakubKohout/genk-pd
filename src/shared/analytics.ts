/**
 * GoatCounter integration. No-op unless VITE_GOATCOUNTER_URL is set at build time —
 * dev/test builds therefore make zero network calls and need no stubbing.
 *
 * GoatCounter treats events as pageviews with `event:true`; the `path` field becomes
 * the event name, so we use short kebab-case identifiers (e.g. `mode-write-correct`).
 */

type GoatCounterPayload = {
  path?: string;
  title?: string;
  event?: boolean;
  referrer?: string;
};

declare global {
  interface Window {
    goatcounter?: {
      count?: (payload: GoatCounterPayload) => void;
    };
  }
}

const SCRIPT_SRC = 'https://gc.zgo.at/count.js';

export function initAnalytics(): void {
  if (typeof document === 'undefined') return;
  const url = import.meta.env.VITE_GOATCOUNTER_URL;
  if (!url) return;
  if (document.querySelector('script[data-goatcounter]')) return;

  const s = document.createElement('script');
  s.async = true;
  s.src = SCRIPT_SRC;
  s.dataset.goatcounter = url;
  s.dataset.goatcounterSettings = JSON.stringify({ no_onload: true });
  document.head.appendChild(s);
}

export function trackPageview(path: string): void {
  if (typeof window === 'undefined') return;
  window.goatcounter?.count?.({ path });
}

export function trackEvent(name: string, title?: string): void {
  if (typeof window === 'undefined') return;
  window.goatcounter?.count?.({ event: true, path: name, title });
}
