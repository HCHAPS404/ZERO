import { describe, expect, it } from "vitest";
import { asGraphNodeId } from "@zero/domain";
import { findShortestPath } from "../astar.js";
import { buildTestSnapshot } from "./fixtures.js";

const A = asGraphNodeId("A");
const B = asGraphNodeId("B");
const D = asGraphNodeId("D");
const ISOLATED = asGraphNodeId("ISOLATED");

describe("A* routing", () => {
  it("finds the shortest path via the faster A-B-D lane", () => {
    const snapshot = buildTestSnapshot();
    const result = findShortestPath(snapshot, A, D);
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.roadSegmentIds.map(String)).toEqual(["AB", "BD"]);
      expect(result.etaSeconds).toBe(200);
      expect(result.distanceMeters).toBe(2000);
    }
  });

  it("reroutes around a blocked road", () => {
    const snapshot = buildTestSnapshot([{ id: "BD", from: "B", to: "D", distanceMeters: 1000, baseTravelTimeSeconds: 100, status: "BLOCKED", bidirectional: true }]);
    const result = findShortestPath(snapshot, A, D);
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.roadSegmentIds.map(String)).toEqual(["AC", "CD"]);
      expect(result.etaSeconds).toBe(400);
    }
  });

  it("penalizes a degraded road with a travel-time multiplier", () => {
    const snapshot = buildTestSnapshot([
      { id: "AB", from: "A", to: "B", distanceMeters: 1000, baseTravelTimeSeconds: 100, status: "DEGRADED", bidirectional: true },
    ]);
    const result = findShortestPath(snapshot, A, B);
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.etaSeconds).toBe(160); // 100 * 1.6 multiplier
    }
  });

  it("factors hazard penalty into route cost, preferring the lower-hazard lane", () => {
    const snapshot = buildTestSnapshot([
      { id: "AB", from: "A", to: "B", distanceMeters: 1000, baseTravelTimeSeconds: 100, hazardPenaltySeconds: 500, bidirectional: true },
      { id: "BD", from: "B", to: "D", distanceMeters: 1000, baseTravelTimeSeconds: 100, hazardPenaltySeconds: 500, bidirectional: true },
    ]);
    const result = findShortestPath(snapshot, A, D);
    expect(result.found).toBe(true);
    if (result.found) {
      // A-B-D is now 100+500 + 100+500 = 1200s, worse than A-C-D at 400s.
      expect(result.roadSegmentIds.map(String)).toEqual(["AC", "CD"]);
      expect(result.hazardExposure).toBe(0);
    }
  });

  it("returns not-found for an unreachable destination", () => {
    const snapshot = buildTestSnapshot();
    const result = findShortestPath(snapshot, A, ISOLATED);
    expect(result.found).toBe(false);
  });

  it("returns not-found when both roads to the destination are blocked", () => {
    const snapshot = buildTestSnapshot([
      { id: "BD", from: "B", to: "D", distanceMeters: 1000, baseTravelTimeSeconds: 100, status: "BLOCKED", bidirectional: true },
      { id: "CD", from: "C", to: "D", distanceMeters: 1500, baseTravelTimeSeconds: 200, status: "BLOCKED", bidirectional: true },
    ]);
    const result = findShortestPath(snapshot, A, D);
    expect(result.found).toBe(false);
  });
});
