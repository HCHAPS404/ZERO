import type { DomainEvent, ScenarioId } from "@zero/domain";

export interface EventRepository {
  append(scenarioId: ScenarioId, event: DomainEvent): Promise<void>;
  list(scenarioId: ScenarioId): Promise<readonly DomainEvent[]>;
}
