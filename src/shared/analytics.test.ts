import { afterEach, describe, expect, it, vi } from 'vitest';
import { initAnalytics, trackEvent, trackPageview } from './analytics';

describe('analytics', () => {
  afterEach(() => {
    delete (window as { goatcounter?: unknown }).goatcounter;
    document.querySelectorAll('script[data-goatcounter]').forEach((n) => n.remove());
    vi.unstubAllEnvs();
  });

  it('trackPageview is a silent no-op without window.goatcounter', () => {
    expect(() => trackPageview('/foo')).not.toThrow();
  });

  it('trackEvent is a silent no-op without window.goatcounter', () => {
    expect(() => trackEvent('mode-write-correct', '10-44')).not.toThrow();
  });

  it('trackPageview forwards path to goatcounter.count when present', () => {
    const count = vi.fn();
    (window as { goatcounter?: unknown }).goatcounter = { count };
    trackPageview('/codes/write');
    expect(count).toHaveBeenCalledWith({ path: '/codes/write' });
  });

  it('trackEvent forwards event:true with path/title to goatcounter.count', () => {
    const count = vi.fn();
    (window as { goatcounter?: unknown }).goatcounter = { count };
    trackEvent('reset', 'mandatory');
    expect(count).toHaveBeenCalledWith({ event: true, path: 'reset', title: 'mandatory' });
  });

  it('initAnalytics injects no script when env var is empty', () => {
    vi.stubEnv('VITE_GOATCOUNTER_URL', '');
    initAnalytics();
    expect(document.querySelector('script[data-goatcounter]')).toBeNull();
  });

  it('initAnalytics injects script tag when env var is set', () => {
    vi.stubEnv('VITE_GOATCOUNTER_URL', 'https://example.goatcounter.com/count');
    initAnalytics();
    const s = document.querySelector('script[data-goatcounter]') as HTMLScriptElement | null;
    expect(s).not.toBeNull();
    expect(s?.dataset.goatcounter).toBe('https://example.goatcounter.com/count');
    expect(s?.src).toContain('gc.zgo.at/count.js');
    expect(s?.dataset.goatcounterSettings).toContain('"no_onload":true');
  });

  it('initAnalytics is idempotent', () => {
    vi.stubEnv('VITE_GOATCOUNTER_URL', 'https://example.goatcounter.com/count');
    initAnalytics();
    initAnalytics();
    expect(document.querySelectorAll('script[data-goatcounter]').length).toBe(1);
  });
});
