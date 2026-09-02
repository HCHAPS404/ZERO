import { asResponsePlanId, asScenarioId, EntityNotFoundError, type ResponsePlan } from "@zero/domain";
import { CompareResponsePlansInputSchema, type CompareResponsePlansInput } from "@zero/contracts";
import { runPipeline, type CallerContext, type UseCaseContext, type UseCaseResult } from "../execution/pipeline.js";

export interface PlanComparison {
  readonly plans: readonly ResponsePlan[];
  readonly recommendedPlanId: string | undefined;
}

export async function compareResponsePlans(
  rawInput: unknown,
  ctx: UseCaseContext,
  caller: CallerContext,
): Promise<UseCaseResult<PlanComparison>> {
  return runPipeline<CompareResponsePlansInput, PlanComparison>({
    schema: CompareResponsePlansInputSchema,
    rawInput,
    ctx,
    caller,
    handler: async (input, context) => {
      const scenarioId = asScenarioId(input.scenarioId);
      const plans: ResponsePlan[] = [];
      for (const rawId of input.planIds) {
        const plan = await context.scenarioRepository.getPlan(scenarioId, asResponsePlanId(rawId));
        if (!plan) {
          throw new EntityNotFoundError("ResponsePlan", rawId);
        }
        plans.push(plan);
      }
      const recommended = plans.reduce<ResponsePlan | undefined>(
        (best, plan) => (!best || plan.score > best.score ? plan : best),
        undefined,
      );
      return {
        data: { plans, recommendedPlanId: recommended?.id },
        action: "CompareResponsePlans",
        subjectId: input.planIds.join(","),
      };
    },
  });
}
