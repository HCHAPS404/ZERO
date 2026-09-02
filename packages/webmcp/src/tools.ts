import { z } from "zod";
import {
  CompareResponsePlansInputSchema,
  CorrelateSignalsInputSchema,
  FocusOperatorViewInputSchema,
  GenerateResponsePlansInputSchema,
  InspectEntityInputSchema,
  QueryOperationalGraphInputSchema,
  RunWhatIfSimulationInputSchema,
  StageResponsePlanInputSchema,
} from "@zero/contracts";
import { defineTool } from "./define-tool.js";
import type { ToolDefinition } from "./types.js";

const GetOperationalPictureSchema = z.object({ scenarioId: z.string().min(1) });
const ListUnverifiedSignalsSchema = z.object({ scenarioId: z.string().min(1) });

const UNVERIFIED_STATUSES = new Set(["OBSERVED", "CORROBORATED", "PROPOSED_FACT"]);

export const getOperationalPictureTool = defineTool(
  "get_operational_picture",
  "Read the current operational picture for a scenario: incident/resource counts, road status, hazards, unresolved signals, and the authoritative world version.",
  GetOperationalPictureSchema,
  (input, client) => client.get(`/api/scenarios/${input.scenarioId}/picture`),
);

export const inspectEntityTool = defineTool(
  "inspect_entity",
  "Inspect a single entity (incident, resource, facility, infrastructure asset, hazard, or signal) by id.",
  InspectEntityInputSchema,
  (input, client) =>
    client.get(`/api/scenarios/${input.scenarioId}/entities/${input.entityType}/${input.entityId}`),
);

export const queryOperationalGraphTool = defineTool(
  "query_operational_graph",
  "Query the road graph for a route between two graph nodes, honoring blocked/degraded roads and hazard penalties.",
  QueryOperationalGraphInputSchema,
  (input, client) =>
    client.get(
      `/api/scenarios/${input.scenarioId}/graph/route?from=${encodeURIComponent(input.fromGraphNodeId)}&to=${encodeURIComponent(input.toGraphNodeId)}`,
    ),
);

export const listUnverifiedSignalsTool = defineTool(
  "list_unverified_signals",
  "List signals that have not yet reached ACCEPTED or REJECTED trust disposition -- candidates for correlation or fact proposal.",
  ListUnverifiedSignalsSchema,
  async (input, client) => {
    const result = await client.get<Array<{ status: string }>>(`/api/scenarios/${input.scenarioId}/signals`);
    if (!result.ok) return result;
    return { ...result, data: result.data.filter((signal) => UNVERIFIED_STATUSES.has(signal.status)) };
  },
);

export const correlateSignalsTool = defineTool(
  "correlate_signals",
  "Mark two or more signals as corroborating one another, promoting their trust level from UNTRUSTED to CORROBORATED.",
  CorrelateSignalsInputSchema,
  (input, client) => client.post(`/api/scenarios/${input.scenarioId}/signals/correlate`, input),
);

export const simulateResponsePlanTool = defineTool(
  "simulate_response_plan",
  "Generate FASTEST/BALANCED/LOWEST_RISK response plans against a given world version. Plans are returned in SIMULATED status -- they are not staged or approved.",
  GenerateResponsePlansInputSchema,
  (input, client) => client.post(`/api/scenarios/${input.scenarioId}/plans/simulate`, input),
);

export const compareResponsePlansTool = defineTool(
  "compare_response_plans",
  "Compare two or more previously generated response plans side by side by their metrics and score.",
  CompareResponsePlansInputSchema,
  (input, client) => client.post(`/api/scenarios/${input.scenarioId}/plans/compare`, input),
);

export const runWhatIfTool = defineTool(
  "run_what_if",
  "Run a hypothetical mutation (e.g. block a road) against a cloned snapshot and compare baseline vs. simulated KPIs. Never mutates the authoritative world.",
  RunWhatIfSimulationInputSchema,
  (input, client) => client.post(`/api/scenarios/${input.scenarioId}/simulations/what-if`, input),
);

export const stageResponsePlanTool = defineTool(
  "stage_response_plan",
  "Validate a plan's hard constraints and its world-version freshness, then stage it for human approval (AWAITING_APPROVAL). Does NOT approve it.",
  StageResponsePlanInputSchema,
  (input, client) => client.post(`/api/scenarios/${input.scenarioId}/plans/${input.planId}/stage`, input),
);

export const focusOperatorViewTool = defineTool(
  "focus_operator_view",
  "Suggest that the human-facing Command Center focus on a specific entity. Read-only: does not mutate the world.",
  FocusOperatorViewInputSchema,
  (input, client) => client.post(`/api/scenarios/${input.scenarioId}/focus`, input),
);

/**
 * SECURITY INVARIANT: this is the complete WebMCP tool surface. There is no
 * approve_response_plan (or reject/apply-disruption/verify-operation) tool
 * here, and there never should be -- ApproveResponsePlan/RejectResponsePlan
 * are reachable only through the human-facing API/UI (see
 * apps/api/src/app.ts and docs/SECURITY.md). If you are tempted to add one,
 * don't -- add a human-facing UI action instead.
 */
export const ALL_TOOLS: readonly ToolDefinition<any, unknown>[] = [
  getOperationalPictureTool,
  inspectEntityTool,
  queryOperationalGraphTool,
  listUnverifiedSignalsTool,
  correlateSignalsTool,
  simulateResponsePlanTool,
  compareResponsePlansTool,
  runWhatIfTool,
  stageResponsePlanTool,
  focusOperatorViewTool,
];
