import {
  asDomainEventId,
  asOperationId,
  asResponsePlanId,
  asScenarioId,
  EntityNotFoundError,
  transitionPlan,
  type DomainEvent,
  type Operation,
} from "@zero/domain";
import { VerifyOperationInputSchema, type VerifyOperationInput } from "@zero/contracts";
import {
  extractOperationId,
  runPipeline,
  type CallerContext,
  type UseCaseContext,
  type UseCaseResult,
} from "../execution/pipeline.js";

export async function verifyOperation(
  rawInput: unknown,
  ctx: UseCaseContext,
  caller: CallerContext,
): Promise<UseCaseResult<Operation>> {
  return runPipeline<VerifyOperationInput, Operation>({
    schema: VerifyOperationInputSchema,
    rawInput,
    ctx,
    caller,
    operationId: extractOperationId(rawInput),
    handler: async (input, context) => {
      const scenarioId = asScenarioId(input.scenarioId);
      const operation = await context.scenarioRepository.getOperation(
        scenarioId,
        asOperationId(input.targetOperationId),
      );
      if (!operation) {
        throw new EntityNotFoundError("Operation", input.targetOperationId);
      }
      const now = context.clock.now();
      const completed: Operation = { ...operation, status: "COMPLETED", completedAt: now };
      await context.scenarioRepository.saveOperation(completed);

      const plan = await context.scenarioRepository.getPlan(
        scenarioId,
        asResponsePlanId(operation.responsePlanId),
      );
      if (plan && plan.status === "EXECUTING") {
        await context.scenarioRepository.savePlan(transitionPlan(plan, "COMPLETED", now));
      }

      const events: DomainEvent[] = [
        {
          id: asDomainEventId(context.idGenerator.next("event")),
          type: "OperationCompleted",
          scenarioId: input.scenarioId,
          worldVersion: 0,
          occurredAt: now,
          payload: { operationId: completed.id },
        },
      ];

      return { data: completed, action: "VerifyOperation", subjectId: completed.id, events };
    },
  });
}
