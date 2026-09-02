import {
  asDomainEventId,
  asOperationId,
  asResponsePlanId,
  asScenarioId,
  EntityNotFoundError,
  transitionPlan,
  type DomainEvent,
  type Operation,
  type ResponsePlan,
} from "@zero/domain";
import { ApproveResponsePlanInputSchema, type ApproveResponsePlanInput } from "@zero/contracts";
import {
  extractOperationId,
  requireHumanCaller,
  runPipeline,
  type CallerContext,
  type UseCaseContext,
  type UseCaseResult,
} from "../execution/pipeline.js";

export interface ApprovalOutcome {
  readonly plan: ResponsePlan;
  readonly operation: Operation;
}

/**
 * SECURITY INVARIANT: this use case is the only path through which a
 * ResponsePlan becomes APPROVED / EXECUTING. It is guarded by
 * requireHumanCaller and, critically, is never registered as a WebMCP tool
 * -- see packages/webmcp. There is no "approve_response_plan" capability
 * reachable by a browser agent.
 */
export async function approveResponsePlan(
  rawInput: unknown,
  ctx: UseCaseContext,
  caller: CallerContext,
): Promise<UseCaseResult<ApprovalOutcome>> {
  return runPipeline<ApproveResponsePlanInput, ApprovalOutcome>({
    schema: ApproveResponsePlanInputSchema,
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

      let approved = transitionPlan(plan, "APPROVED", now);
      approved = transitionPlan(approved, "EXECUTING", now);
      await context.scenarioRepository.savePlan(approved);

      const operation: Operation = {
        id: asOperationId(context.idGenerator.next("operation")),
        responsePlanId: approved.id,
        status: "STARTED",
        startedAt: now,
      };
      await context.scenarioRepository.saveOperation(operation);

      const events: DomainEvent[] = [
        {
          id: asDomainEventId(context.idGenerator.next("event")),
          type: "ResponsePlanApproved",
          scenarioId: input.scenarioId,
          worldVersion: plan.basisWorldVersion,
          occurredAt: now,
          payload: { planId: approved.id, actor: input.actor },
        },
        {
          id: asDomainEventId(context.idGenerator.next("event")),
          type: "OperationStarted",
          scenarioId: input.scenarioId,
          worldVersion: plan.basisWorldVersion,
          occurredAt: now,
          payload: { operationId: operation.id, planId: approved.id },
        },
      ];

      return {
        data: { plan: approved, operation },
        action: "ApproveResponsePlan",
        subjectId: approved.id,
        events,
      };
    },
  });
}
