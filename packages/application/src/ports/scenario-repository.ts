import type {
  OperationalWorld,
  ResponsePlan,
  ResponsePlanId,
  Operation,
  OperationId,
  ScenarioId,
} from "@zero/domain";

/**
 * ScenarioRepository owns the authoritative persisted state of a scenario:
 * the OperationalWorld, its ResponsePlans and its Operations. Application
 * use cases depend only on this port -- never on a concrete storage
 * technology.
 */
export interface ScenarioRepository {
  getWorld(scenarioId: ScenarioId): Promise<OperationalWorld>;
  saveWorld(world: OperationalWorld): Promise<void>;

  listPlans(scenarioId: ScenarioId): Promise<readonly ResponsePlan[]>;
  getPlan(
    scenarioId: ScenarioId,
    planId: ResponsePlanId,
  ): Promise<ResponsePlan | undefined>;
  savePlan(plan: ResponsePlan): Promise<void>;

  listOperations(scenarioId: ScenarioId): Promise<readonly Operation[]>;
  getOperation(
    scenarioId: ScenarioId,
    operationId: OperationId,
  ): Promise<Operation | undefined>;
  saveOperation(operation: Operation): Promise<void>;
}
