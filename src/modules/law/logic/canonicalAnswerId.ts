/**
 * Normalize free-text paragraf ID input to canonical form '<num><sub?>'.
 *
 *   '25b'        → '25b'
 *   '§25b'       → '25b'
 *   '§25 b'      → '25b'
 *   '§ 25 b'     → '25b'
 *   '25B'        → '25b'
 *   '25'         → '25'
 *   '§27'        → '27'
 *   ''           → null
 *   'abc'        → null
 *   '25z'        → null  (sub must be a-e)
 */
export function canonicalAnswerId(input: string): string | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.replace(/§/g, '').toLowerCase().replace(/\s+/g, '');
  if (!cleaned) return null;
  const match = /^(\d+)([a-e])?$/.exec(cleaned);
  if (!match) return null;
  return match[1] + (match[2] ?? '');
}
