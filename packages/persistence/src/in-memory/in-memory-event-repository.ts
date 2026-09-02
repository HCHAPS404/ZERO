import type { EventRepository } from "@zero/application";
import type { DomainEvent, ScenarioId } from "@zero/domain";

export class InMemoryEventRepository implements EventRepository {
  private events = new Map<string, DomainEvent[]>();

  async append(scenarioId: ScenarioId, event: DomainEvent): Promise<void> {
    const list = this.events.get(scenarioId) ?? [];
    list.push(event);
    this.events.set(scenarioId, list);
  }

  async list(scenarioId: ScenarioId): Promise<readonly DomainEvent[]> {
    return this.events.get(scenarioId) ?? [];
  }
}
