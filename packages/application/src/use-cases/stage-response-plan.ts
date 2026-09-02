import {
  asDomainEventId,
  asResponsePlanId,
  asScenarioId,
  canTransitionPlan,
  EntityNotFoundError,
  StaleWorldError,
  transitionPlan,
  type DomainEvent,
  type ResponsePlan,
} from "@zero/domain";
import { StageResponsePlanInputSchema, type StageResponsePlanInput } from "@zero/contracts";
import {
  extractOperationId,
  runPipeline,
  type CallerContext,
  type UseCaseContext,
  type UseCaseResult,
} from "../execution/pipeline.js";

/**
 * Staging is where SIMULATED -> VALIDATED -> STAGED -> AWAITING_APPROVAL
 * happen together: a plan is only worth presenting for human approval once
 * it has cleared hard-constraint validation and its basisWorldVersion is
 * still current. A plan computed against a now-superseded world is
 * INVALIDATED here rather than silently staged.
 */
export async function stageResponsePlan(
  rawInput: unknown,
  ctx: UseCaseContext,
  caller: CallerContext,
): Promise<UseCaseResult<ResponsePlan>> {
  return runPipeline<StageResponsePlanInput, ResponsePlan>({
    schema: StageResponsePlanInputSchema,
    rawInput,
    ctx,
    caller,
    operationId: extractOperationId(rawInput),
    handler: async (input, context) => {
      const scenarioId = asScenarioId(input.scenarioId);
      const plan = await context.scenarioRepository.getPlan(scenarioId, asResponsePlanId(input.planId));
      if (!plan) {
        throw new EntityNotFoundError("ResponsePlan", input.planId);
      }

      const world = await context.scenarioRepository.getWorld(scenarioId);
      const now = context.clock.now();

      if (world.version !== plan.basisWorldVersion) {
        // The plan may already be INVALIDATED (e.g. a prior ApplyDisruption
        // call already invalidated every non-terminal plan) -- only
        // transition it here if it hasn't already reached a terminal state.
        if (canTransitionPlan(plan.status, "INVALIDATED")) {
          await context.scenarioRepository.savePlan(transitionPlan(plan, "INVALIDATED", now));
        }
        throw new StaleWorldError(plan.basisWorldVersion, world.version);
      }

      let staged = transitionPlan(plan, "VALIDATED", now);
      staged = transitionPlan(staged, "STAGED", now);
      staged = transitionPlan(staged, "AWAITING_APPROVAL", now);
      await context.scenarioRepository.savePlan(staged);

      const events: DomainEvent[] = [
        {
          id: asDomainEventId(context.idGenerator.next("event")),
          type: "ResponsePlanStaged",
          scenarioId: input.scenarioId,
          worldVersion: world.version,
          occurredAt: now,
          payload: { planId: staged.id },
        },
      ];

      return { data: staged, action: "StageResponsePlan", subjectId: staged.id, events };
    },
  });
}
