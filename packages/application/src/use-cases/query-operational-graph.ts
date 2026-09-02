import { asGraphNodeId, asScenarioId, createOperationalSnapshot } from "@zero/domain";
import { QueryOperationalGraphInputSchema, type QueryOperationalGraphInput } from "@zero/contracts";
import type { RouteOutcome, RoutingEnginePort } from "../ports/index.js";
import { runPipeline, type CallerContext, type UseCaseContext, type UseCaseResult } from "../execution/pipeline.js";

export async function queryOperationalGraph(
  rawInput: unknown,
  ctx: UseCaseContext,
  caller: CallerContext,
  routingEngine: RoutingEnginePort,
): Promise<UseCaseResult<RouteOutcome>> {
  return runPipeline<QueryOperationalGraphInput, RouteOutcome>({
    schema: QueryOperationalGraphInputSchema,
    rawInput,
    ctx,
    caller,
    handler: async (input, context) => {
      const world = await context.scenarioRepository.getWorld(asScenarioId(input.scenarioId));
      const snapshot = createOperationalSnapshot(world, context.clock.now());
      const outcome = routingEngine.findRoute(
        snapshot,
        asGraphNodeId(input.fromGraphNodeId),
        asGraphNodeId(input.toGraphNodeId),
      );
      return { data: outcome, action: "QueryOperationalGraph", subjectId: input.toGraphNodeId };
    },
  });
}
