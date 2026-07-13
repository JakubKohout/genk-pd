import { describe, expect, it } from 'vitest';
import { LAW_SOURCES, LAW_THEMES } from './types';

describe('law taxonomy', () => {
  it('has 3 sources', () => {
    expect(LAW_SOURCES).toEqual(['lea', 'penal', 'sasp']);
  });
  it('has 9 themes', () => {
    expect(LAW_THEMES).toHaveLength(9);
    expect(LAW_THEMES).toContain('paragrafy');
    expect(LAW_THEMES).toContain('zasah');
  });
});
