import mixpanel from 'mixpanel-browser';

const TOKEN = '67f19825269daf33fc9e5da1c85f568c';

let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  if (window.__GENK_E2E__) return;
  mixpanel.init(TOKEN, {
    api_host: 'https://api-eu.mixpanel.com',
    debug: import.meta.env.DEV,
    track_pageview: false,
    persistence: 'localStorage',
    ignore_dnt: true,
  });
  // Simplified Identity Merge drops people calls made on a $device: distinct_id;
  // self-identifying with the existing anonymous id promotes it to a stable
  // identity so people.set_once actually creates a profile in the Users tab.
  mixpanel.identify(mixpanel.get_distinct_id());
  mixpanel.people.set_once({ $created: new Date().toISOString() });
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

export function trackProgressReset(props: {
  module: 'codes' | 'lea' | 'penal-scenario' | 'penal-recall' | 'geo-blind' | 'geo-name';
}): void {
  if (!initialized) return;
  mixpanel.track('progress_reset', props);
}

export function trackCodesCompleted(props: { scope: 'all' | 'partial' }): void {
  if (!initialized) return;
  mixpanel.track('codes_completed', props);
}

export function trackQuestionSkipped(props: {
  module: 'codes' | 'lea' | 'penal-scenario' | 'penal-recall' | 'geo-blind' | 'geo-name';
  question_id: string;
}): void {
  if (!initialized) return;
  mixpanel.track('question_skipped', props);
}

export function trackPenalAnswered(props: {
  mode: 'scenario' | 'recall';
  success: boolean;
  question_id: string;
}): void {
  if (!initialized) return;
  mixpanel.track('penal_answered', props);
}

export function trackPenalCompleted(props: { mode: 'scenario' | 'recall' }): void {
  if (!initialized) return;
  mixpanel.track('penal_completed', props);
}

export function trackGeoAnswered(props: {
  mode: 'blind' | 'name';
  success: boolean;
  poi_id: string;
}): void {
  if (!initialized) return;
  mixpanel.track('geo_answered', props);
}

export function trackGeoCompleted(props: { mode: 'blind' | 'name' }): void {
  if (!initialized) return;
  mixpanel.track('geo_completed', props);
}

// Lets unit tests reset the module-level guard between tests so each test
// starts uninitialized.
export function __resetForTests(): void {
  initialized = false;
}
