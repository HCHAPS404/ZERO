import type { ResourceId, CapabilityId, FacilityId } from "../ids.js";
import type { GeoPoint } from "./incident.js";

export type ResourceStatus =
  | "AVAILABLE"
  | "EN_ROUTE"
  | "ON_SCENE"
  | "OUT_OF_SERVICE";

export type ResourceKind =
  | "ALS_AMBULANCE"
  | "BLS_AMBULANCE"
  | "FIRE_ENGINE"
  | "USAR_TEAM"
  | "RECON_DRONE";

export interface Capability {
  readonly id: CapabilityId;
  readonly name: string;
  readonly description: string;
}

export interface Resource {
  readonly id: ResourceId;
  readonly kind: ResourceKind;
  readonly name: string;
  readonly status: ResourceStatus;
  readonly capabilityIds: readonly CapabilityId[];
  readonly currentGraphNodeId: string;
  readonly homeFacilityId: FacilityId;
  readonly districtId: string;
  readonly location: GeoPoint;
}
