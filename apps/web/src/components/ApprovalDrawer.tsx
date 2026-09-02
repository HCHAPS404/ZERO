import { useState } from "react";
import { useCommandCenterStore } from "../state/store.js";

/**
 * HUMAN APPROVAL BOUNDARY
 * ------------------------------------------------------------------------
 * This is the only place in the entire system that can move a
 * ResponsePlan to APPROVED or REJECTED. It calls the human-facing API
 * directly (store.approvePlan / store.rejectPlan -> POST /plans/:id/approve
 * or /reject) -- never WebMCP. There is no WebMCP tool capable of
 * performing this action; see packages/webmcp/src/tools.ts and
 * docs/SECURITY.md. A browser agent can generate, stage, and compare
 * plans, and can nudge the operator's focus, but it cannot cross this
 * boundary. Only a human, acting through this drawer (or the equivalent
 * API call made by a human-operated client), can.
 */
export function ApprovalDrawer() {
  const plans = useCommandCenterStore((s) => s.plans);
  const approvePlan = useCommandCenterStore((s) => s.approvePlan);
  const rejectPlan = useCommandCenterStore((s) => s.rejectPlan);
  const [actor, setActor] = useState("operator-1");
  const [reason, setReason] = useState("");

  const awaitingApproval = plans.filter((plan) => plan.status === "AWAITING_APPROVAL");

  if (awaitingApproval.length === 0) {
    return (
      <section className="panel approval-drawer">
        <h2 className="panel-title">Human Approval</h2>
        <p className="approval-drawer__empty">No plans awaiting approval.</p>
      </section>
    );
  }

  return (
    <section className="panel approval-drawer">
      <h2 className="panel-title">Human Approval</h2>
      <label className="approval-drawer__actor">
        Acting as
        <input value={actor} onChange={(e) => setActor(e.target.value)} />
      </label>
      <ul className="approval-drawer__list">
        {awaitingApproval.map((plan) => (
          <li key={plan.id} className="approval-drawer__item">
            <div>
              {plan.strategy} · score {plan.score.toFixed(2)} · plan {plan.id}
            </div>
            <div className="approval-drawer__actions">
              <button className="approve" onClick={() => approvePlan(plan.id, actor)}>
                Approve
              </button>
              <input
                className="approval-drawer__reason"
                placeholder="rejection reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <button className="reject" onClick={() => rejectPlan(plan.id, actor, reason || "not specified")}>
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
