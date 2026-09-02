import {
  asConstraintId,
  asResponsePlanId,
  type ConstraintViolation,
  type Incident,
  type OperationalSnapshot,
  type PlanStrategy,
  type Resource,
  type ResponsePlan,
} from "@zero/domain";
import type { PlanningConstraints, ResponsePlannerPort, RoutingEnginePort } from "@zero/application";
import { buildReserveViolation, computeDistrictAvailability, districtKey, selectBestResource } from "./selection.js";
import { computeMetrics, computeScore } from "./scoring.js";

const ALL_STRATEGIES: readonly PlanStrategy[] = ["FASTEST", "BALANCED", "LOWEST_RISK"];

const SEVERITY_RANK: Record<Incident["severity"], number> = {
  CRITICAL: 3,
  HIGH: 2,
  MODERATE: 1,
  LOW: 0,
};

function pickIncidents(snapshot: OperationalSnapshot, constraints: PlanningConstraints): Incident[] {
  const pool = constraints.incidentIds
    ? constraints.incidentIds.map((id) => snapshot.incidents.get(id as never)).filter((i): i is Incident => !!i)
    : [...snapshot.incidents.values()].filter((i) => i.status !== "RESOLVED");

  return [...pool].sort((a, b) => {
    const severityDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (severityDiff !== 0) return severityDiff;
    if (b.casualtyEstimate !== a.casualtyEstimate) return b.casualtyEstimate - a.casualtyEstimate;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Deterministic constrained-greedy planner. No LLM, no external
 * optimization service: incidents are processed in a fixed severity order
 * and, for each, the best available resource is chosen under the active
 * strategy's cost function, preferring candidates that respect district
 * reserve constraints. Ties are broken by resource id, so identical inputs
 * always produce identical plans.
 */
export class DeterministicResponsePlanner implements ResponsePlannerPort {
  constructor(private readonly routingEngine: RoutingEnginePort) {}

  generatePlans(snapshot: OperationalSnapshot, constraints: PlanningConstraints): readonly ResponsePlan[] {
    const strategies = constraints.strategies ?? ALL_STRATEGIES;
    return strategies.map((strategy) => this.generateSinglePlan(snapshot, constraints, strategy));
  }

  private generateSinglePlan(
    snapshot: OperationalSnapshot,
    constraints: PlanningConstraints,
    strategy: PlanStrategy,
  ): ResponsePlan {
    const incidents = pickIncidents(snapshot, constraints);
    const availableResources = new Map<string, Resource>(
      [...snapshot.resources.values()].filter((r) => r.status === "AVAILABLE").map((r) => [r.id, r]),
    );
    const districtCounts = computeDistrictAvailability(snapshot);
    const totalAvailableResourceCount = availableResources.size;

    const assignments: ResponsePlan["assignments"][number][] = [];
    const violations: ConstraintViolation[] = [];
    const explanationComponents: string[] = [];
    let assignmentIndex = 0;

    for (const incident of incidents) {
      const selection = selectBestResource(
        incident,
        availableResources,
        snapshot,
        this.routingEngine,
        strategy,
        districtCounts,
        snapshot.districtReserves,
        assignmentIndex++,
      );

      if (!selection) {
        explanationComponents.push(
          `No reachable, capability-matched, available resource found for incident ${incident.id}.`,
        );
        continue;
      }

      assignments.push(selection.assignment);
      availableResources.delete(selection.resource.id);
      const key = districtKey(selection.resource.districtId, selection.resource.kind);
      districtCounts.set(key, (districtCounts.get(key) ?? 1) - 1);

      if (selection.breachesReserve) {
        violations.push(
          buildReserveViolation(
            asConstraintId(`reserve-${selection.resource.districtId}-${selection.resource.kind}`),
            selection.resource,
          ),
        );
      }

      explanationComponents.push(
        `Assigned ${selection.resource.id} (${selection.resource.kind}) to incident ${incident.id}: ` +
          `ETA ${Math.round(selection.assignment.routeSummary.etaSeconds)}s, ` +
          `hazard exposure ${selection.assignment.routeSummary.hazardExposure}.`,
      );
    }

    const metrics = computeMetrics(assignments, incidents, totalAvailableResourceCount, districtCounts, snapshot.districtReserves);
    const score = computeScore(metrics, violations);

    return {
      id: asResponsePlanId(`plan-${snapshot.scenarioId}-v${snapshot.version}-${strategy.toLowerCase()}`),
      scenarioId: snapshot.scenarioId,
      strategy,
      status: "DRAFT",
      basisWorldVersion: snapshot.version,
      assignments,
      score,
      metrics,
      constraintViolations: violations,
      explanationComponents,
      createdAt: snapshot.snapshotTakenAt,
      updatedAt: snapshot.snapshotTakenAt,
    };
  }
}
