import { asScenarioId, createOperationalSnapshot, type OperationalSnapshot } from "@zero/domain";
import { GetOperationalPictureInputSchema, type GetOperationalPictureInput } from "@zero/contracts";
import { runPipeline, type CallerContext, type UseCaseContext, type UseCaseResult } from "../execution/pipeline.js";

export interface OperationalPicture {
  readonly snapshot: OperationalSnapshot;
  readonly incidentCount: number;
  readonly activeIncidentCount: number;
  readonly resourceCount: number;
  readonly availableResourceCount: number;
  readonly blockedRoadCount: number;
  readonly degradedRoadCount: number;
  readonly hazardCount: number;
  readonly unresolvedSignalCount: number;
}

export async function getOperationalPicture(
  rawInput: unknown,
  ctx: UseCaseContext,
  caller: CallerContext,
): Promise<UseCaseResult<OperationalPicture>> {
  return runPipeline<GetOperationalPictureInput, OperationalPicture>({
    schema: GetOperationalPictureInputSchema,
    rawInput,
    ctx,
    caller,
    handler: async (input, context) => {
      const world = await context.scenarioRepository.getWorld(asScenarioId(input.scenarioId));
      const snapshot = createOperationalSnapshot(world, context.clock.now());
      const roadSegments = [...snapshot.roadSegments.values()];
      const data: OperationalPicture = {
        snapshot,
        incidentCount: snapshot.incidents.size,
        activeIncidentCount: [...snapshot.incidents.values()].filter((i) => i.status === "ACTIVE").length,
        resourceCount: snapshot.resources.size,
        availableResourceCount: [...snapshot.resources.values()].filter((r) => r.status === "AVAILABLE").length,
        blockedRoadCount: roadSegments.filter((r) => r.status === "BLOCKED").length,
        degradedRoadCount: roadSegments.filter((r) => r.status === "DEGRADED").length,
        hazardCount: snapshot.hazards.size,
        unresolvedSignalCount: [...snapshot.signals.values()].filter(
          (s) => s.status !== "ACCEPTED" && s.status !== "REJECTED",
        ).length,
      };
      return { data, action: "GetOperationalPicture", subjectId: input.scenarioId };
    },
  });
}
