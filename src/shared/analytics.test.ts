import { beforeEach, describe, expect, it, vi } from 'vitest';
import mixpanel from 'mixpanel-browser';
import {
  __resetForTests,
  initAnalytics,
  trackCodeAnswered,
  trackCodesCompleted,
  trackGeoAnswered,
  trackGeoCompleted,
  trackLawAnswered,
  trackPageview,
  trackProgressReset,
  trackQuestionSkipped,
} from './analytics';
// Type-level check: 'law' must be accepted by the union-typed module params
// (These are compile-time assertions; runtime tests follow below.)

const mp = vi.mocked(mixpanel);

describe('analytics', () => {
  beforeEach(() => {
    __resetForTests();
    mp.init.mockClear();
    mp.track.mockClear();
    mp.track_pageview.mockClear();
    mp.identify.mockClear();
    vi.mocked(mp.people.set_once).mockClear();
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

  it('initAnalytics is a no-op when window.__GENK_E2E__ is set', () => {
    window.__GENK_E2E__ = true;
    try {
      initAnalytics();
      expect(mp.init).not.toHaveBeenCalled();
      expect(mp.identify).not.toHaveBeenCalled();
      expect(mp.people.set_once).not.toHaveBeenCalled();
    } finally {
      delete window.__GENK_E2E__;
    }
  });

  it('initAnalytics self-identifies with the device distinct_id before seeding profile', () => {
    initAnalytics();
    expect(mp.identify).toHaveBeenCalledWith('$device:test-uuid');
    expect(mp.people.set_once).toHaveBeenCalledWith(
      expect.objectContaining({ $created: expect.any(String) }),
    );
    expect(mp.identify.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(mp.people.set_once).mock.invocationCallOrder[0]!,
    );
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
    trackLawAnswered({ source: 'lea', kind: 'choice', success: false, question_id: 'lea.16.B' });
    expect(mp.track).toHaveBeenCalledWith('law_answered', {
      source: 'lea',
      kind: 'choice',
      success: false,
      question_id: 'lea.16.B',
    });
  });

  it('trackLawAnswered accepts all source/kind combinations', () => {
    initAnalytics();
    trackLawAnswered({ source: 'sasp', kind: 'enumeration', success: true, question_id: 'sasp.x' });
    expect(mp.track).toHaveBeenCalledWith('law_answered', {
      source: 'sasp',
      kind: 'enumeration',
      success: true,
      question_id: 'sasp.x',
    });
  });

  it('trackQuestionSkipped accepts law module', () => {
    initAnalytics();
    trackQuestionSkipped({ module: 'law', question_id: 'law.q1' });
    expect(mp.track).toHaveBeenCalledWith('question_skipped', {
      module: 'law',
      question_id: 'law.q1',
    });
  });

  it('trackProgressReset accepts law module', () => {
    initAnalytics();
    trackProgressReset({ module: 'law' });
    expect(mp.track).toHaveBeenCalledWith('progress_reset', { module: 'law' });
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

  it('trackGeoAnswered forwards props to mixpanel.track', () => {
    initAnalytics();
    trackGeoAnswered({ mode: 'blind', success: true, poi_id: 'landmark.vinewood-sign' });
    expect(mp.track).toHaveBeenCalledWith('geo_answered', {
      mode: 'blind',
      success: true,
      poi_id: 'landmark.vinewood-sign',
    });
  });

  it('trackGeoCompleted forwards mode to mixpanel.track', () => {
    initAnalytics();
    trackGeoCompleted({ mode: 'name' });
    expect(mp.track).toHaveBeenCalledWith('geo_completed', { mode: 'name' });
  });

  it('trackQuestionSkipped accepts geo modules', () => {
    initAnalytics();
    trackQuestionSkipped({ module: 'geo-blind', question_id: 'landmark.x' });
    expect(mp.track).toHaveBeenCalledWith('question_skipped', {
      module: 'geo-blind',
      question_id: 'landmark.x',
    });
  });

  it('trackProgressReset accepts geo modules', () => {
    initAnalytics();
    trackProgressReset({ module: 'geo-name' });
    expect(mp.track).toHaveBeenCalledWith('progress_reset', { module: 'geo-name' });
  });

  it('all track* are silent no-ops before initAnalytics', () => {
    expect(() => {
      trackCodeAnswered({ mode: 'choose', success: false, code_id: '10-99' });
      trackLawAnswered({ source: 'lea', kind: 'enumeration', success: true, question_id: 'lea.7' });
      trackProgressReset({ module: 'codes' });
      trackCodesCompleted({ scope: 'all' });
      trackGeoAnswered({ mode: 'blind', success: true, poi_id: 'x' });
      trackGeoCompleted({ mode: 'name' });
    }).not.toThrow();
    expect(mp.track).not.toHaveBeenCalled();
  });
});
