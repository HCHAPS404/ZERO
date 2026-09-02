import { describe, expect, it } from "vitest";
import {
  asIncidentId,
  asScenarioId,
  assertWorldVersion,
  createOperationalSnapshot,
  upsertIncident,
  type Incident,
  type OperationalWorld,
} from "../index.js";
import { StaleWorldError } from "../errors.js";

function makeEmptyWorld(): OperationalWorld {
  return {
    scenarioId: asScenarioId("earthquake-alpha"),
    version: 1,
    generatedAt: "2026-09-01T00:00:00.000Z",
    incidents: new Map(),
    resources: new Map(),
    capabilities: new Map(),
    facilities: new Map(),
    infrastructureAssets: new Map(),
    roadSegments: new Map(),
    graphNodes: new Map(),
    hazards: new Map(),
    signals: new Map(),
    intelArtifacts: new Map(),
    districtReserves: [],
  };
}

function makeIncident(): Incident {
  return {
    id: asIncidentId("incident-1"),
    type: "FIRE",
    status: "REPORTED",
    severity: "MODERATE",
    location: { lat: 0, lon: 0 },
    nearestGraphNodeId: "node-1",
    requiredCapabilityIds: [],
    casualtyEstimate: 0,
    reportedAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    description: "fire",
  };
}

describe("OperationalWorld versioning", () => {
  it("increments world version on a meaningful mutation", () => {
    const world = makeEmptyWorld();
    const next = upsertIncident(world, makeIncident(), "2026-09-01T00:01:00.000Z");
    expect(next.version).toBe(world.version + 1);
    expect(next.incidents.get(makeIncident().id)).toBeDefined();
  });

  it("does not mutate the original world (immutability)", () => {
    const world = makeEmptyWorld();
    upsertIncident(world, makeIncident(), "2026-09-01T00:01:00.000Z");
    expect(world.version).toBe(1);
    expect(world.incidents.size).toBe(0);
  });

  it("accepts a matching world version", () => {
    const world = makeEmptyWorld();
    expect(() => assertWorldVersion(world, 1)).not.toThrow();
  });

  it("throws STALE_WORLD when versions diverge, with recovery metadata", () => {
    const world = upsertIncident(makeEmptyWorld(), makeIncident(), "2026-09-01T00:01:00.000Z");
    try {
      assertWorldVersion(world, 1);
      expect.unreachable("expected StaleWorldError");
    } catch (error) {
      expect(error).toBeInstanceOf(StaleWorldError);
      const staleError = error as StaleWorldError;
      expect(staleError.code).toBe("STALE_WORLD");
      expect(staleError.expectedVersion).toBe(1);
      expect(staleError.currentVersion).toBe(2);
      expect(staleError.recoverable).toBe(true);
      expect(staleError.recommendedAction).toBe("REPLAN");
    }
  });

  it("createOperationalSnapshot produces an immutable point-in-time copy", () => {
    const world = makeEmptyWorld();
    const snapshot = createOperationalSnapshot(world, "2026-09-01T00:02:00.000Z");
    expect(snapshot.version).toBe(world.version);
    expect(snapshot.snapshotTakenAt).toBe("2026-09-01T00:02:00.000Z");
    const mutatedWorld = upsertIncident(world, makeIncident(), "2026-09-01T00:03:00.000Z");
    expect(mutatedWorld.version).not.toBe(snapshot.version);
    expect(snapshot.incidents.size).toBe(0);
  });
});
