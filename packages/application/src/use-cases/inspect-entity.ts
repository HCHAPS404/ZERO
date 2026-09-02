import { asScenarioId, EntityNotFoundError } from "@zero/domain";
import { InspectEntityInputSchema, type InspectEntityInput } from "@zero/contracts";
import { runPipeline, type CallerContext, type UseCaseContext, type UseCaseResult } from "../execution/pipeline.js";

export type InspectableEntity = unknown;

export async function inspectEntity(
  rawInput: unknown,
  ctx: UseCaseContext,
  caller: CallerContext,
): Promise<UseCaseResult<InspectableEntity>> {
  return runPipeline<InspectEntityInput, InspectableEntity>({
    schema: InspectEntityInputSchema,
    rawInput,
    ctx,
    caller,
    handler: async (input, context) => {
      const world = await context.scenarioRepository.getWorld(asScenarioId(input.scenarioId));
      const entity = lookup(world, input.entityType, input.entityId);
      if (!entity) {
        throw new EntityNotFoundError(input.entityType, input.entityId);
      }
      return { data: entity, action: "InspectEntity", subjectId: input.entityId };
    },
  });
}

function lookup(
  world: Awaited<ReturnType<UseCaseContext["scenarioRepository"]["getWorld"]>>,
  entityType: InspectEntityInput["entityType"],
  entityId: string,
): InspectableEntity | undefined {
  switch (entityType) {
    case "INCIDENT":
      return world.incidents.get(entityId as never);
    case "RESOURCE":
      return world.resources.get(entityId as never);
    case "FACILITY":
      return world.facilities.get(entityId as never);
    case "INFRASTRUCTURE_ASSET":
      return world.infrastructureAssets.get(entityId as never);
    case "HAZARD":
      return world.hazards.get(entityId as never);
    case "SIGNAL":
      return world.signals.get(entityId as never);
    default:
      return undefined;
  }
}
