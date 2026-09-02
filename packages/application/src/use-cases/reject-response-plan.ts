import {
  asDomainEventId,
  asResponsePlanId,
  asScenarioId,
  EntityNotFoundError,
  transitionPlan,
  type DomainEvent,
  type ResponsePlan,
} from "@zero/domain";
import { RejectResponsePlanInputSchema, type RejectResponsePlanInput } from "@zero/contracts";
import {
  extractOperationId,
  requireHumanCaller,
  runPipeline,
  type CallerContext,
  type UseCaseContext,
  type UseCaseResult,
} from "../execution/pipeline.js";

/** Rejection, like approval, is a human-only, non-WebMCP-reachable action. */
export async function rejectResponsePlan(
  rawInput: unknown,
  ctx: UseCaseContext,
  caller: CallerContext,
): Promise<UseCaseResult<ResponsePlan>> {
  return runPipeline<RejectResponsePlanInput, ResponsePlan>({
    schema: RejectResponsePlanInputSchema,
    rawInput,
    ctx,
    caller,
    operationId: extractOperationId(rawInput),
    policyCheck: requireHumanCaller,
    handler: async (input, context) => {
      const scenarioId = asScenarioId(input.scenarioId);
      const plan = await context.scenarioRepository.getPlan(scenarioId, asResponsePlanId(input.planId));
      if (!plan) {
        throw new EntityNotFoundError("ResponsePlan", input.planId);
      }
      const now = context.clock.now();
      const rejected = transitionPlan(plan, "REJECTED", now);
      await context.scenarioRepository.savePlan(rejected);

      const events: DomainEvent[] = [
        {
          id: asDomainEventId(context.idGenerator.next("event")),
          type: "ResponsePlanRejected",
          scenarioId: input.scenarioId,
          worldVersion: plan.basisWorldVersion,
          occurredAt: now,
          payload: { planId: rejected.id, actor: input.actor, reason: input.reason },
        },
      ];

      return { data: rejected, action: "RejectResponsePlan", subjectId: rejected.id, events };
    },
  });
}
