import {
  asDomainEventId,
  asScenarioId,
  asSignalId,
  corroborate,
  EntityNotFoundError,
  upsertSignal,
  type DomainEvent,
  type Signal,
} from "@zero/domain";
import { CorrelateSignalsInputSchema, type CorrelateSignalsInput } from "@zero/contracts";
import {
  extractOperationId,
  runPipeline,
  type CallerContext,
  type UseCaseContext,
  type UseCaseResult,
} from "../execution/pipeline.js";

export async function correlateSignals(
  rawInput: unknown,
  ctx: UseCaseContext,
  caller: CallerContext,
): Promise<UseCaseResult<readonly Signal[]>> {
  return runPipeline<CorrelateSignalsInput, readonly Signal[]>({
    schema: CorrelateSignalsInputSchema,
    rawInput,
    ctx,
    operationId: extractOperationId(rawInput),
    caller,
    handler: async (input, context) => {
      const scenarioId = asScenarioId(input.scenarioId);
      let world = await context.scenarioRepository.getWorld(scenarioId);
      const now = context.clock.now();
      const events: DomainEvent[] = [];
      const correlated: Signal[] = [];

      for (const rawId of input.signalIds) {
        const signalId = asSignalId(rawId);
        const signal = world.signals.get(signalId);
        if (!signal) {
          throw new EntityNotFoundError("Signal", rawId);
        }
        const otherIds = input.signalIds.filter((id) => id !== rawId).map(asSignalId);
        let updated = signal;
        for (const otherId of otherIds) {
          updated = corroborate(updated, otherId);
        }
        world = upsertSignal(world, updated, now);
        correlated.push(updated);
        events.push({
          id: asDomainEventId(context.idGenerator.next("event")),
          type: "SignalCorroborated",
          scenarioId: input.scenarioId,
          worldVersion: world.version,
          occurredAt: now,
          payload: { signalId: rawId, corroboratingSignalIds: otherIds },
        });
      }

      await context.scenarioRepository.saveWorld(world);
      return {
        data: correlated,
        action: "CorrelateSignals",
        subjectId: input.signalIds.join(","),
        events,
      };
    },
  });
}
