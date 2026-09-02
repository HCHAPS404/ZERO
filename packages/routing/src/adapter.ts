import type { GraphNodeId, OperationalSnapshot } from "@zero/domain";
import type { RouteOutcome, RoutingEnginePort } from "@zero/application";
import { findShortestPath } from "./astar.js";

export class GraphAStarRoutingAdapter implements RoutingEnginePort {
  findRoute(
    snapshot: OperationalSnapshot,
    fromGraphNodeId: GraphNodeId,
    toGraphNodeId: GraphNodeId,
  ): RouteOutcome {
    const outcome = findShortestPath(snapshot, fromGraphNodeId, toGraphNodeId);
    if (!outcome.found) {
      return { found: false, fromGraphNodeId, toGraphNodeId };
    }
    return {
      found: true,
      fromGraphNodeId,
      toGraphNodeId,
      roadSegmentIds: outcome.roadSegmentIds,
      distanceMeters: outcome.distanceMeters,
      etaSeconds: outcome.etaSeconds,
      hazardExposure: outcome.hazardExposure,
    };
  }
}
