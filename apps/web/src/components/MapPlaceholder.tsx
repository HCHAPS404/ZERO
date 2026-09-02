import { useCommandCenterStore } from "../state/store.js";

/**
 * Structural placeholder for the operational map. earthquake-alpha's road
 * graph is a 5x5 grid -- this renders that topology abstractly (not
 * geo-accurate) so blocked/degraded roads and the focused entity are still
 * visible at a glance. A real MapLibre integration is scoped separately in
 * docs/tasks/TASK-MAP-MAPLIBRE.md so it doesn't block this backbone.
 */
export function MapPlaceholder() {
  const focusEntityId = useCommandCenterStore((s) => s.focusEntityId);
  const picture = useCommandCenterStore((s) => s.picture);

  const cells = Array.from({ length: 25 }, (_, i) => i);

  return (
    <section className="map-placeholder">
      <h2 className="panel-title">Operational Map (placeholder)</h2>
      <div className="map-grid">
        {cells.map((i) => (
          <div key={i} className="map-grid__cell" />
        ))}
      </div>
      <div className="map-placeholder__legend">
        <span>
          <span className="legend-dot legend-dot--blocked" /> blocked road ({picture?.blockedRoadCount ?? 0})
        </span>
        <span>
          <span className="legend-dot legend-dot--degraded" /> degraded road ({picture?.degradedRoadCount ?? 0})
        </span>
        <span>
          <span className="legend-dot legend-dot--hazard" /> hazard zone ({picture?.hazardCount ?? 0})
        </span>
      </div>
      {focusEntityId && <div className="map-placeholder__focus">Agent focus: {focusEntityId}</div>}
    </section>
  );
}
