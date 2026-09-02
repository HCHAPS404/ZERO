import type { HazardId, GraphNodeId } from "../ids.js";
import type { GeoPoint } from "./incident.js";

export type HazardKind =
  | "AFTERSHOCK_RISK"
  | "GAS_LEAK"
  | "STRUCTURAL_INSTABILITY"
  | "FLOODING"
  | "CHEMICAL_PLUME";

export type HazardRiskLevel = "LOW" | "MODERATE" | "HIGH" | "SEVERE";

export interface Hazard {
  readonly id: HazardId;
  readonly kind: HazardKind;
  readonly riskLevel: HazardRiskLevel;
  readonly centerLocation: GeoPoint;
  readonly radiusMeters: number;
  readonly affectedGraphNodeIds: readonly GraphNodeId[];
  readonly description: string;
}
