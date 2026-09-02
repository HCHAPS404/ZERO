import { useState } from "react";
import { useCommandCenterStore } from "../state/store.js";

export function IntelligencePanel() {
  const signals = useCommandCenterStore((s) => s.signals);
  const correlateSignals = useCommandCenterStore((s) => s.correlateSignals);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <section className="panel">
      <h2 className="panel-title">Operational Intelligence</h2>
      <ul className="signal-list">
        {signals.map((signal) => (
          <li key={signal.id} className="signal-list__item">
            <input type="checkbox" checked={checked.has(signal.id)} onChange={() => toggle(signal.id)} />
            <div>
              <div className="signal-list__claim">{signal.rawClaim}</div>
              <div className="signal-list__meta">
                <span className={`trust-badge trust-badge--${signal.trustLevel.toLowerCase()}`}>{signal.trustLevel}</span>
                <span>{signal.sourceType}</span>
                <span>{signal.status}</span>
                <span>conf. {Math.round(signal.confidence * 100)}%</span>
              </div>
            </div>
          </li>
        ))}
        {signals.length === 0 && <li className="signal-list__empty">No signals loaded yet.</li>}
      </ul>
      <button
        disabled={checked.size < 2}
        onClick={() => {
          correlateSignals([...checked]);
          setChecked(new Set());
        }}
      >
        Correlate selected ({checked.size})
      </button>
    </section>
  );
}
