export function matchChoice(selected: number[], correct: number[]): boolean {
  if (selected.length !== correct.length) return false;
  const a = new Set(selected);
  if (a.size !== correct.length) return false;
  return correct.every((c) => a.has(c));
}
