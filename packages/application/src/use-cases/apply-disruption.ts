import {
  asDomainEventId,
  asInfrastructureAssetId,
  asRoadSegmentId,
  asScenarioId,
  setInfrastructureAssetStatus,
  setRoadSegmentStatus,
  transitionPlan,
  type DomainEvent,
  type OperationalWorld,
  type ResponsePlan,
} from "@zero/domain";
import { ApplyDisruptionInputSchema, type ApplyDisruptionInput } from "@zero/contracts";
import {
  extractOperationId,
  runPipeline,
  type CallerContext,
  type UseCaseContext,
  type UseCaseResult,
} from "../execution/pipeline.js";

export interface DisruptionOutcome {
  readonly world: OperationalWorld;
  readonly invalidatedPlanIds: readonly string[];
}

const NON_TERMINAL_PLAN_STATUSES: readonly ResponsePlan["status"][] = [
  "DRAFT",
  "SIMULATED",
  "VALIDATED",
  "STAGED",
  "AWAITING_APPROVAL",
];

/**
 * Applies a mutation to the AUTHORITATIVE OperationalWorld (unlike
 * RunWhatIfSimulation, which only ever touches a cloned snapshot). This is
 * a human/API-only capability -- it is deliberately absent from the
 * WebMCP tool surface.
 */
export async function applyDisruption(
  rawInput: unknown,
  ctx: UseCaseContext,
  caller: CallerContext,
): Promise<UseCaseResult<DisruptionOutcome>> {
  return runPipeline<ApplyDisruptionInput, DisruptionOutcome>({
    schema: ApplyDisruptionInputSchema,
    rawInput,
    ctx,
    caller,
    operationId: extractOperationId(rawInput),
    handler: async (input, context) => {
      const scenarioId = asScenarioId(input.scenarioId);
      let world = await context.scenarioRepository.getWorld(scenarioId);
      const now = context.clock.now();
      const { mutation } = input;

      let eventType: DomainEvent["type"];
      let payload: Record<string, unknown>;

      switch (mutation.kind) {
        case "BLOCK_ROAD":
          world = setRoadSegmentStatus(world, asRoadSegmentId(mutation.roadSegmentId), "BLOCKED", now);
          eventType = "InfrastructureBlocked";
          payload = { roadSegmentId: mutation.roadSegmentId };
          break;
        case "DEGRADE_ROAD":
          world = setRoadSegmentStatus(world, asRoadSegmentId(mutation.roadSegmentId), "DEGRADED", now);
          eventType = "InfrastructureBlocked";
          payload = { roadSegmentId: mutation.roadSegmentId, degraded: true };
          break;
        case "REOPEN_ROAD":
          world = setRoadSegmentStatus(world, asRoadSegmentId(mutation.roadSegmentId), "OPEN", now);
          eventType = "InfrastructureReopened";
          payload = { roadSegmentId: mutation.roadSegmentId };
          break;
        case "FAIL_INFRASTRUCTURE":
          world = setInfrastructureAssetStatus(
            world,
            asInfrastructureAssetId(mutation.infrastructureAssetId),
            "FAILED",
            now,
          );
          eventType = "InfrastructureBlocked";
          payload = { infrastructureAssetId: mutation.infrastructureAssetId };
          break;
      }

      await context.scenarioRepository.saveWorld(world);

      const plans = await context.scenarioRepository.listPlans(scenarioId);
      const invalidatedPlanIds: string[] = [];
      for (const plan of plans) {
        if (NON_TERMINAL_PLAN_STATUSES.includes(plan.status)) {
          const invalidated = transitionPlan(plan, "INVALIDATED", now);
          await context.scenarioRepository.savePlan(invalidated);
          invalidatedPlanIds.push(invalidated.id);
        }
      }

      const events: DomainEvent[] = [
        {
          id: asDomainEventId(context.idGenerator.next("event")),
          type: eventType,
          scenarioId: input.scenarioId,
          worldVersion: world.version,
          occurredAt: now,
          payload,
        },
        ...invalidatedPlanIds.map<DomainEvent>((planId) => ({
          id: asDomainEventId(context.idGenerator.next("event")),
          type: "ResponsePlanInvalidated",
          scenarioId: input.scenarioId,
          worldVersion: world.version,
          occurredAt: now,
          payload: { planId },
        })),
      ];

      return {
        data: { world, invalidatedPlanIds },
        action: "ApplyDisruption",
        subjectId: input.scenarioId,
        events,
      };
    },
  });
}
