import {
  asCapabilityId,
  asFacilityId,
  asGraphNodeId,
  asIncidentId,
  asResourceId,
  asRoadSegmentId,
  asScenarioId,
  type DistrictReserveConstraint,
  type GraphNode,
  type Incident,
  type OperationalSnapshot,
  type Resource,
  type RoadSegment,
} from "@zero/domain";

export const CAP_ALS = asCapabilityId("cap-als");
export const CAP_USAR = asCapabilityId("cap-usar");

export const BASE_FAST = asGraphNodeId("BASE_FAST");
export const BASE_SAFE = asGraphNodeId("BASE_SAFE");
export const INCIDENT_NODE = asGraphNodeId("INCIDENT_NODE");
export const INCIDENT_NODE_2 = asGraphNodeId("INCIDENT_NODE_2");

export function buildPlannerSnapshot(options?: {
  readonly districtReserves?: readonly DistrictReserveConstraint[];
  readonly extraResources?: readonly Resource[];
  readonly extraIncidents?: readonly Incident[];
  readonly version?: number;
}): OperationalSnapshot {
  const graphNodes = new Map<ReturnType<typeof asGraphNodeId>, GraphNode>();
  for (const [id, location] of [
    [BASE_FAST, { lat: 0, lon: 0 }],
    [BASE_SAFE, { lat: 0, lon: 0.05 }],
    [INCIDENT_NODE, { lat: 0, lon: 0.02 }],
    [INCIDENT_NODE_2, { lat: 0, lon: 0.021 }],
  ] as const) {
    graphNodes.set(id, { id, location, label: String(id) });
  }

  const roadSegments = new Map<ReturnType<typeof asRoadSegmentId>, RoadSegment>();
  const addRoad = (id: string, spec: Omit<RoadSegment, "id">) => {
    roadSegments.set(asRoadSegmentId(id), { id: asRoadSegmentId(id), ...spec });
  };
  addRoad("FAST-INCIDENT", {
    from: BASE_FAST,
    to: INCIDENT_NODE,
    distanceMeters: 2000,
    baseTravelTimeSeconds: 120,
    status: "OPEN",
    hazardPenaltySeconds: 100,
    bidirectional: false,
  });
  addRoad("SAFE-INCIDENT", {
    from: BASE_SAFE,
    to: INCIDENT_NODE,
    distanceMeters: 3000,
    baseTravelTimeSeconds: 300,
    status: "OPEN",
    hazardPenaltySeconds: 0,
    bidirectional: false,
  });
  addRoad("FAST-INCIDENT2", {
    from: BASE_FAST,
    to: INCIDENT_NODE_2,
    distanceMeters: 2100,
    baseTravelTimeSeconds: 130,
    status: "OPEN",
    hazardPenaltySeconds: 400,
    bidirectional: false,
  });

  const resources = new Map<ReturnType<typeof asResourceId>, Resource>();
  const addResource = (r: Resource) => resources.set(r.id, r);
  addResource({
    id: asResourceId("amb-fast"),
    kind: "ALS_AMBULANCE",
    name: "ALS Ambulance (fast lane)",
    status: "AVAILABLE",
    capabilityIds: [CAP_ALS],
    currentGraphNodeId: BASE_FAST,
    homeFacilityId: asFacilityId("hospital-1"),
    districtId: "DISTRICT-NORTH",
    location: { lat: 0, lon: 0 },
  });
  addResource({
    id: asResourceId("amb-safe"),
    kind: "ALS_AMBULANCE",
    name: "ALS Ambulance (safe lane)",
    status: "AVAILABLE",
    capabilityIds: [CAP_ALS],
    currentGraphNodeId: BASE_SAFE,
    homeFacilityId: asFacilityId("hospital-1"),
    districtId: "DISTRICT-SOUTH",
    location: { lat: 0, lon: 0.05 },
  });
  for (const extra of options?.extraResources ?? []) {
    addResource(extra);
  }

  const incidents = new Map<ReturnType<typeof asIncidentId>, Incident>();
  const addIncident = (i: Incident) => incidents.set(i.id, i);
  addIncident({
    id: asIncidentId("incident-1"),
    type: "MEDICAL_MASS_CASUALTY",
    status: "ACTIVE",
    severity: "HIGH",
    location: { lat: 0, lon: 0.02 },
    nearestGraphNodeId: INCIDENT_NODE,
    requiredCapabilityIds: [CAP_ALS],
    casualtyEstimate: 5,
    reportedAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    description: "Medical incident",
  });
  for (const extra of options?.extraIncidents ?? []) {
    addIncident(extra);
  }

  return {
    scenarioId: asScenarioId("earthquake-alpha"),
    version: options?.version ?? 5,
    generatedAt: "2026-09-01T00:00:00.000Z",
    snapshotTakenAt: "2026-09-01T00:00:00.000Z",
    incidents,
    resources,
    capabilities: new Map(),
    facilities: new Map(),
    infrastructureAssets: new Map(),
    roadSegments,
    graphNodes,
    hazards: new Map(),
    signals: new Map(),
    intelArtifacts: new Map(),
    districtReserves: options?.districtReserves ?? [],
  };
}
