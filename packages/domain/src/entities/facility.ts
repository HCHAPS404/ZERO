import type {
  FacilityId,
  InfrastructureAssetId,
  RoadSegmentId,
  GraphNodeId,
} from "../ids.js";
import type { GeoPoint } from "./incident.js";

export type FacilityKind = "HOSPITAL" | "SHELTER" | "STAGING_AREA" | "DEPOT";

export interface Facility {
  readonly id: FacilityId;
  readonly kind: FacilityKind;
  readonly name: string;
  readonly graphNodeId: string;
  readonly location: GeoPoint;
  /** For hospitals: remaining bed/trauma capacity. For shelters: remaining occupancy. */
  readonly capacity: number;
  readonly capacityUsed: number;
}

export type InfrastructureAssetKind =
  | "BRIDGE"
  | "POWER_SUBSTATION"
  | "WATER_TREATMENT"
  | "COMMUNICATIONS_TOWER";

export type InfrastructureStatus = "OPERATIONAL" | "DEGRADED" | "FAILED";

export interface InfrastructureAsset {
  readonly id: InfrastructureAssetId;
  readonly kind: InfrastructureAssetKind;
  readonly name: string;
  readonly status: InfrastructureStatus;
  readonly graphNodeId: string;
  readonly location: GeoPoint;
}

export type RoadStatus = "OPEN" | "DEGRADED" | "BLOCKED";

export interface RoadSegment {
  readonly id: RoadSegmentId;
  readonly from: GraphNodeId;
  readonly to: GraphNodeId;
  readonly distanceMeters: number;
  readonly baseTravelTimeSeconds: number;
  readonly status: RoadStatus;
  readonly hazardPenaltySeconds: number;
  readonly bidirectional: boolean;
}

export interface GraphNode {
  readonly id: GraphNodeId;
  readonly location: GeoPoint;
  readonly label: string;
}
