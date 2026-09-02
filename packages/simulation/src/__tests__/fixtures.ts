import {
  asCapabilityId,
  asFacilityId,
  asGraphNodeId,
  asIncidentId,
  asPlanAssignmentId,
  asResourceId,
  asResponsePlanId,
  asRoadSegmentId,
  asScenarioId,
  type GraphNode,
  type Incident,
  type OperationalSnapshot,
  type Resource,
  type ResponsePlan,
  type RoadSegment,
} from "@zero/domain";

export const CAP = asCapabilityId("cap-als");
export const BASE = asGraphNodeId("BASE");
export const SITE = asGraphNodeId("SITE");
export const ROAD_ID = asRoadSegmentId("BASE-SITE");

export function buildSimSnapshot(version = 3): OperationalSnapshot {
  const graphNodes = new Map<ReturnType<typeof asGraphNodeId>, GraphNode>([
    [BASE, { id: BASE, location: { lat: 0, lon: 0 }, label: "BASE" }],
    [SITE, { id: SITE, location: { lat: 0, lon: 0.02 }, label: "SITE" }],
  ]);

  const roadSegments = new Map<ReturnType<typeof asRoadSegmentId>, RoadSegment>([
    [
      ROAD_ID,
      {
        id: ROAD_ID,
        from: BASE,
        to: SITE,
        distanceMeters: 2000,
        baseTravelTimeSeconds: 150,
        status: "OPEN",
        hazardPenaltySeconds: 0,
        bidirectional: true,
      },
    ],
  ]);

  const resource: Resource = {
    id: asResourceId("amb-1"),
    kind: "ALS_AMBULANCE",
    name: "Medic 1",
    status: "AVAILABLE",
    capabilityIds: [CAP],
    currentGraphNodeId: BASE,
    homeFacilityId: asFacilityId("hospital-1"),
    districtId: "DISTRICT-1",
    location: { lat: 0, lon: 0 },
  };

  const incident: Incident = {
    id: asIncidentId("incident-1"),
    type: "MEDICAL_MASS_CASUALTY",
    status: "ACTIVE",
    severity: "HIGH",
    location: { lat: 0, lon: 0.02 },
    nearestGraphNodeId: SITE,
    requiredCapabilityIds: [CAP],
    casualtyEstimate: 4,
    reportedAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    description: "test incident",
  };

  return {
    scenarioId: asScenarioId("sim-scenario"),
    version,
    generatedAt: "2026-09-01T00:00:00.000Z",
    snapshotTakenAt: "2026-09-01T00:00:00.000Z",
    incidents: new Map([[incident.id, incident]]),
    resources: new Map([[resource.id, resource]]),
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

export function buildExistingPlan(): ResponsePlan {
  return {
    id: asResponsePlanId("plan-1"),
    scenarioId: "sim-scenario",
    strategy: "BALANCED",
    status: "AWAITING_APPROVAL",
    basisWorldVersion: 3,
    assignments: [
      {
        id: asPlanAssignmentId("assignment-1"),
        resourceId: asResourceId("amb-1"),
        incidentId: asIncidentId("incident-1"),
        routeSummary: {
          etaSeconds: 150,
          distanceMeters: 2000,
          hazardExposure: 0,
          roadSegmentIds: [ROAD_ID],
        },
      },
    ],
    score: 0.8,
    metrics: {
      averageEtaSeconds: 150,
      criticalEtaSeconds: 150,
      resourceUtilization: 1,
      remainingReserveCoverage: 1,
      riskExposure: 0,
    },
    constraintViolations: [],
    explanationComponents: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}
