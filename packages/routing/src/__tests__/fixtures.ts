import {
  asGraphNodeId,
  asRoadSegmentId,
  asScenarioId,
  type GraphNode,
  type OperationalSnapshot,
  type RoadSegment,
  type RoadStatus,
} from "@zero/domain";

export interface EdgeSpec {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly distanceMeters: number;
  readonly baseTravelTimeSeconds: number;
  readonly status?: RoadStatus;
  readonly hazardPenaltySeconds?: number;
  readonly bidirectional?: boolean;
}

/**
 * A simple diamond graph: A -> B -> D (fast lane) and A -> C -> D (slower
 * lane), plus a direct A -> D edge that tests can block/degrade.
 *   A (0,0) -- B (0,0.01) -- D (0,0.02)
 *    \                        /
 *     C (0.01,0.01) --------
 */
export function buildTestSnapshot(edgeOverrides: readonly EdgeSpec[] = []): OperationalSnapshot {
  const nodeSpecs: Record<string, { lat: number; lon: number }> = {
    A: { lat: 0, lon: 0 },
    B: { lat: 0, lon: 0.01 },
    C: { lat: 0.01, lon: 0.01 },
    D: { lat: 0, lon: 0.02 },
    ISOLATED: { lat: 5, lon: 5 },
  };

  const graphNodes = new Map<ReturnType<typeof asGraphNodeId>, GraphNode>();
  for (const [id, location] of Object.entries(nodeSpecs)) {
    graphNodes.set(asGraphNodeId(id), { id: asGraphNodeId(id), location, label: id });
  }

  const defaultEdges: EdgeSpec[] = [
    { id: "AB", from: "A", to: "B", distanceMeters: 1000, baseTravelTimeSeconds: 100, bidirectional: true },
    { id: "BD", from: "B", to: "D", distanceMeters: 1000, baseTravelTimeSeconds: 100, bidirectional: true },
    { id: "AC", from: "A", to: "C", distanceMeters: 1500, baseTravelTimeSeconds: 200, bidirectional: true },
    { id: "CD", from: "C", to: "D", distanceMeters: 1500, baseTravelTimeSeconds: 200, bidirectional: true },
  ];

  const merged = new Map(defaultEdges.map((edge) => [edge.id, edge]));
  for (const override of edgeOverrides) {
    merged.set(override.id, { ...merged.get(override.id), ...override });
  }

  const roadSegments = new Map<ReturnType<typeof asRoadSegmentId>, RoadSegment>();
  for (const edge of merged.values()) {
    roadSegments.set(asRoadSegmentId(edge.id), {
      id: asRoadSegmentId(edge.id),
      from: asGraphNodeId(edge.from),
      to: asGraphNodeId(edge.to),
      distanceMeters: edge.distanceMeters,
      baseTravelTimeSeconds: edge.baseTravelTimeSeconds,
      status: edge.status ?? "OPEN",
      hazardPenaltySeconds: edge.hazardPenaltySeconds ?? 0,
      bidirectional: edge.bidirectional ?? false,
    });
  }

  return {
    scenarioId: asScenarioId("test-scenario"),
    version: 1,
    generatedAt: "2026-09-01T00:00:00.000Z",
    snapshotTakenAt: "2026-09-01T00:00:00.000Z",
    incidents: new Map(),
    resources: new Map(),
    capabilities: new Map(),
    facilities: new Map(),
    infrastructureAssets: new Map(),
    roadSegments,
    graphNodes,
    hazards: new Map(),
    signals: new Map(),
    intelArtifacts: new Map(),
    districtReserves: [],
  };
}
