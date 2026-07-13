import { describe, expect, it } from 'vitest';
import { LAW_THEMES } from './types';

describe('law taxonomy', () => {
  it('has 10 themes', () => {
    expect(LAW_THEMES).toHaveLength(10);
    expect(LAW_THEMES).toContain('paragrafy');
    expect(LAW_THEMES).toContain('zasah');
    expect(LAW_THEMES).toContain('scenky');
  });
});
