import type { AuditRepository } from "@zero/application";
import type { AuditEntry, ScenarioId } from "@zero/domain";

export class InMemoryAuditRepository implements AuditRepository {
  private entries = new Map<string, AuditEntry[]>();

  async append(scenarioId: ScenarioId, entry: AuditEntry): Promise<void> {
    const list = this.entries.get(scenarioId) ?? [];
    list.push(entry);
    this.entries.set(scenarioId, list);
  }

  async list(scenarioId: ScenarioId): Promise<readonly AuditEntry[]> {
    return this.entries.get(scenarioId) ?? [];
  }
}
