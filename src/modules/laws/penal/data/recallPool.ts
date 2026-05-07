import { PENAL_PARAGRAPHS } from './paragraphs';
import { PENAL_SCENARIOS } from './scenarios';

/**
 * Recall pool = jen paragrafy, které se vyskytují v PENAL_SCENARIOS.
 * Vyřazujeme tím obecná ustanovení (§1 Preambule, §2 Působnost, §3 Základy
 * trestní odpovědnosti…) a další, které se v běžné policejní práci nezkouší.
 */
const recallIds = new Set<string>(
  PENAL_SCENARIOS.flatMap((s) => s.expected.map((e) => e.paragraphId)),
);

export const RECALL_PARAGRAPHS = PENAL_PARAGRAPHS.filter((p) => recallIds.has(p.id));
