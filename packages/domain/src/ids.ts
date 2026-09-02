/**
 * Branded identifier types. Branding prevents accidentally passing a
 * ResourceId where an IncidentId is expected, even though both are strings
 * at runtime.
 */
declare const brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type ScenarioId = Brand<string, "ScenarioId">;
export type IncidentId = Brand<string, "IncidentId">;
export type ResourceId = Brand<string, "ResourceId">;
export type CapabilityId = Brand<string, "CapabilityId">;
export type FacilityId = Brand<string, "FacilityId">;
export type InfrastructureAssetId = Brand<string, "InfrastructureAssetId">;
export type RoadSegmentId = Brand<string, "RoadSegmentId">;
export type GraphNodeId = Brand<string, "GraphNodeId">;
export type HazardId = Brand<string, "HazardId">;
export type SignalId = Brand<string, "SignalId">;
export type IntelArtifactId = Brand<string, "IntelArtifactId">;
export type ClaimId = Brand<string, "ClaimId">;
export type EvidenceId = Brand<string, "EvidenceId">;
export type ConstraintId = Brand<string, "ConstraintId">;
export type ResponsePlanId = Brand<string, "ResponsePlanId">;
export type PlanAssignmentId = Brand<string, "PlanAssignmentId">;
export type DecisionId = Brand<string, "DecisionId">;
export type OperationId = Brand<string, "OperationId">;
export type AuditEntryId = Brand<string, "AuditEntryId">;
export type DomainEventId = Brand<string, "DomainEventId">;
export type OperationIdempotencyId = Brand<string, "OperationIdempotencyId">;

function makeBrander<B extends string>(): (value: string) => Brand<string, B> {
  return (value: string) => value as Brand<string, B>;
}

export const asScenarioId = makeBrander<"ScenarioId">();
export const asIncidentId = makeBrander<"IncidentId">();
export const asResourceId = makeBrander<"ResourceId">();
export const asCapabilityId = makeBrander<"CapabilityId">();
export const asFacilityId = makeBrander<"FacilityId">();
export const asInfrastructureAssetId = makeBrander<"InfrastructureAssetId">();
export const asRoadSegmentId = makeBrander<"RoadSegmentId">();
export const asGraphNodeId = makeBrander<"GraphNodeId">();
export const asHazardId = makeBrander<"HazardId">();
export const asSignalId = makeBrander<"SignalId">();
export const asIntelArtifactId = makeBrander<"IntelArtifactId">();
export const asClaimId = makeBrander<"ClaimId">();
export const asEvidenceId = makeBrander<"EvidenceId">();
export const asConstraintId = makeBrander<"ConstraintId">();
export const asResponsePlanId = makeBrander<"ResponsePlanId">();
export const asPlanAssignmentId = makeBrander<"PlanAssignmentId">();
export const asDecisionId = makeBrander<"DecisionId">();
export const asOperationId = makeBrander<"OperationId">();
export const asAuditEntryId = makeBrander<"AuditEntryId">();
export const asDomainEventId = makeBrander<"DomainEventId">();
export const asOperationIdempotencyId = makeBrander<"OperationIdempotencyId">();
