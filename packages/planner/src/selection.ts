import type {
  ConstraintViolation,
  DistrictReserveConstraint,
  Incident,
  OperationalSnapshot,
  PlanAssignmentId,
  PlanStrategy,
  Resource,
} from "@zero/domain";
import { asPlanAssignmentId, type ConstraintId } from "@zero/domain";
import type { RoutingEnginePort } from "@zero/application";
import type { PlanAssignment } from "@zero/domain";

export interface DistrictKey {
  readonly districtId: string;
  readonly resourceKind: Resource["kind"];
}

export function districtKey(districtId: string, resourceKind: Resource["kind"]): string {
  return `${districtId}:${resourceKind}`;
}

export function computeDistrictAvailability(
  snapshot: OperationalSnapshot,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const resource of snapshot.resources.values()) {
    if (resource.status !== "AVAILABLE") continue;
    const key = districtKey(resource.districtId, resource.kind);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function hasRequiredCapabilities(incident: Incident, resource: Resource): boolean {
  return incident.requiredCapabilityIds.every((id) => resource.capabilityIds.includes(id));
}

function strategyScore(strategy: PlanStrategy, etaSeconds: number, hazardExposure: number): number {
  switch (strategy) {
    case "FASTEST":
      return etaSeconds;
    case "LOWEST_RISK":
      return hazardExposure * 100 + etaSeconds * 0.1;
    case "BALANCED":
    default:
      return etaSeconds * 0.6 + hazardExposure * 40;
  }
}

export interface SelectionResult {
  readonly resource: Resource;
  readonly assignment: PlanAssignment;
  readonly breachesReserve: boolean;
}

/**
 * Selects the best available resource for an incident under a strategy,
 * preferring candidates that do not breach a district reserve constraint.
 * Candidates are ordered deterministically (by score, tie-broken by
 * resource id) so results are reproducible across runs.
 */
export function selectBestResource(
  incident: Incident,
  availableResources: ReadonlyMap<string, Resource>,
  snapshot: OperationalSnapshot,
  routingEngine: RoutingEnginePort,
  strategy: PlanStrategy,
  districtCounts: ReadonlyMap<string, number>,
  reserves: readonly DistrictReserveConstraint[],
  assignmentIndex: number,
): SelectionResult | undefined {
  type Candidate = SelectionResult & { readonly score: number };
  const candidates: Candidate[] = [];

  for (const resource of availableResources.values()) {
    if (resource.status !== "AVAILABLE") continue;
    if (!hasRequiredCapabilities(incident, resource)) continue;

    const route = routingEngine.findRoute(
      snapshot,
      resource.currentGraphNodeId as never,
      incident.nearestGraphNodeId as never,
    );
    if (!route.found) continue;

    const reserve = reserves.find(
      (r) => r.districtId === resource.districtId && r.resourceKind === resource.kind,
    );
    const currentCount = districtCounts.get(districtKey(resource.districtId, resource.kind)) ?? 0;
    const breachesReserve = reserve ? currentCount - 1 < reserve.minimumAvailable : false;

    const assignment: PlanAssignment = {
      id: asPlanAssignmentId(`assignment-${incident.id}-${resource.id}-${assignmentIndex}`),
      resourceId: resource.id,
      incidentId: incident.id,
      routeSummary: {
        etaSeconds: route.etaSeconds,
        distanceMeters: route.distanceMeters,
        hazardExposure: route.hazardExposure,
        roadSegmentIds: route.roadSegmentIds,
      },
    };

    candidates.push({
      resource,
      assignment,
      breachesReserve,
      score: strategyScore(strategy, route.etaSeconds, route.hazardExposure),
    });
  }

  if (candidates.length === 0) {
    return undefined;
  }

  candidates.sort((a, b) => {
    if (a.breachesReserve !== b.breachesReserve) {
      return a.breachesReserve ? 1 : -1;
    }
    if (a.score !== b.score) {
      return a.score - b.score;
    }
    return a.resource.id.localeCompare(b.resource.id);
  });

  return candidates[0];
}

export function buildReserveViolation(
  constraintId: ConstraintId,
  resource: Resource,
): ConstraintViolation {
  return {
    constraintId,
    description: `Assigning ${resource.id} would breach the district reserve for ${resource.districtId}/${resource.kind}.`,
  };
}
