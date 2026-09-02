import type { Incident, OperationalSnapshot, Resource } from "@zero/domain";
import type { RoutingEnginePort, SimulationKpis } from "@zero/application";

function bestEtaForIncident(
  incident: Incident,
  resources: readonly Resource[],
  snapshot: OperationalSnapshot,
  routingEngine: RoutingEnginePort,
): { etaSeconds: number; hazardExposure: number } | undefined {
  let best: { etaSeconds: number; hazardExposure: number } | undefined;
  for (const resource of resources) {
    if (resource.status !== "AVAILABLE") continue;
    if (!incident.requiredCapabilityIds.every((cap) => resource.capabilityIds.includes(cap))) continue;
    const route = routingEngine.findRoute(
      snapshot,
      resource.currentGraphNodeId as never,
      incident.nearestGraphNodeId as never,
    );
    if (!route.found) continue;
    if (!best || route.etaSeconds < best.etaSeconds) {
      best = { etaSeconds: route.etaSeconds, hazardExposure: route.hazardExposure };
    }
  }
  return best;
}

/**
 * A lightweight, non-consuming KPI estimate (each incident is matched
 * independently to its own nearest capable resource) -- good enough for a
 * what-if delta, not a substitute for the constrained planner.
 */
export function computeKpis(snapshot: OperationalSnapshot, routingEngine: RoutingEnginePort): SimulationKpis {
  const incidents = [...snapshot.incidents.values()].filter((i) => i.status !== "RESOLVED");
  const resources = [...snapshot.resources.values()];
  const criticalSeverities = new Set(["CRITICAL", "HIGH"]);

  const etas: number[] = [];
  const criticalEtas: number[] = [];
  const hazards: number[] = [];
  let unreachableIncidentCount = 0;

  for (const incident of incidents) {
    const best = bestEtaForIncident(incident, resources, snapshot, routingEngine);
    if (!best) {
      unreachableIncidentCount += 1;
      continue;
    }
    etas.push(best.etaSeconds);
    hazards.push(best.hazardExposure);
    if (criticalSeverities.has(incident.severity)) {
      criticalEtas.push(best.etaSeconds);
    }
  }

  return {
    averageEtaSeconds: etas.length ? etas.reduce((s, v) => s + v, 0) / etas.length : 0,
    criticalEtaSeconds: criticalEtas.length ? Math.max(...criticalEtas) : 0,
    riskExposure: hazards.length ? hazards.reduce((s, v) => s + v, 0) / hazards.length : 0,
    unreachableIncidentCount,
  };
}
