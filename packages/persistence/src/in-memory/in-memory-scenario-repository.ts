import type { ScenarioRepository } from "@zero/application";
import type {
  OperationalWorld,
  ResponsePlan,
  ResponsePlanId,
  Operation,
  OperationId,
  ScenarioId,
} from "@zero/domain";

export class InMemoryScenarioRepository implements ScenarioRepository {
  private worlds = new Map<string, OperationalWorld>();
  private plans = new Map<string, Map<string, ResponsePlan>>();
  /**
   * The domain Operation entity does not itself carry a scenarioId, so this
   * in-memory adapter keys operations globally by operationId (IDs are
   * unique across the whole in-memory store, which is sufficient for a
   * single-process demo backbone).
   */
  private operations = new Map<string, Operation>();

  seedWorld(world: OperationalWorld): void {
    this.worlds.set(world.scenarioId, world);
  }

  async getWorld(scenarioId: ScenarioId): Promise<OperationalWorld> {
    const world = this.worlds.get(scenarioId);
    if (!world) {
      throw new Error(`No world seeded for scenario ${scenarioId}`);
    }
    return world;
  }

  async saveWorld(world: OperationalWorld): Promise<void> {
    this.worlds.set(world.scenarioId, world);
  }

  async listPlans(scenarioId: ScenarioId): Promise<readonly ResponsePlan[]> {
    return [...(this.plans.get(scenarioId)?.values() ?? [])];
  }

  async getPlan(scenarioId: ScenarioId, planId: ResponsePlanId): Promise<ResponsePlan | undefined> {
    return this.plans.get(scenarioId)?.get(planId);
  }

  async savePlan(plan: ResponsePlan): Promise<void> {
    const scenarioPlans = this.plans.get(plan.scenarioId) ?? new Map<string, ResponsePlan>();
    scenarioPlans.set(plan.id, plan);
    this.plans.set(plan.scenarioId, scenarioPlans);
  }

  async listOperations(scenarioId: ScenarioId): Promise<readonly Operation[]> {
    const plans = await this.listPlans(scenarioId);
    const planIds = new Set(plans.map((plan) => plan.id));
    return [...this.operations.values()].filter((operation) => planIds.has(operation.responsePlanId));
  }

  async getOperation(_scenarioId: ScenarioId, operationId: OperationId): Promise<Operation | undefined> {
    return this.operations.get(operationId);
  }

  async saveOperation(operation: Operation): Promise<void> {
    this.operations.set(operation.id, operation);
  }
}
