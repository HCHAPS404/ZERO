import type { IncidentId, CapabilityId } from "../ids.js";
import { InvalidStateTransitionError } from "../errors.js";

export type IncidentStatus =
  | "REPORTED"
  | "VALIDATED"
  | "ACTIVE"
  | "STABILIZED"
  | "RESOLVED";

export type IncidentSeverity = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type IncidentType =
  | "STRUCTURE_COLLAPSE"
  | "FIRE"
  | "MEDICAL_MASS_CASUALTY"
  | "HAZMAT"
  | "INFRASTRUCTURE_FAILURE"
  | "SEARCH_AND_RESCUE";

export interface GeoPoint {
  readonly lat: number;
  readonly lon: number;
}

export interface Incident {
  readonly id: IncidentId;
  readonly type: IncidentType;
  readonly status: IncidentStatus;
  readonly severity: IncidentSeverity;
  readonly location: GeoPoint;
  readonly nearestGraphNodeId: string;
  readonly requiredCapabilityIds: readonly CapabilityId[];
  readonly casualtyEstimate: number;
  readonly reportedAt: string;
  readonly updatedAt: string;
  readonly description: string;
}

const ALLOWED_TRANSITIONS: Record<IncidentStatus, readonly IncidentStatus[]> = {
  REPORTED: ["VALIDATED"],
  VALIDATED: ["ACTIVE"],
  ACTIVE: ["STABILIZED"],
  STABILIZED: ["RESOLVED", "ACTIVE"],
  RESOLVED: [],
};

export function canTransitionIncident(
  from: IncidentStatus,
  to: IncidentStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function transitionIncident(
  incident: Incident,
  to: IncidentStatus,
  updatedAt: string,
): Incident {
  if (!canTransitionIncident(incident.status, to)) {
    throw new InvalidStateTransitionError("Incident", incident.status, to);
  }
  return { ...incident, status: to, updatedAt };
}
