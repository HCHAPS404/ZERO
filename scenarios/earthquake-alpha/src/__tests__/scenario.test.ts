import { describe, expect, it } from "vitest";
import { loadEarthquakeAlphaScenario } from "../index.js";

function summarize(world: ReturnType<typeof loadEarthquakeAlphaScenario>) {
  return {
    incidentCount: world.incidents.size,
    resourceCount: world.resources.size,
    hospitalCount: [...world.facilities.values()].filter((f) => f.kind === "HOSPITAL").length,
    shelterCount: [...world.facilities.values()].filter((f) => f.kind === "SHELTER").length,
    graphNodeCount: world.graphNodes.size,
    roadSegmentCount: world.roadSegments.size,
    blockedRoadCount: [...world.roadSegments.values()].filter((r) => r.status === "BLOCKED").length,
    degradedRoadCount: [...world.roadSegments.values()].filter((r) => r.status === "DEGRADED").length,
    hazardCount: world.hazards.size,
    reserveConstraintCount: world.districtReserves.length,
  };
}

describe("earthquake-alpha scenario", () => {
  it("loads byte-identical output on every call (deterministic)", () => {
    const first = loadEarthquakeAlphaScenario();
    const replacer = (_key: string, value: unknown) => (value instanceof Map ? [...value.entries()] : value);
    expect(JSON.stringify(first, replacer)).toBe(JSON.stringify(loadEarthquakeAlphaScenario(), replacer));
  });

  it("matches the required scenario composition", () => {
    const world = loadEarthquakeAlphaScenario();
    const summary = summarize(world);

    expect(summary.incidentCount).toBe(4);
    expect(summary.resourceCount).toBe(8);
    expect(summary.hospitalCount).toBe(2);
    expect(summary.shelterCount).toBe(1);
    expect(summary.graphNodeCount).toBeGreaterThanOrEqual(20);
    expect(summary.graphNodeCount).toBeLessThanOrEqual(30);
    expect(summary.blockedRoadCount).toBeGreaterThanOrEqual(1);
    expect(summary.degradedRoadCount).toBeGreaterThanOrEqual(1);
    expect(summary.hazardCount).toBeGreaterThanOrEqual(1);
    expect(world.hazards.get("hazard-aftershock-zone" as never)?.riskLevel).toBe("SEVERE");
    expect(summary.reserveConstraintCount).toBeGreaterThanOrEqual(1);
  });

  it("starts the world at version 1 with no accepted intel yet", () => {
    const world = loadEarthquakeAlphaScenario();
    expect(world.version).toBe(1);
    expect(world.intelArtifacts.size).toBe(0);
  });

  it("has at least one resource kind of every required type", () => {
    const world = loadEarthquakeAlphaScenario();
    const kinds = new Set([...world.resources.values()].map((r) => r.kind));
    expect(kinds).toEqual(
      new Set(["ALS_AMBULANCE", "BLS_AMBULANCE", "FIRE_ENGINE", "USAR_TEAM", "RECON_DRONE"]),
    );
  });

  it("every incident's required capability is satisfiable by at least one resource", () => {
    const world = loadEarthquakeAlphaScenario();
    for (const incident of world.incidents.values()) {
      const satisfiable = [...world.resources.values()].some((resource) =>
        incident.requiredCapabilityIds.every((cap) => resource.capabilityIds.includes(cap)),
      );
      expect(satisfiable).toBe(true);
    }
  });
});
