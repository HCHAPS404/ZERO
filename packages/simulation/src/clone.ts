import {
  asInfrastructureAssetId,
  asRoadSegmentId,
  type OperationalSnapshot,
} from "@zero/domain";
import type { WhatIfMutation } from "@zero/contracts";

/**
 * A fully independent, deep-enough clone of a snapshot: every top-level
 * Map is copied so that applying a mutation can never reach back and
 * mutate the caller's original snapshot (and, transitively, the
 * authoritative OperationalWorld it was read from).
 */
export function cloneSnapshot(snapshot: OperationalSnapshot): OperationalSnapshot {
  return {
    ...snapshot,
    incidents: new Map(snapshot.incidents),
    resources: new Map(snapshot.resources),
    capabilities: new Map(snapshot.capabilities),
    facilities: new Map(snapshot.facilities),
    infrastructureAssets: new Map(snapshot.infrastructureAssets),
    roadSegments: new Map(snapshot.roadSegments),
    graphNodes: new Map(snapshot.graphNodes),
    hazards: new Map(snapshot.hazards),
    signals: new Map(snapshot.signals),
    intelArtifacts: new Map(snapshot.intelArtifacts),
    districtReserves: [...snapshot.districtReserves],
  };
}

export function applyMutation(
  snapshot: OperationalSnapshot,
  mutation: WhatIfMutation,
): OperationalSnapshot {
  switch (mutation.kind) {
    case "BLOCK_ROAD": {
      const id = asRoadSegmentId(mutation.roadSegmentId);
      const existing = snapshot.roadSegments.get(id);
      if (!existing) return snapshot;
      const roadSegments = new Map(snapshot.roadSegments);
      roadSegments.set(id, { ...existing, status: "BLOCKED" });
      return { ...snapshot, roadSegments };
    }
    case "DEGRADE_ROAD": {
      const id = asRoadSegmentId(mutation.roadSegmentId);
      const existing = snapshot.roadSegments.get(id);
      if (!existing) return snapshot;
      const roadSegments = new Map(snapshot.roadSegments);
      roadSegments.set(id, { ...existing, status: "DEGRADED" });
      return { ...snapshot, roadSegments };
    }
    case "REOPEN_ROAD": {
      const id = asRoadSegmentId(mutation.roadSegmentId);
      const existing = snapshot.roadSegments.get(id);
      if (!existing) return snapshot;
      const roadSegments = new Map(snapshot.roadSegments);
      roadSegments.set(id, { ...existing, status: "OPEN" });
      return { ...snapshot, roadSegments };
    }
    case "FAIL_INFRASTRUCTURE": {
      const id = asInfrastructureAssetId(mutation.infrastructureAssetId);
      const existing = snapshot.infrastructureAssets.get(id);
      if (!existing) return snapshot;
      const infrastructureAssets = new Map(snapshot.infrastructureAssets);
      infrastructureAssets.set(id, { ...existing, status: "FAILED" });
      return { ...snapshot, infrastructureAssets };
    }
    default:
      return snapshot;
  }
}

export function affectedEntityId(mutation: WhatIfMutation): string {
  return mutation.kind === "FAIL_INFRASTRUCTURE" ? mutation.infrastructureAssetId : mutation.roadSegmentId;
}
