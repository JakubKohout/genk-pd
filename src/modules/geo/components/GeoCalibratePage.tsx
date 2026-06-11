import { DragDropTab } from './calibrate/DragDropTab';

export function GeoCalibratePage() {
  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl text-sasp-tan">Editor POI</h1>
        <p className="text-sm text-sasp-ink-dim">
          Interní Drag &amp; drop editor pozic — markery a nody polyline jsou
          tažitelné, výsledek se exportuje jako TS literál a vkládá zpět do
          `pois.ts` / `streets.generated.ts`.
        </p>
      </header>

      <DragDropTab />
    </section>
  );
}
