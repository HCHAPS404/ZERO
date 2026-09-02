import {
  asDomainEventId,
  asScenarioId,
  assertWorldVersion,
  createOperationalSnapshot,
  transitionPlan,
  type DomainEvent,
  type ResponsePlan,
} from "@zero/domain";
import { GenerateResponsePlansInputSchema, type GenerateResponsePlansInput } from "@zero/contracts";
import type { ResponsePlannerPort } from "../ports/index.js";
import { runPipeline, type CallerContext, type UseCaseContext, type UseCaseResult } from "../execution/pipeline.js";

/**
 * Generates plans against an explicit basisWorldVersion. If the current
 * world has already moved on, this fails fast with STALE_WORLD rather than
 * silently planning against outdated facts.
 */
export async function generateResponsePlans(
  rawInput: unknown,
  ctx: UseCaseContext,
  caller: CallerContext,
  planner: ResponsePlannerPort,
): Promise<UseCaseResult<readonly ResponsePlan[]>> {
  return runPipeline<GenerateResponsePlansInput, readonly ResponsePlan[]>({
    schema: GenerateResponsePlansInputSchema,
    rawInput,
    ctx,
    caller,
    handler: async (input, context) => {
      const scenarioId = asScenarioId(input.scenarioId);
      const world = await context.scenarioRepository.getWorld(scenarioId);
      assertWorldVersion(world, input.basisWorldVersion);
      const snapshot = createOperationalSnapshot(world, context.clock.now());

      const draftPlans = planner.generatePlans(snapshot, {
        ...(input.incidentIds ? { incidentIds: input.incidentIds } : {}),
        ...(input.strategies ? { strategies: input.strategies } : {}),
      });

      const now = context.clock.now();
      const simulatedPlans = draftPlans.map((plan) => transitionPlan(plan, "SIMULATED", now));

      for (const plan of simulatedPlans) {
        await context.scenarioRepository.savePlan(plan);
      }

      const events: DomainEvent[] = simulatedPlans.map((plan) => ({
        id: asDomainEventId(context.idGenerator.next("event")),
        type: "ResponsePlanGenerated",
        scenarioId: input.scenarioId,
        worldVersion: world.version,
        occurredAt: now,
        payload: { planId: plan.id, strategy: plan.strategy, score: plan.score },
      }));

      return {
        data: simulatedPlans,
        action: "GenerateResponsePlans",
        subjectId: input.scenarioId,
        events,
      };
    },
  });
}
