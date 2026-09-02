import type { OperationalSnapshot, ResponsePlan } from "@zero/domain";
import type { RoutingEnginePort, WhatIfSimulationPort, WhatIfSimulationResult } from "@zero/application";
import type { WhatIfMutation } from "@zero/contracts";
import { DeterministicResponsePlanner } from "@zero/planner";
import { affectedEntityId, applyMutation, cloneSnapshot } from "./clone.js";
import { computeKpis } from "./kpis.js";

const NON_TERMINAL_PLAN_STATUSES: readonly ResponsePlan["status"][] = [
  "DRAFT",
  "SIMULATED",
  "VALIDATED",
  "STAGED",
  "AWAITING_APPROVAL",
];

/**
 * Operates entirely on cloned OperationalSnapshot values. It never accepts
 * or produces an OperationalWorld reference, so there is no code path by
 * which a what-if run could write back to the authoritative world.
 */
export class InMemoryWhatIfSimulationAdapter implements WhatIfSimulationPort {
  constructor(private readonly routingEngine: RoutingEnginePort) {}

  runWhatIf(
    snapshot: OperationalSnapshot,
    existingPlans: readonly ResponsePlan[],
    mutations: readonly WhatIfMutation[],
  ): WhatIfSimulationResult {
    const simulated = mutations.reduce<OperationalSnapshot>(
      (acc, mutation) => applyMutation(acc, mutation),
      cloneSnapshot(snapshot),
    );

    const baselineMetrics = computeKpis(snapshot, this.routingEngine);
    const simulatedMetrics = computeKpis(simulated, this.routingEngine);

    const blockedRoadIds = new Set(
      [...simulated.roadSegments.values()].filter((r) => r.status === "BLOCKED").map((r) => String(r.id)),
    );

    const invalidatedPlans = existingPlans.filter(
      (plan) =>
        NON_TERMINAL_PLAN_STATUSES.includes(plan.status) &&
        plan.assignments.some((assignment) =>
          assignment.routeSummary.roadSegmentIds.some((roadSegmentId) => blockedRoadIds.has(roadSegmentId)),
        ),
    );

    const affectedIncidentIds = [
      ...new Set(
        invalidatedPlans.flatMap((plan) => plan.assignments.map((assignment) => assignment.incidentId)),
      ),
    ];

    const candidateReplacementPlans =
      affectedIncidentIds.length > 0
        ? new DeterministicResponsePlanner(this.routingEngine).generatePlans(simulated, {
            incidentIds: affectedIncidentIds,
          })
        : [];

    return {
      baselineWorldVersion: snapshot.version,
      baselineMetrics,
      simulatedMetrics,
      affectedEntityIds: mutations.map(affectedEntityId),
      invalidatedPlanIds: invalidatedPlans.map((plan) => plan.id),
      candidateReplacementPlans,
    };
  }
}
