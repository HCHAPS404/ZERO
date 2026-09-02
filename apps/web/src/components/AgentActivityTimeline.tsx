import { useCommandCenterStore } from "../state/store.js";

export function AgentActivityTimeline() {
  const auditEntries = useCommandCenterStore((s) => s.auditEntries);
  const sorted = [...auditEntries].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return (
    <section className="panel">
      <h2 className="panel-title">WebMCP / Agent Activity</h2>
      <ul className="timeline">
        {sorted.map((entry) => (
          <li key={entry.id} className="timeline__item">
            <span className={`actor-badge actor-badge--${entry.actorKind.toLowerCase()}`}>{entry.actorKind}</span>
            <div>
              <div className="timeline__action">
                {entry.action} <span className="timeline__actor">by {entry.actor}</span>
              </div>
              <div className="timeline__meta">
                {entry.subjectId} · {new Date(entry.occurredAt).toLocaleTimeString()}
              </div>
            </div>
          </li>
        ))}
        {sorted.length === 0 && <li className="timeline__empty">No activity recorded yet.</li>}
      </ul>
    </section>
  );
}
