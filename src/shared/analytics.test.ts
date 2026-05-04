import { beforeEach, describe, expect, it, vi } from 'vitest';
import mixpanel from 'mixpanel-browser';
import {
  __resetForTests,
  initAnalytics,
  trackCodeAnswered,
  trackCodesCompleted,
  trackLawAnswered,
  trackPageview,
  trackProgressReset,
} from './analytics';

const mp = vi.mocked(mixpanel);

describe('analytics', () => {
  beforeEach(() => {
    __resetForTests();
    mp.init.mockClear();
    mp.track.mockClear();
    mp.track_pageview.mockClear();
  });

  it('initAnalytics calls mixpanel.init with the project token', () => {
    initAnalytics();
    expect(mp.init).toHaveBeenCalledTimes(1);
    expect(mp.init).toHaveBeenCalledWith(
      '67f19825269daf33fc9e5da1c85f568c',
      expect.objectContaining({
        api_host: 'https://api-eu.mixpanel.com',
        track_pageview: false,
        persistence: 'localStorage',
      }),
    );
  });

  it('initAnalytics is idempotent', () => {
    initAnalytics();
    initAnalytics();
    expect(mp.init).toHaveBeenCalledTimes(1);
  });

  it('trackPageview is a silent no-op before initAnalytics', () => {
    expect(() => trackPageview('/codes/write')).not.toThrow();
    expect(mp.track_pageview).not.toHaveBeenCalled();
  });

  it('trackPageview constructs a hash-prefixed URL', () => {
    initAnalytics();
    trackPageview('/codes/write');
    expect(mp.track_pageview).toHaveBeenCalledWith({
      url: window.location.origin + '/#/codes/write',
    });
  });

  it('trackCodeAnswered forwards props to mixpanel.track', () => {
    initAnalytics();
    trackCodeAnswered({ mode: 'write', success: true, code_id: '10-44' });
    expect(mp.track).toHaveBeenCalledWith('code_answered', {
      mode: 'write',
      success: true,
      code_id: '10-44',
    });
  });

  it('trackLawAnswered forwards props to mixpanel.track', () => {
    initAnalytics();
    trackLawAnswered({ success: false, question_id: 'lea.16.B' });
    expect(mp.track).toHaveBeenCalledWith('law_answered', {
      success: false,
      question_id: 'lea.16.B',
    });
  });

  it('trackProgressReset forwards module to mixpanel.track', () => {
    initAnalytics();
    trackProgressReset({ module: 'lea' });
    expect(mp.track).toHaveBeenCalledWith('progress_reset', { module: 'lea' });
  });

  it('trackCodesCompleted forwards scope to mixpanel.track', () => {
    initAnalytics();
    trackCodesCompleted({ scope: 'partial' });
    expect(mp.track).toHaveBeenCalledWith('codes_completed', { scope: 'partial' });
  });

  it('all track* are silent no-ops before initAnalytics', () => {
    expect(() => {
      trackCodeAnswered({ mode: 'choose', success: false, code_id: '10-99' });
      trackLawAnswered({ success: true, question_id: 'lea.7' });
      trackProgressReset({ module: 'codes' });
      trackCodesCompleted({ scope: 'all' });
    }).not.toThrow();
    expect(mp.track).not.toHaveBeenCalled();
  });
});
