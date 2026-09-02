import { asScenarioId, EntityNotFoundError } from "@zero/domain";
import { FocusOperatorViewInputSchema, type FocusOperatorViewInput } from "@zero/contracts";
import { runPipeline, type CallerContext, type UseCaseContext, type UseCaseResult } from "../execution/pipeline.js";

export interface FocusDirective {
  readonly entityType: FocusOperatorViewInput["entityType"];
  readonly entityId: string;
}

/**
 * A read-only nudge: it does not mutate the OperationalWorld. It tells the
 * human-facing Command Center which entity the agent believes is worth the
 * operator's attention right now (broadcast via the realtime room).
 */
export async function focusOperatorView(
  rawInput: unknown,
  ctx: UseCaseContext,
  caller: CallerContext,
): Promise<UseCaseResult<FocusDirective>> {
  return runPipeline<FocusOperatorViewInput, FocusDirective>({
    schema: FocusOperatorViewInputSchema,
    rawInput,
    ctx,
    caller,
    handler: async (input, context) => {
      const world = await context.scenarioRepository.getWorld(asScenarioId(input.scenarioId));
      const exists =
        world.incidents.has(input.entityId as never) ||
        world.resources.has(input.entityId as never) ||
        world.facilities.has(input.entityId as never) ||
        world.infrastructureAssets.has(input.entityId as never) ||
        world.hazards.has(input.entityId as never);
      if (!exists) {
        throw new EntityNotFoundError(input.entityType, input.entityId);
      }
      return {
        data: { entityType: input.entityType, entityId: input.entityId },
        action: "FocusOperatorView",
        subjectId: input.entityId,
      };
    },
  });
}
