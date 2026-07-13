export function ScenarioBox({ text }: { text: string }) {
  return (
    <div
      data-testid="law-scenario"
      className="rounded border-l-4 border-sasp-tan bg-sasp-navy/40 px-4 py-3 text-sm text-sasp-ink"
    >
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-sasp-tan">
        Situace
      </span>
      {text}
    </div>
  );
}
