import type { ScenarioId, IncidentId, ResourceId, CapabilityId, FacilityId, InfrastructureAssetId, RoadSegmentId, GraphNodeId, HazardId, SignalId, IntelArtifactId } from "./ids.js";
import type { Incident } from "./entities/incident.js";
import type { Resource, Capability, ResourceKind } from "./entities/resource.js";
import type { Facility, InfrastructureAsset, RoadSegment, GraphNode, RoadStatus } from "./entities/facility.js";
import type { Hazard } from "./entities/hazard.js";
import type { Signal, IntelArtifact } from "./entities/signal.js";
import { StaleWorldError } from "./errors.js";

/**
 * A district-level operational floor: at least `minimumAvailable` resources
 * of `resourceKind` must remain AVAILABLE within `districtId` at all times.
 * Enforced by the planner as a hard constraint.
 */
export interface DistrictReserveConstraint {
  readonly districtId: string;
  readonly resourceKind: ResourceKind;
  readonly minimumAvailable: number;
}

export type WorldVersion = number;

/**
 * OperationalWorld is the single authoritative representation of the
 * operational picture. It is never mutated in place -- every meaningful
 * change produces a new OperationalWorld with `version` incremented, so
 * that plans and simulations computed against an older version can be
 * detected as stale (see assertWorldVersion / StaleWorldError).
 */
export interface OperationalWorld {
  readonly scenarioId: ScenarioId;
  readonly version: WorldVersion;
  readonly generatedAt: string;
  readonly incidents: ReadonlyMap<IncidentId, Incident>;
  readonly resources: ReadonlyMap<ResourceId, Resource>;
  readonly capabilities: ReadonlyMap<CapabilityId, Capability>;
  readonly facilities: ReadonlyMap<FacilityId, Facility>;
  readonly infrastructureAssets: ReadonlyMap<InfrastructureAssetId, InfrastructureAsset>;
  readonly roadSegments: ReadonlyMap<RoadSegmentId, RoadSegment>;
  readonly graphNodes: ReadonlyMap<GraphNodeId, GraphNode>;
  readonly hazards: ReadonlyMap<HazardId, Hazard>;
  readonly signals: ReadonlyMap<SignalId, Signal>;
  readonly intelArtifacts: ReadonlyMap<IntelArtifactId, IntelArtifact>;
  readonly districtReserves: readonly DistrictReserveConstraint[];
}

/**
 * An immutable, point-in-time read-only copy of the world handed to
 * planners, simulations and read-side use cases. It can never be written
 * back through world-mutation helpers -- only OperationalWorld can.
 */
export interface OperationalSnapshot extends OperationalWorld {
  readonly snapshotTakenAt: string;
}

export function createOperationalSnapshot(
  world: OperationalWorld,
  now: string,
): OperationalSnapshot {
  return { ...world, snapshotTakenAt: now };
}

export function assertWorldVersion(
  world: OperationalWorld,
  expectedVersion: WorldVersion,
): void {
  if (world.version !== expectedVersion) {
    throw new StaleWorldError(expectedVersion, world.version);
  }
}

function bump(world: OperationalWorld, now: string): Pick<OperationalWorld, "version" | "generatedAt"> {
  return { version: world.version + 1, generatedAt: now };
}

export function upsertIncident(
  world: OperationalWorld,
  incident: Incident,
  now: string,
): OperationalWorld {
  const incidents = new Map(world.incidents);
  incidents.set(incident.id, incident);
  return { ...world, ...bump(world, now), incidents };
}

export function upsertResource(
  world: OperationalWorld,
  resource: Resource,
  now: string,
): OperationalWorld {
  const resources = new Map(world.resources);
  resources.set(resource.id, resource);
  return { ...world, ...bump(world, now), resources };
}

export function setRoadSegmentStatus(
  world: OperationalWorld,
  roadSegmentId: RoadSegmentId,
  status: RoadStatus,
  now: string,
): OperationalWorld {
  const existing = world.roadSegments.get(roadSegmentId);
  if (!existing) {
    return world;
  }
  const roadSegments = new Map(world.roadSegments);
  roadSegments.set(roadSegmentId, { ...existing, status });
  return { ...world, ...bump(world, now), roadSegments };
}

export function setInfrastructureAssetStatus(
  world: OperationalWorld,
  assetId: InfrastructureAssetId,
  status: InfrastructureAsset["status"],
  now: string,
): OperationalWorld {
  const existing = world.infrastructureAssets.get(assetId);
  if (!existing) {
    return world;
  }
  const infrastructureAssets = new Map(world.infrastructureAssets);
  infrastructureAssets.set(assetId, { ...existing, status });
  return { ...world, ...bump(world, now), infrastructureAssets };
}

export function upsertSignal(
  world: OperationalWorld,
  signal: Signal,
  now: string,
): OperationalWorld {
  const signals = new Map(world.signals);
  signals.set(signal.id, signal);
  return { ...world, ...bump(world, now), signals };
}

export function upsertIntelArtifact(
  world: OperationalWorld,
  artifact: IntelArtifact,
  now: string,
): OperationalWorld {
  const intelArtifacts = new Map(world.intelArtifacts);
  intelArtifacts.set(artifact.id, artifact);
  return { ...world, ...bump(world, now), intelArtifacts };
}
