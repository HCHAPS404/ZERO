import { useCommandCenterStore } from "../state/store.js";

export function IncidentSignalsSidebar() {
  const picture = useCommandCenterStore((s) => s.picture);
  const setFocusEntity = useCommandCenterStore((s) => s.setFocusEntity);
  const focusEntityId = useCommandCenterStore((s) => s.focusEntityId);

  const incidents = picture?.snapshot.incidents ?? [];

  return (
    <aside className="sidebar">
      <h2 className="panel-title">Incidents</h2>
      <ul className="entity-list">
        {incidents.map(([id, incident]) => (
          <li
            key={id}
            className={`entity-list__item ${focusEntityId === id ? "entity-list__item--focused" : ""}`}
            onClick={() => setFocusEntity(id)}
          >
            <span className={`severity-dot severity-dot--${String(incident.severity).toLowerCase()}`} />
            <div>
              <div className="entity-list__title">{String(incident.type).replaceAll("_", " ")}</div>
              <div className="entity-list__meta">
                {String(incident.severity)} · {String(incident.status)}
              </div>
            </div>
          </li>
        ))}
        {incidents.length === 0 && <li className="entity-list__empty">No incidents loaded yet.</li>}
      </ul>
    </aside>
  );
}
