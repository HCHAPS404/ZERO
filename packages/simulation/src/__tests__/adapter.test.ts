import { describe, expect, it } from "vitest";
import { GraphAStarRoutingAdapter } from "@zero/routing";
import { InMemoryWhatIfSimulationAdapter } from "../adapter.js";
import { ROAD_ID, buildExistingPlan, buildSimSnapshot } from "./fixtures.js";

function makeAdapter(): InMemoryWhatIfSimulationAdapter {
  return new InMemoryWhatIfSimulationAdapter(new GraphAStarRoutingAdapter());
}

describe("InMemoryWhatIfSimulationAdapter", () => {
  it("never mutates the authoritative snapshot passed in", () => {
    const snapshot = buildSimSnapshot();
    const snapshotJson = JSON.stringify(snapshot, (_k, v) => (v instanceof Map ? [...v.entries()] : v));

    makeAdapter().runWhatIf(snapshot, [buildExistingPlan()], [{ kind: "BLOCK_ROAD", roadSegmentId: String(ROAD_ID) }]);

    const afterJson = JSON.stringify(snapshot, (_k, v) => (v instanceof Map ? [...v.entries()] : v));
    expect(afterJson).toBe(snapshotJson);
    expect(snapshot.roadSegments.get(ROAD_ID)?.status).toBe("OPEN");
  });

  it("computes a KPI delta when a road is hypothetically blocked", () => {
    const snapshot = buildSimSnapshot();
    const result = makeAdapter().runWhatIf(snapshot, [], [{ kind: "BLOCK_ROAD", roadSegmentId: String(ROAD_ID) }]);

    expect(result.baselineMetrics.unreachableIncidentCount).toBe(0);
    expect(result.simulatedMetrics.unreachableIncidentCount).toBe(1);
    expect(result.baselineWorldVersion).toBe(snapshot.version);
    expect(result.affectedEntityIds).toContain(String(ROAD_ID));
  });

  it("invalidates existing plans whose route is blocked and proposes a replacement", () => {
    const snapshot = buildSimSnapshot();
    const plan = buildExistingPlan();

    const result = makeAdapter().runWhatIf(snapshot, [plan], [{ kind: "BLOCK_ROAD", roadSegmentId: String(ROAD_ID) }]);

    expect(result.invalidatedPlanIds).toContain(plan.id);
    // The only road to the incident is now blocked, so no replacement route exists either.
    expect(result.candidateReplacementPlans.length).toBeGreaterThan(0);
    expect(result.candidateReplacementPlans[0]!.assignments).toHaveLength(0);
  });

  it("leaves plans untouched when the mutation does not affect their route", () => {
    const snapshot = buildSimSnapshot();
    const plan = buildExistingPlan();
    const result = makeAdapter().runWhatIf(snapshot, [plan], [{ kind: "DEGRADE_ROAD", roadSegmentId: "nonexistent-road" }]);
    expect(result.invalidatedPlanIds).toHaveLength(0);
  });
});
