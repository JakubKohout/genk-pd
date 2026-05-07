import { describe, expect, it } from 'vitest';
import { PENAL_PARAGRAPHS } from '@/modules/laws/penal/data/paragraphs';
import { RECALL_PARAGRAPHS } from '@/modules/laws/penal/data/recallPool';
import { matchParagraph } from '@/modules/laws/penal/logic/matchParagraph';

describe('recall pool round-trip audit', () => {
  for (const p of RECALL_PARAGRAPHS) {
    it(`${p.number} ${p.title}: title and aliases match back to ${p.id}`, () => {
      const byTitle = matchParagraph(p.title, PENAL_PARAGRAPHS);
      expect(byTitle?.id, `title "${p.title}"`).toBe(p.id);
      for (const a of p.aliases) {
        const m = matchParagraph(a, PENAL_PARAGRAPHS);
        expect(m?.id, `alias "${a}"`).toBe(p.id);
      }
    });
  }
});
