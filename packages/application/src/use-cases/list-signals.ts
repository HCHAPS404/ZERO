import { asScenarioId, type Signal } from "@zero/domain";
import { ListSignalsInputSchema, type ListSignalsInput } from "@zero/contracts";
import { runPipeline, type CallerContext, type UseCaseContext, type UseCaseResult } from "../execution/pipeline.js";

export async function listSignals(
  rawInput: unknown,
  ctx: UseCaseContext,
  caller: CallerContext,
): Promise<UseCaseResult<readonly Signal[]>> {
  return runPipeline<ListSignalsInput, readonly Signal[]>({
    schema: ListSignalsInputSchema,
    rawInput,
    ctx,
    caller,
    handler: async (input, context) => {
      const world = await context.scenarioRepository.getWorld(asScenarioId(input.scenarioId));
      const signals = [...world.signals.values()].filter(
        (signal) => !input.status || signal.status === input.status,
      );
      return { data: signals, action: "ListSignals", subjectId: input.scenarioId };
    },
  });
}
