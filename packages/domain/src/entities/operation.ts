import type {
  OperationId,
  ResponsePlanId,
  DecisionId,
  AuditEntryId,
} from "../ids.js";

export type OperationStatus = "STARTED" | "COMPLETED" | "FAILED";

export interface Operation {
  readonly id: OperationId;
  readonly responsePlanId: ResponsePlanId;
  readonly status: OperationStatus;
  readonly startedAt: string;
  readonly completedAt?: string;
}

export type DecisionKind =
  | "APPROVE_RESPONSE_PLAN"
  | "REJECT_RESPONSE_PLAN"
  | "ACCEPT_OPERATIONAL_FACT"
  | "REJECT_OPERATIONAL_FACT";

/** Decisions record the human actor who made a consequential call. */
export interface Decision {
  readonly id: DecisionId;
  readonly kind: DecisionKind;
  readonly actor: string;
  readonly subjectId: string;
  readonly rationale?: string;
  readonly decidedAt: string;
}

export interface AuditEntry {
  readonly id: AuditEntryId;
  readonly actor: string;
  readonly actorKind: "HUMAN" | "AGENT" | "SYSTEM";
  readonly action: string;
  readonly subjectId: string;
  readonly occurredAt: string;
  readonly operationId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
