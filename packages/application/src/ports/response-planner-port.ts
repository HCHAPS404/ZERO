import type { OperationalSnapshot, PlanStrategy, ResponsePlan } from "@zero/domain";

export interface PlanningConstraints {
  readonly incidentIds?: readonly string[];
  readonly strategies?: readonly PlanStrategy[];
}

/**
 * The application/domain layers depend only on this port. The concrete
 * deterministic constrained-search implementation lives in @zero/planner
 * as an adapter. No LLM or external optimization service may implement it.
 */
export interface ResponsePlannerPort {
  generatePlans(
    snapshot: OperationalSnapshot,
    constraints: PlanningConstraints,
  ): readonly ResponsePlan[];
}
