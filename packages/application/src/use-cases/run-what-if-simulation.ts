import { asScenarioId, createOperationalSnapshot } from "@zero/domain";
import { RunWhatIfSimulationInputSchema, type RunWhatIfSimulationInput } from "@zero/contracts";
import type { WhatIfSimulationPort, WhatIfSimulationResult } from "../ports/index.js";
import { runPipeline, type CallerContext, type UseCaseContext, type UseCaseResult } from "../execution/pipeline.js";

/**
 * Runs entirely against a cloned OperationalSnapshot. The authoritative
 * OperationalWorld held by the repository is never written to here.
 */
export async function runWhatIfSimulation(
  rawInput: unknown,
  ctx: UseCaseContext,
  caller: CallerContext,
  simulation: WhatIfSimulationPort,
): Promise<UseCaseResult<WhatIfSimulationResult>> {
  return runPipeline<RunWhatIfSimulationInput, WhatIfSimulationResult>({
    schema: RunWhatIfSimulationInputSchema,
    rawInput,
    ctx,
    caller,
    handler: async (input, context) => {
      const scenarioId = asScenarioId(input.scenarioId);
      const world = await context.scenarioRepository.getWorld(scenarioId);
      const snapshot = createOperationalSnapshot(world, context.clock.now());
      const existingPlans = await context.scenarioRepository.listPlans(scenarioId);

      const result = simulation.runWhatIf(snapshot, existingPlans, input.mutations);

      return { data: result, action: "RunWhatIfSimulation", subjectId: input.scenarioId };
    },
  });
}
