import type {
  ResponsePlanId,
  PlanAssignmentId,
  ResourceId,
  IncidentId,
  ConstraintId,
} from "../ids.js";
import { InvalidStateTransitionError } from "../errors.js";

export type ResponsePlanStatus =
  | "DRAFT"
  | "SIMULATED"
  | "VALIDATED"
  | "STAGED"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "EXECUTING"
  | "COMPLETED"
  | "REJECTED"
  | "INVALIDATED"
  | "FAILED";

export type PlanStrategy = "FASTEST" | "BALANCED" | "LOWEST_RISK";

export interface PlanAssignment {
  readonly id: PlanAssignmentId;
  readonly resourceId: ResourceId;
  readonly incidentId: IncidentId;
  readonly routeSummary: {
    readonly etaSeconds: number;
    readonly distanceMeters: number;
    readonly hazardExposure: number;
    readonly roadSegmentIds: readonly string[];
  };
}

export type ConstraintKind =
  | "DISTRICT_RESERVE"
  | "CAPABILITY_REQUIRED"
  | "FACILITY_CAPACITY";

export interface Constraint {
  readonly id: ConstraintId;
  readonly kind: ConstraintKind;
  readonly description: string;
  /** Hard constraints must never be violated by a VALIDATED plan. */
  readonly hard: boolean;
}

export interface ConstraintViolation {
  readonly constraintId: ConstraintId;
  readonly description: string;
}

export interface PlanMetrics {
  readonly averageEtaSeconds: number;
  readonly criticalEtaSeconds: number;
  readonly resourceUtilization: number;
  readonly remainingReserveCoverage: number;
  readonly riskExposure: number;
}

export interface ResponsePlan {
  readonly id: ResponsePlanId;
  readonly scenarioId: string;
  readonly strategy: PlanStrategy;
  readonly status: ResponsePlanStatus;
  readonly basisWorldVersion: number;
  readonly assignments: readonly PlanAssignment[];
  readonly score: number;
  readonly metrics: PlanMetrics;
  readonly constraintViolations: readonly ConstraintViolation[];
  readonly explanationComponents: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

const ALLOWED_PLAN_TRANSITIONS: Record<
  ResponsePlanStatus,
  readonly ResponsePlanStatus[]
> = {
  DRAFT: ["SIMULATED", "INVALIDATED"],
  SIMULATED: ["VALIDATED", "INVALIDATED"],
  VALIDATED: ["STAGED", "INVALIDATED"],
  STAGED: ["AWAITING_APPROVAL", "INVALIDATED"],
  AWAITING_APPROVAL: ["APPROVED", "REJECTED", "INVALIDATED"],
  APPROVED: ["EXECUTING", "INVALIDATED"],
  EXECUTING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  REJECTED: [],
  INVALIDATED: [],
  FAILED: [],
};

export function canTransitionPlan(
  from: ResponsePlanStatus,
  to: ResponsePlanStatus,
): boolean {
  return ALLOWED_PLAN_TRANSITIONS[from].includes(to);
}

export function transitionPlan(
  plan: ResponsePlan,
  to: ResponsePlanStatus,
  updatedAt: string,
): ResponsePlan {
  if (!canTransitionPlan(plan.status, to)) {
    throw new InvalidStateTransitionError("ResponsePlan", plan.status, to);
  }
  if (to === "VALIDATED" && plan.constraintViolations.length > 0) {
    throw new InvalidStateTransitionError(
      "ResponsePlan",
      plan.status,
      `${to} (blocked by ${plan.constraintViolations.length} unresolved hard constraint violation(s))`,
    );
  }
  return { ...plan, status: to, updatedAt };
}
