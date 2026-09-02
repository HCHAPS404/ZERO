import { z } from "zod";
import { WhatIfMutationSchema } from "./mutations.js";

const scenarioId = z.string().min(1);
const operationId = z.string().min(1);
const strategy = z.enum(["FASTEST", "BALANCED", "LOWEST_RISK"]);

export const GetOperationalPictureInputSchema = z.object({
  scenarioId,
});
export type GetOperationalPictureInput = z.infer<typeof GetOperationalPictureInputSchema>;

export const InspectEntityInputSchema = z.object({
  scenarioId,
  entityType: z.enum([
    "INCIDENT",
    "RESOURCE",
    "FACILITY",
    "INFRASTRUCTURE_ASSET",
    "HAZARD",
    "SIGNAL",
  ]),
  entityId: z.string().min(1),
});
export type InspectEntityInput = z.infer<typeof InspectEntityInputSchema>;

export const QueryOperationalGraphInputSchema = z.object({
  scenarioId,
  fromGraphNodeId: z.string().min(1),
  toGraphNodeId: z.string().min(1),
});
export type QueryOperationalGraphInput = z.infer<typeof QueryOperationalGraphInputSchema>;

export const ListSignalsInputSchema = z.object({
  scenarioId,
  status: z.enum(["OBSERVED", "CORROBORATED", "PROPOSED_FACT", "ACCEPTED", "REJECTED"]).optional(),
});
export type ListSignalsInput = z.infer<typeof ListSignalsInputSchema>;

export const CorrelateSignalsInputSchema = z.object({
  scenarioId,
  signalIds: z.array(z.string().min(1)).min(2),
});
export type CorrelateSignalsInput = z.infer<typeof CorrelateSignalsInputSchema>;

export const ProposeOperationalFactInputSchema = z.object({
  scenarioId,
  claimText: z.string().min(1),
  relatedIncidentId: z.string().min(1).optional(),
  supportingSignalIds: z.array(z.string().min(1)).min(1),
});
export type ProposeOperationalFactInput = z.infer<typeof ProposeOperationalFactInputSchema>;

export const GenerateResponsePlansInputSchema = z.object({
  scenarioId,
  basisWorldVersion: z.number().int().nonnegative(),
  incidentIds: z.array(z.string().min(1)).optional(),
  strategies: z.array(strategy).optional(),
});
export type GenerateResponsePlansInput = z.infer<typeof GenerateResponsePlansInputSchema>;

export const CompareResponsePlansInputSchema = z.object({
  scenarioId,
  planIds: z.array(z.string().min(1)).min(2),
});
export type CompareResponsePlansInput = z.infer<typeof CompareResponsePlansInputSchema>;

export const RunWhatIfSimulationInputSchema = z.object({
  scenarioId,
  mutations: z.array(WhatIfMutationSchema).min(1),
});
export type RunWhatIfSimulationInput = z.infer<typeof RunWhatIfSimulationInputSchema>;

export const StageResponsePlanInputSchema = z.object({
  scenarioId,
  planId: z.string().min(1),
  operationId,
});
export type StageResponsePlanInput = z.infer<typeof StageResponsePlanInputSchema>;

export const ApproveResponsePlanInputSchema = z.object({
  scenarioId,
  planId: z.string().min(1),
  actor: z.string().min(1),
  operationId,
});
export type ApproveResponsePlanInput = z.infer<typeof ApproveResponsePlanInputSchema>;

export const RejectResponsePlanInputSchema = z.object({
  scenarioId,
  planId: z.string().min(1),
  actor: z.string().min(1),
  reason: z.string().min(1),
  operationId,
});
export type RejectResponsePlanInput = z.infer<typeof RejectResponsePlanInputSchema>;

export const ApplyDisruptionInputSchema = z.object({
  scenarioId,
  mutation: WhatIfMutationSchema,
  operationId,
});
export type ApplyDisruptionInput = z.infer<typeof ApplyDisruptionInputSchema>;

export const VerifyOperationInputSchema = z.object({
  scenarioId,
  /** The Operation entity being verified/closed out. */
  targetOperationId: z.string().min(1),
  /** Idempotency key for this mutating command, per section 17. */
  operationId,
});
export type VerifyOperationInput = z.infer<typeof VerifyOperationInputSchema>;

export const FocusOperatorViewInputSchema = z.object({
  scenarioId,
  entityType: z.enum(["INCIDENT", "RESOURCE", "FACILITY", "INFRASTRUCTURE_ASSET", "HAZARD"]),
  entityId: z.string().min(1),
});
export type FocusOperatorViewInput = z.infer<typeof FocusOperatorViewInputSchema>;
