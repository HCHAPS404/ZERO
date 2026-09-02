import type { GraphNodeId, OperationalSnapshot, RoadSegmentId } from "@zero/domain";

export interface RouteResult {
  readonly found: true;
  readonly fromGraphNodeId: GraphNodeId;
  readonly toGraphNodeId: GraphNodeId;
  readonly roadSegmentIds: readonly RoadSegmentId[];
  readonly distanceMeters: number;
  readonly etaSeconds: number;
  readonly hazardExposure: number;
}

export interface RouteNotFound {
  readonly found: false;
  readonly fromGraphNodeId: GraphNodeId;
  readonly toGraphNodeId: GraphNodeId;
}

export type RouteOutcome = RouteResult | RouteNotFound;

/**
 * The application/domain layers depend only on this port. The concrete
 * A*-based implementation lives in @zero/routing as an adapter.
 */
export interface RoutingEnginePort {
  findRoute(
    snapshot: OperationalSnapshot,
    fromGraphNodeId: GraphNodeId,
    toGraphNodeId: GraphNodeId,
  ): RouteOutcome;
}
