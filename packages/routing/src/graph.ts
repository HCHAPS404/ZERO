import type { GraphNodeId, OperationalSnapshot, RoadSegmentId } from "@zero/domain";

export interface DirectedEdge {
  readonly roadSegmentId: RoadSegmentId;
  readonly to: GraphNodeId;
  readonly travelTimeSeconds: number;
  readonly distanceMeters: number;
  readonly hazardExposure: number;
}

const DEGRADED_TRAVEL_TIME_MULTIPLIER = 1.6;

/**
 * Builds a directed adjacency list from the snapshot's road segments.
 * BLOCKED segments are excluded entirely (they cannot be traversed).
 * DEGRADED segments incur a travel-time multiplier on top of their hazard
 * penalty.
 */
export function buildAdjacency(
  snapshot: OperationalSnapshot,
): ReadonlyMap<GraphNodeId, readonly DirectedEdge[]> {
  const adjacency = new Map<GraphNodeId, DirectedEdge[]>();

  const addEdge = (from: GraphNodeId, edge: DirectedEdge): void => {
    const list = adjacency.get(from) ?? [];
    list.push(edge);
    adjacency.set(from, list);
  };

  for (const segment of snapshot.roadSegments.values()) {
    if (segment.status === "BLOCKED") {
      continue;
    }
    const multiplier = segment.status === "DEGRADED" ? DEGRADED_TRAVEL_TIME_MULTIPLIER : 1;
    const travelTimeSeconds = segment.baseTravelTimeSeconds * multiplier + segment.hazardPenaltySeconds;

    addEdge(segment.from, {
      roadSegmentId: segment.id,
      to: segment.to,
      travelTimeSeconds,
      distanceMeters: segment.distanceMeters,
      hazardExposure: segment.hazardPenaltySeconds,
    });

    if (segment.bidirectional) {
      addEdge(segment.to, {
        roadSegmentId: segment.id,
        to: segment.from,
        travelTimeSeconds,
        distanceMeters: segment.distanceMeters,
        hazardExposure: segment.hazardPenaltySeconds,
      });
    }
  }

  return adjacency;
}
