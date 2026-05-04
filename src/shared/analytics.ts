import mixpanel from 'mixpanel-browser';

const TOKEN = '67f19825269daf33fc9e5da1c85f568c';

let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  mixpanel.init(TOKEN, {
    debug: import.meta.env.DEV,
    track_pageview: false,
    persistence: 'localStorage',
    ignore_dnt: true,
  });
  initialized = true;
}

export function trackPageview(path: string): void {
  if (!initialized) return;
  mixpanel.track_pageview({ url: window.location.origin + '/#' + path });
}

export function trackCodeAnswered(props: {
  mode: 'write' | 'choose';
  success: boolean;
  code_id: string;
}): void {
  if (!initialized) return;
  mixpanel.track('code_answered', props);
}

export function trackLawAnswered(props: {
  success: boolean;
  question_id: string;
}): void {
  if (!initialized) return;
  mixpanel.track('law_answered', props);
}

export function trackProgressReset(props: { module: 'codes' | 'lea' }): void {
  if (!initialized) return;
  mixpanel.track('progress_reset', props);
}

export function trackCodesCompleted(props: { scope: 'all' | 'partial' }): void {
  if (!initialized) return;
  mixpanel.track('codes_completed', props);
}

// Lets unit tests reset the module-level guard between tests so each test
// starts uninitialized.
export function __resetForTests(): void {
  initialized = false;
}
