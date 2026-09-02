import { asScenarioId, type OperationalWorld, type RoadSegment } from "@zero/domain";
import { asRoadSegmentId } from "@zero/domain";
import { buildGridNodes, buildGridRoadSegments } from "./grid.js";
import {
  CAPABILITIES,
  DISTRICT_RESERVES,
  FACILITIES,
  HAZARDS,
  INCIDENTS,
  INFRASTRUCTURE_ASSETS,
  RESOURCES,
} from "./entities.js";
import { SIGNALS } from "./signals.js";

export * from "./entities.js";
export * from "./grid.js";
export * from "./signals.js";

const GENERATED_AT = "2026-01-15T08:00:00.000Z";

/** ROAD-H-2-2 (N-2-2 <-> N-2-3) is Bridge 17: blocked by the collapse. */
const BLOCKED_ROAD_ID = "ROAD-H-2-2";
/** ROAD-V-1-1 (N-1-1 <-> N-2-1) is passable but structurally compromised. */
const DEGRADED_ROAD_ID = "ROAD-V-1-1";
/** Roads touching the aftershock hazard zone around N-3-3 carry a hazard penalty. */
const HAZARD_PENALIZED_ROAD_IDS = ["ROAD-H-3-2", "ROAD-H-3-3", "ROAD-V-2-3", "ROAD-V-3-3"];
const HAZARD_PENALTY_SECONDS = 180;

function applyRoadOverrides(
  roadSegments: ReadonlyMap<ReturnType<typeof asRoadSegmentId>, RoadSegment>,
): Map<ReturnType<typeof asRoadSegmentId>, RoadSegment> {
  const result = new Map(roadSegments);

  const blockedId = asRoadSegmentId(BLOCKED_ROAD_ID);
  const blocked = result.get(blockedId);
  if (blocked) {
    result.set(blockedId, { ...blocked, status: "BLOCKED" });
  }

  const degradedId = asRoadSegmentId(DEGRADED_ROAD_ID);
  const degraded = result.get(degradedId);
  if (degraded) {
    result.set(degradedId, { ...degraded, status: "DEGRADED", hazardPenaltySeconds: 60 });
  }

  for (const rawId of HAZARD_PENALIZED_ROAD_IDS) {
    const id = asRoadSegmentId(rawId);
    const segment = result.get(id);
    if (segment) {
      result.set(id, { ...segment, hazardPenaltySeconds: HAZARD_PENALTY_SECONDS });
    }
  }

  return result;
}

/**
 * Builds the earthquake-alpha OperationalWorld deterministically -- no
 * network calls, no randomness, no wall-clock reads. The same call always
 * produces byte-identical output (see scenario tests).
 */
export function loadEarthquakeAlphaScenario(): OperationalWorld {
  const roadSegments = applyRoadOverrides(buildGridRoadSegments());

  return {
    scenarioId: asScenarioId("earthquake-alpha"),
    version: 1,
    generatedAt: GENERATED_AT,
    incidents: new Map(INCIDENTS.map((i) => [i.id, i])),
    resources: new Map(RESOURCES.map((r) => [r.id, r])),
    capabilities: new Map(CAPABILITIES.map((c) => [c.id, c])),
    facilities: new Map(FACILITIES.map((f) => [f.id, f])),
    infrastructureAssets: new Map(INFRASTRUCTURE_ASSETS.map((a) => [a.id, a])),
    roadSegments,
    graphNodes: buildGridNodes(),
    hazards: new Map(HAZARDS.map((h) => [h.id, h])),
    signals: new Map(SIGNALS.map((s) => [s.id, s])),
    intelArtifacts: new Map(),
    districtReserves: DISTRICT_RESERVES,
  };
}
