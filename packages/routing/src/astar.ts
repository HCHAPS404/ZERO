import type { GraphNodeId, OperationalSnapshot, RoadSegmentId } from "@zero/domain";
import { buildAdjacency } from "./graph.js";

export interface AStarResult {
  readonly found: true;
  readonly roadSegmentIds: readonly RoadSegmentId[];
  readonly distanceMeters: number;
  readonly etaSeconds: number;
  readonly hazardExposure: number;
}

export interface AStarNotFound {
  readonly found: false;
}

export type AStarOutcome = AStarResult | AStarNotFound;

/** Deterministic heuristic: great-circle distance / assumed max travel speed. Admissible for every edge cost in this scenario (no edge implies a faster effective speed). */
const HEURISTIC_MAX_SPEED_MPS = 30;
const EARTH_RADIUS_METERS = 6_371_000;

function haversineMeters(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

class MinPriorityQueue<T> {
  private items: Array<{ priority: number; value: T }> = [];

  push(value: T, priority: number): void {
    this.items.push({ priority, value });
    this.items.sort((a, b) => a.priority - b.priority);
  }

  pop(): T | undefined {
    return this.items.shift()?.value;
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }
}

export function findShortestPath(
  snapshot: OperationalSnapshot,
  fromGraphNodeId: GraphNodeId,
  toGraphNodeId: GraphNodeId,
): AStarOutcome {
  if (!snapshot.graphNodes.has(fromGraphNodeId) || !snapshot.graphNodes.has(toGraphNodeId)) {
    return { found: false };
  }
  if (fromGraphNodeId === toGraphNodeId) {
    return { found: true, roadSegmentIds: [], distanceMeters: 0, etaSeconds: 0, hazardExposure: 0 };
  }

  const adjacency = buildAdjacency(snapshot);
  const goal = snapshot.graphNodes.get(toGraphNodeId)!;
  const heuristic = (nodeId: GraphNodeId): number => {
    const node = snapshot.graphNodes.get(nodeId);
    if (!node) return 0;
    return haversineMeters(node.location, goal.location) / HEURISTIC_MAX_SPEED_MPS;
  };

  const gScore = new Map<GraphNodeId, number>([[fromGraphNodeId, 0]]);
  const cameFrom = new Map<GraphNodeId, { node: GraphNodeId; roadSegmentId: RoadSegmentId }>();
  const distanceScore = new Map<GraphNodeId, number>([[fromGraphNodeId, 0]]);
  const hazardScore = new Map<GraphNodeId, number>([[fromGraphNodeId, 0]]);
  const visited = new Set<GraphNodeId>();

  const open = new MinPriorityQueue<GraphNodeId>();
  open.push(fromGraphNodeId, heuristic(fromGraphNodeId));

  while (!open.isEmpty) {
    const current = open.pop()!;
    if (current === toGraphNodeId) {
      const roadSegmentIds: RoadSegmentId[] = [];
      let cursor: GraphNodeId | undefined = current;
      while (cursor && cameFrom.has(cursor)) {
        const step: { node: GraphNodeId; roadSegmentId: RoadSegmentId } = cameFrom.get(cursor)!;
        roadSegmentIds.unshift(step.roadSegmentId);
        cursor = step.node;
      }
      return {
        found: true,
        roadSegmentIds,
        distanceMeters: distanceScore.get(current) ?? 0,
        etaSeconds: gScore.get(current) ?? 0,
        hazardExposure: hazardScore.get(current) ?? 0,
      };
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    for (const edge of adjacency.get(current) ?? []) {
      if (visited.has(edge.to)) continue;
      const tentativeG = (gScore.get(current) ?? Infinity) + edge.travelTimeSeconds;
      if (tentativeG < (gScore.get(edge.to) ?? Infinity)) {
        gScore.set(edge.to, tentativeG);
        distanceScore.set(edge.to, (distanceScore.get(current) ?? 0) + edge.distanceMeters);
        hazardScore.set(edge.to, (hazardScore.get(current) ?? 0) + edge.hazardExposure);
        cameFrom.set(edge.to, { node: current, roadSegmentId: edge.roadSegmentId });
        open.push(edge.to, tentativeG + heuristic(edge.to));
      }
    }
  }

  return { found: false };
}
