import { SCENARIO_ID, useCommandCenterStore } from "../state/store.js";

export function StatusBar() {
  const picture = useCommandCenterStore((s) => s.picture);
  const loading = useCommandCenterStore((s) => s.loading);
  const loadAll = useCommandCenterStore((s) => s.loadAll);

  return (
    <header className="status-bar">
      <div className="status-bar__title">
        <span className="status-bar__badge">ZERO</span>
        <span>{SCENARIO_ID}</span>
        <span className="status-bar__version">world v{picture?.snapshot.version ?? "—"}</span>
      </div>
      <div className="status-bar__stats">
        <Stat label="Incidents" value={picture?.incidentCount} />
        <Stat label="Active" value={picture?.activeIncidentCount} tone="warn" />
        <Stat label="Resources avail." value={picture ? `${picture.availableResourceCount}/${picture.resourceCount}` : undefined} />
        <Stat label="Roads blocked" value={picture?.blockedRoadCount} tone="danger" />
        <Stat label="Roads degraded" value={picture?.degradedRoadCount} tone="warn" />
        <Stat label="Hazards" value={picture?.hazardCount} tone="danger" />
        <Stat label="Unresolved signals" value={picture?.unresolvedSignalCount} />
      </div>
      <button className="status-bar__refresh" onClick={() => loadAll()} disabled={loading}>
        {loading ? "Refreshing…" : "Refresh"}
      </button>
    </header>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string | undefined; tone?: "warn" | "danger" }) {
  return (
    <div className={`stat stat--${tone ?? "default"}`}>
      <span className="stat__value">{value ?? "—"}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}
