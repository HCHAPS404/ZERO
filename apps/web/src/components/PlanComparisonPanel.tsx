import { useCommandCenterStore } from "../state/store.js";

export function PlanComparisonPanel() {
  const plans = useCommandCenterStore((s) => s.plans);
  const selectedPlanIds = useCommandCenterStore((s) => s.selectedPlanIds);
  const toggleSelectedPlan = useCommandCenterStore((s) => s.toggleSelectedPlan);
  const comparePlans = useCommandCenterStore((s) => s.comparePlans);
  const generatePlans = useCommandCenterStore((s) => s.generatePlans);
  const stagePlan = useCommandCenterStore((s) => s.stagePlan);
  const comparison = useCommandCenterStore((s) => s.comparison);

  return (
    <section className="panel">
      <h2 className="panel-title">Response Plans</h2>
      <div className="plan-actions">
        <button onClick={() => generatePlans()}>Generate FASTEST / BALANCED / LOWEST_RISK</button>
        <button disabled={selectedPlanIds.length < 2} onClick={() => comparePlans()}>
          Compare selected ({selectedPlanIds.length})
        </button>
      </div>
      <ul className="plan-list">
        {plans.map((plan) => (
          <li key={plan.id} className="plan-list__item">
            <input
              type="checkbox"
              checked={selectedPlanIds.includes(plan.id)}
              onChange={() => toggleSelectedPlan(plan.id)}
            />
            <div className="plan-list__body">
              <div className="plan-list__title">
                {plan.strategy} <span className={`plan-status plan-status--${plan.status.toLowerCase()}`}>{plan.status}</span>
              </div>
              <div className="plan-list__meta">
                score {plan.score.toFixed(2)} · ETA avg {Math.round(plan.metrics.averageEtaSeconds ?? 0)}s · basis v
                {plan.basisWorldVersion}
                {plan.constraintViolations.length > 0 && (
                  <span className="plan-list__violation"> · {plan.constraintViolations.length} constraint violation(s)</span>
                )}
              </div>
            </div>
            {plan.status === "SIMULATED" && <button onClick={() => stagePlan(plan.id)}>Stage for approval</button>}
          </li>
        ))}
        {plans.length === 0 && <li className="plan-list__empty">No plans generated yet.</li>}
      </ul>

      {comparison && (
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Score</th>
              <th>Avg ETA (s)</th>
              <th>Risk exposure</th>
              <th>Reserve coverage</th>
            </tr>
          </thead>
          <tbody>
            {comparison.plans.map((plan) => (
              <tr key={plan.id} className={plan.id === comparison.recommendedPlanId ? "comparison-table__recommended" : ""}>
                <td>{plan.strategy}</td>
                <td>{plan.score.toFixed(2)}</td>
                <td>{Math.round(plan.metrics.averageEtaSeconds ?? 0)}</td>
                <td>{(plan.metrics.riskExposure ?? 0).toFixed(0)}</td>
                <td>{(plan.metrics.remainingReserveCoverage ?? 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
