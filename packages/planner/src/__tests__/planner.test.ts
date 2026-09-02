import { describe, expect, it } from "vitest";
import { asIncidentId, asResourceId, asFacilityId, type Incident, type Resource } from "@zero/domain";
import { GraphAStarRoutingAdapter } from "@zero/routing";
import { DeterministicResponsePlanner } from "../planner.js";
import { BASE_FAST, CAP_ALS, CAP_USAR, INCIDENT_NODE_2, buildPlannerSnapshot } from "./fixtures.js";

function makePlanner(): DeterministicResponsePlanner {
  return new DeterministicResponsePlanner(new GraphAStarRoutingAdapter());
}

describe("DeterministicResponsePlanner", () => {
  it("stamps every plan with the snapshot's world version (basisWorldVersion)", () => {
    const snapshot = buildPlannerSnapshot({ version: 7 });
    const plans = makePlanner().generatePlans(snapshot, {});
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      expect(plan.basisWorldVersion).toBe(7);
    }
  });

  it("generates the three strategy profiles by default", () => {
    const snapshot = buildPlannerSnapshot();
    const plans = makePlanner().generatePlans(snapshot, {});
    expect(plans.map((p) => p.strategy).sort()).toEqual(["BALANCED", "FASTEST", "LOWEST_RISK"]);
  });

  it("only matches resources whose capabilities satisfy the incident requirement", () => {
    const usarIncident: Incident = {
      id: asIncidentId("incident-usar"),
      type: "SEARCH_AND_RESCUE",
      status: "ACTIVE",
      severity: "HIGH",
      location: { lat: 0, lon: 0.02 },
      nearestGraphNodeId: INCIDENT_NODE_2,
      requiredCapabilityIds: [CAP_USAR],
      casualtyEstimate: 2,
      reportedAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      description: "Trapped occupants",
    };
    const snapshot = buildPlannerSnapshot({ extraIncidents: [usarIncident] });
    const plans = makePlanner().generatePlans(snapshot, { strategies: ["FASTEST"] });
    const plan = plans[0]!;
    expect(plan.assignments.some((a) => a.incidentId === usarIncident.id)).toBe(false);
    expect(plan.explanationComponents.some((line) => line.includes(usarIncident.id))).toBe(true);
  });

  it("prefers the reserve-safe resource, but records a violation when only a reserve-breaching one remains", () => {
    const amb2: Resource = {
      id: asResourceId("amb-fast2"),
      kind: "ALS_AMBULANCE",
      name: "ALS Ambulance (fast lane, #2)",
      status: "AVAILABLE",
      capabilityIds: [CAP_ALS],
      currentGraphNodeId: BASE_FAST,
      homeFacilityId: asFacilityId("hospital-1"),
      districtId: "DISTRICT-NORTH",
      location: { lat: 0, lon: 0 },
    };
    const incident2: Incident = {
      id: asIncidentId("incident-2"),
      type: "MEDICAL_MASS_CASUALTY",
      status: "ACTIVE",
      severity: "HIGH",
      location: { lat: 0, lon: 0.021 },
      nearestGraphNodeId: INCIDENT_NODE_2,
      requiredCapabilityIds: [CAP_ALS],
      casualtyEstimate: 5,
      reportedAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      description: "Second medical incident",
    };
    const snapshot = buildPlannerSnapshot({
      districtReserves: [{ districtId: "DISTRICT-NORTH", resourceKind: "ALS_AMBULANCE", minimumAvailable: 1 }],
      extraResources: [amb2],
      extraIncidents: [incident2],
    });

    const plans = makePlanner().generatePlans(snapshot, { strategies: ["FASTEST"] });
    const plan = plans[0]!;

    expect(plan.assignments).toHaveLength(2);
    expect(plan.constraintViolations).toHaveLength(1);
    expect(plan.constraintViolations[0]!.description).toContain("district reserve");
  });

  it("produces identical output for identical input (deterministic)", () => {
    const snapshot = buildPlannerSnapshot();
    const planner = makePlanner();
    const first = planner.generatePlans(snapshot, {});
    const second = planner.generatePlans(snapshot, {});
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("FASTEST and LOWEST_RISK choose different resources when eta and hazard tradeoffs diverge", () => {
    const snapshot = buildPlannerSnapshot();
    const plans = makePlanner().generatePlans(snapshot, { strategies: ["FASTEST", "LOWEST_RISK"] });
    const fastest = plans.find((p) => p.strategy === "FASTEST")!;
    const lowestRisk = plans.find((p) => p.strategy === "LOWEST_RISK")!;

    expect(fastest.assignments[0]!.resourceId).toBe("amb-fast");
    expect(lowestRisk.assignments[0]!.resourceId).toBe("amb-safe");
  });

  it("a plan with hard constraint violations cannot reach VALIDATED", async () => {
    const { transitionPlan } = await import("@zero/domain");
    const amb2: Resource = {
      id: asResourceId("amb-fast2"),
      kind: "ALS_AMBULANCE",
      name: "ALS Ambulance (fast lane, #2)",
      status: "AVAILABLE",
      capabilityIds: [CAP_ALS],
      currentGraphNodeId: BASE_FAST,
      homeFacilityId: asFacilityId("hospital-1"),
      districtId: "DISTRICT-NORTH",
      location: { lat: 0, lon: 0 },
    };
    const incident2: Incident = {
      id: asIncidentId("incident-2"),
      type: "MEDICAL_MASS_CASUALTY",
      status: "ACTIVE",
      severity: "HIGH",
      location: { lat: 0, lon: 0.021 },
      nearestGraphNodeId: INCIDENT_NODE_2,
      requiredCapabilityIds: [CAP_ALS],
      casualtyEstimate: 5,
      reportedAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      description: "Second medical incident",
    };
    const snapshot = buildPlannerSnapshot({
      districtReserves: [{ districtId: "DISTRICT-NORTH", resourceKind: "ALS_AMBULANCE", minimumAvailable: 1 }],
      extraResources: [amb2],
      extraIncidents: [incident2],
    });
    const plan = makePlanner().generatePlans(snapshot, { strategies: ["FASTEST"] })[0]!;
    const simulated = transitionPlan(plan, "SIMULATED", "2026-09-01T00:00:00.000Z");
    expect(() => transitionPlan(simulated, "VALIDATED", "2026-09-01T00:00:00.000Z")).toThrow();
  });
});
