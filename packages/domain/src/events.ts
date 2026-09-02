import type { DomainEventId } from "./ids.js";

export type DomainEventType =
  | "SignalReceived"
  | "SignalCorroborated"
  | "OperationalFactAccepted"
  | "IncidentReported"
  | "IncidentUpdated"
  | "InfrastructureBlocked"
  | "InfrastructureReopened"
  | "ResponsePlanGenerated"
  | "ResponsePlanStaged"
  | "ResponsePlanApproved"
  | "ResponsePlanRejected"
  | "ResponsePlanInvalidated"
  | "OperationStarted"
  | "OperationCompleted";

export interface DomainEvent<
  TType extends DomainEventType = DomainEventType,
  TPayload = Readonly<Record<string, unknown>>,
> {
  readonly id: DomainEventId;
  readonly type: TType;
  readonly scenarioId: string;
  readonly worldVersion: number;
  readonly occurredAt: string;
  readonly payload: TPayload;
  /** Set when the mutation originated from an idempotent command. */
  readonly operationId?: string;
}
